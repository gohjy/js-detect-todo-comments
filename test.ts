import { detectTodoFromFileContent as dtc } from "./main.ts";
import * as assert from "jsr:@std/assert@1";

/* 
IMPORTANT NOTE: Do NOT run this file with `deno test`!
The dependencies `npm:debug@4.4.3` and
`npm:fast-glob@3.3.3` require access to all
env vars and cpu count respectively. Use `deno task
test` instead to run with permissions pre-enabled.
*/

/* 
These tests don't test for parsing behaviour, i.e.
whether a given piece of code has its comment(s) 
parsed correctly, as this is a task for the 
typescript-estree parser. 

Instead, these tests only check if TODO: comments 
are accurately detected.
*/

Deno.test.beforeAll(() => {
    // "warm up" the code and parser
    dtc("// hello world");
    dtc("// TODO: Do stuff!");
    dtc("console.log(null);");
});

Deno.test("// comment", () => assert.assertEquals(
    dtc("// TODO: Do something!"),
    [{ 
        text: "TODO: Do something!",
        loc: {
            col: 1,
            line: 1
        }
    }]
));

Deno.test("// comment with no todo", () => assert.assertEquals(
    dtc("// Do something!"),
    []
));

Deno.test("/* */ comment (single line)", () => assert.assertEquals(
    dtc("/* TODO: Do something else. */"),
    [{
        text: "TODO: Do something else.",
        loc: {
            line: 1,
            col: 1
        }
    }]
));

Deno.test("/* */ comment (single line) with no todo", () => assert.assertEquals(
    dtc("/* Do something else. */"),
    []
));

const multiLineCommentWithTodo = `
/* 
 Sample text

 TODO: Lorem ipsum

 More sample text*/
`;
Deno.test("multiline comment", () => assert.assertEquals(
    dtc(multiLineCommentWithTodo),
    [{
        text: "TODO: Lorem ipsum",
        loc: {
            line: 5,
            col: 1
        }
    }]
));

const multiLineCommentWithoutTodo = `
/*
 Better sample text required
 */`;
Deno.test("multiline comment without todo", () => assert.assertEquals(
    dtc(multiLineCommentWithoutTodo),
    []
));

Deno.test("single-line jsDoc comment (@todo style)", () => assert.assertEquals(
    dtc("/** @todo Write proper tests */"),
    [{
        text: "@todo Write proper tests",
        loc: {
            line: 1,
            col: 1
        }
    }]
));

Deno.test("single-line jsDoc comment (TODO style)", () => assert.assertEquals(
    dtc("/** TODO: Write actual tests */"),
    [{
        text: "TODO: Write actual tests",
        loc: {
            line: 1,
            col: 1
        }
    }]
));

const multiLineJsDocCommentWithAtTodoTag = `
/** 
 * This is a jsDoc comment with some words
 * describing something or other.
 * 
 * @todo Add support for X.
 */
`;
Deno.test("multi-line jsDoc comment (@todo style)", () => assert.assertEquals(
    dtc(multiLineJsDocCommentWithAtTodoTag),
    [{
        text: "@todo Add support for X.",
        loc: {
            line: 6,
            col: 1
        }
    }]
));

const multiLineJsDocCommentWithTodoDirective = `
/**
 * Another jsDoc comment. Something is meant to 
 * happen below, we just aren't sure what.
 * 
 * TODO: Find out what happens
 */
`;
Deno.test("multi-line jsDoc comment (TODO style)", () => assert.assertEquals(
    dtc(multiLineJsDocCommentWithTodoDirective),
    [{
        text: "TODO: Find out what happens",
        loc: {
            line: 6,
            col: 1
        }
    }]
));

const sampleFileText = await Deno.readTextFile(new URL("./testSampleCode.ts", import.meta.url));
Deno.test("analyse sample file text", () => assert.assertEquals(
    dtc(sampleFileText),
    [
        {
            "text": "@todo I don't know, what *is* there to do?",
            "loc": {
                "col": 1,
                "line": 5
            }
        },
        {
            "text": "TODO: Do something here",
            "loc": {
                "col": 1,
                "line": 11
            }
        },
        {
            "text": "TODO: Print message when strings are passed",
            "loc": {
                "col": 5,
                "line": 13
            }
        },
        {
            "text": "@todo add favourite colour field",
            "loc": {
                "col": 1,
                "line": 22
            }
        },
        {
            "text": "TODO: ensure this IS triggered",
            "loc": {
                "col": 1,
                "line": 35
            }
        }
    ]
));
