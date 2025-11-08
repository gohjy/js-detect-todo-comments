# `js-detect-todo-comments`

Parse `TODO` comments in JavaScript and TypeScript files using AST parsing. Based on [NoComment](https://github.com/markwylde/nocomment).

> [!IMPORTANT]
> 
> This package does **NOT** work in browsers! See the [note below](#browser-note) for more info.

## Features

- Detects all `TODO:` comments and `@todo` tags in jsDoc comments
- Returns line and column information along with comment text
- Uses [`typescript-estree`](https://typescript-eslint.io/packages/typescript-estree), the AST parser powering [ESLint](https://eslint.org/) in TypeScript files

## Usage

```javascript
import { detectTodoFromFileContent } from "js-detect-comments";

detectTodoFromFileContent("// TODO: improve usage examples");
// => [{ text: "TODO: improve usage examples", loc: { line: 1, col: 1 }}]
```

## Known Limitations

- `TODO` comments spanning more than one line only have their first line returned, example:
    ```js
    /**
     * @todo Do something
     * across 2 lines
     */

    /*
    TODO: Something else across
    more lines
    */

    // TODO: combine this into
    // one line
    ``` 
- Column information for multiline comments where the `TODO`/`@todo` line starts on a different column from the comment itself is incorrect, example:
    ```js
    /*
    Incorrect column information for below!
            TODO: Fix this bug.
            */
    ```
- <a id="browser-note"></a> Does not work in browsers because a dependency of `npm:@typescript-eslint/typescript-estree` requires `node:fs` to work.
