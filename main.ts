import parser from "@typescript-eslint/typescript-estree";

interface TodoComment {
  text: string;
  loc: {
    col: number;
    line: number;
  }
};

/**
 * Check if a given comment is jsDoc. If it is, return the comment
 * with the leading asterisks stripped; if it isn't,
 * return null.
 * 
 * @private
 * 
 * @param value `comment.value`
 * @returns string of comment's value with asterisks stripped, or null
 */
const getJsDoc = (value: string): null | string => {
  // all jsDoc comments start with an asterisk
  if (!value.startsWith("*")) return null;

  // we checked the first line, don't need it here
  const lines = value.split("\n").slice(1);
  if (lines.length === 0) return value.slice(1);

  if (lines.length === 1) {
    // just check if that line is jsDoc
    // if it is, it will be a series of spaces
    // example comment:
    /** Some words here.
     */ // <- notice the spaces at the start of the line

    if (lines[0].match(/^\s*$/)) return value.slice(1);
    else return null;
  }

  const startPattern = lines[0].match(/^\s*\*/)?.[0];
  if (!startPattern) return null;

  if (
    // every line except the last one starts with
    // the same sequence of spaces + *
    lines.slice(1, -1).every(x => x.startsWith(startPattern)) 

    // the last line should only have spaces, not asterisk
    // (closing comment asterisk not included in value)
    && lines.at(-1)! === startPattern.slice(0, -1)
  ) {
    const strippedValue = [
      value.split("\n")[0].slice(1),

      // remove startPattern from start of each line
      ...lines.slice(0, -1).map(x => x.slice(startPattern.length)),

      // the last line is blank
      ""
    ].join("\n");
    return strippedValue;
  }
  return null;
};

const getTodoFromMultiline = (
  comment: parser.TSESTree.Comment,
  startingPrefixes: Array<string | RegExp>=["TODO: "]
): Array<TodoComment> => {
  startingPrefixes = startingPrefixes.map(x =>
    (typeof x === "string")
    ? new RegExp(`^${RegExp.escape(x)}`)
    : x
  );
  const todoLines = comment.value.split("\n")
  .map((text, index): [number, string] => [index, text.trim()])
  .filter(([, text]) => startingPrefixes.some(x => text.match(x)))
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
    const jsDocValue = getJsDoc(comment.value);
    if (jsDocValue) {
      const strippedComment: parser.TSESTree.Comment = {
        ...comment,
        value: jsDocValue
      };

      todoComments = todoComments.concat(getTodoFromMultiline(strippedComment, [
        /^\s*\@todo\s/,
        /^\s*TODO\:\s/
      ]));
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
