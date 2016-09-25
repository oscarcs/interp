# interp
A small lexer, parser, and interpreter for an invented programming language, 
written in Node-flavoured ES6. A stack-based bytecode interpreter written in C 
is in progress.

## Why?
Written as a learning exercise, to investigate top-down operator precedence 
parsers, programming language design, and as an introduction to parser, 
interpreter, and compiler development generally.

Based on the [great tutorial][1] by Douglas Crockford, as well as [other][2] 
[articles][3].

## Language Syntax
As this is a hobby project, I haven't written a specification, though it 
broadly follows JavaScript syntax. The 'test' folder contains sample code in 
the language which (hopefully) functions correctly. Note however that the 
tests aren't exhaustive and there are almost certainly bugs and unimplemented 
features.

## Overview
There are three major components: the lexer (tokenizes source), the parser 
(generates an abstract syntax tree), and the interpreter (executes the AST).

* The lexer is a simple handwritten lexer that creates tokens to be consumed by 
the parser.

* Top-down operator precedence parsing is used in this project. Explanations of 
this technique are widely available on the internet.

* The evaluator takes an AST comprised of `ast_node`s and executes it. You can 
define externs using the `extern` keyword that will call into JavaScript 
functions.

* `scope.js` is a reusuable container object that functions as a stack which can
be pushed and popped to keep track of the variables currently in scope.

* `loader.js` is a simple wrapper around Node's synchronous file loading. This 
could be replaced with XHR for a browser implementation.

* `tests.js` is a tiny test runner I wrote to avoid dependencies.

## Running the code
From the enclosing folder, run
```
node /src/interpreter.js
```
This will run the tests. To run an individual program, modify `runTests` in 
`interpreter.js` and change the file path.

To use the C-based stack interpreter, compile:
```
gcc src/interp.c -o interp
```
and run one of the tests:
```
src/interp test/asm/cond.interp
```
(Tested only on Linux.)

## Next steps
The code doesn't really follow best practise, as it is indtended as a learning 
exercise. However, it is MIT-licensed, so you may use parts of it in your own
projects, or use it as a reference for this type of learning project. See 
LICENCE.txt.

I may extend this project in the future to incorporate a type system or 
something, but I have already come close to the limit of unmaintainability
with the code as it is in JavaScript, and so it is likely this would require 
major rewrite -- JavaScript's prototypes are extensively used here as in 
Crockford's original article.

I also welcome suggestions and PRs.

[1]: http://javascript.crockford.com/tdop/tdop.html
[2]: http://www.codeproject.com/Articles/345888/How-to-write-a-simple-interpreter-in-JavaScript 
[3]: http://eli.thegreenplace.net/2013/07/16/hand-written-lexer-in-javascript-compared-to-the-regex-based-ones