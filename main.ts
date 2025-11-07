import parser from "@typescript-eslint/typescript-estree";

interface TodoComment {
  text: string;
  loc: {
    col: number;
    line: number;
  }
};

/**
 * Check if a given comment is jsDoc.
 * 
 * @private
 * 
 * @param value `comment.value`
 * @returns A boolean indicating if the comment is jsDoc.
 */
const isJsDoc = (value: string): boolean => {
  // all jsDoc comments start with an asterisk
  if (!value.startsWith("*")) return false;

  // we checked the first line, don't need it here
  const lines = value.split("\n").slice(1);
  if (lines.length === 0) return true;

  if (lines.length === 1) {
    // just check if that line is jsDoc
    // if it is, it will be a series of spaces
    // example comment:
    /** Some words here.
     */ // <- notice the spaces at the start of the line

    return !!lines[0].match(/^\s*$/);
  }

  const startPattern = lines[0].match(/^\s*\*/)?.[0];
  if (!startPattern) return false;

  return (
    // every line except the last one starts with
    // the same sequence of spaces + *
    lines.slice(1, -1).every(x => x.startsWith(startPattern)) 

    // the last line should only have spaces, not asterisk
    // (closing comment asterisk not included in value)
    && lines.at(-1)!.startsWith(startPattern.slice(0, -1))
  );
};

const getTodoFromMultiline = (
  comment: parser.TSESTree.Comment,
  startingPrefixes: Array<string>=["TODO: "]
): Array<TodoComment> => {
  const todoLines = comment.value.split("\n")
  .map((text, index): [number, string] => [index, text.trim()])
  .filter(([, text]) => startingPrefixes.some(x => text.startsWith(x)))
  .map(([index, text]) => ({
    text,
    loc: {
      col: comment.loc.start.column + 1,
      line: comment.loc.start.line + index
    }
  }));

  return todoLines;
};

export function detectTodoFromFileContent(fileContent: string) {
  const parseOptions = {
    comment: true,
    jsx: false,
    loc: true,
    tokens: true
  };

  const ast = parser.parse(fileContent, parseOptions);

  const result = detectTodoFromASTComments(
    ast.comments || []
  );

  return result;
};

export function detectTodoFromASTComments(comments: Array<parser.TSESTree.Comment>): Array<TodoComment> {
  if (comments.length === 0) {
    return [];
  }

  let todoComments: Array<TodoComment> = [];

  for (const comment of comments) {
    if (isJsDoc(comment.value)) {
      todoComments = todoComments.concat(getTodoFromMultiline(comment, ["@todo ", "TODO: "]));
      continue;
    }

    // not jsDoc

    // note: we CANNOT call trim() on comment.value
    // in the if condition since if the comment
    // starts/ends with a newline, it must be picked
    // up by multiline detection for the correct
    // line number - this is needed for e.g. git blaming
    // the code
    if (comment.value.indexOf("\n") === -1) {
      // single line comment
      const value = comment.value.trim();
      if (value.startsWith("TODO: ")) {
        todoComments.push({
          text: comment.value.trim(),
          loc: {
            col: comment.loc.start.column + 1,
            line: comment.loc.start.line
          }
        });
        continue;
      }
    }

    // multiline comment
    todoComments = todoComments.concat(getTodoFromMultiline(comment));
  }

  return todoComments;
}

console.log(JSON.stringify(detectTodoFromFileContent(`
  // TODO: DO something!

  /* hi1 */
  /* TODO: hi.5 */
  /*
   hi2

   w*/

   /* 
   hi2.5

   TODO: hi2.5 Embedded in here! 

   ww*/

   /* 
   TODO: hi2.7*/
  /**d
   * hi3
   * hi3.1
   * hi3.2
   * @todo hi3.25
   * TODO: hi3.27
   * hi3.3
   */
  `)


,null,2))