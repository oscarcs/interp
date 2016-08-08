// toy interpreter
// oscar c. s.
// the goal is to implement a simple interpreter
// as a learning exercise.

'use strict'; // required for new ES6 features to work.

let Loader = require('./loader');
let Lexer = require('./lexer');
let Parser = require('./parser');
let Evaluator = require('./evaluator');


const p = 'test';
const program = Loader.load('./test/' + p + '.program');

let lexer = new Lexer(program);
let tokens = lexer.tokenize();
console.log(tokens);

let parser = new Parser(tokens);
let tree = parser.parse();
let string;
try {
  string = JSON.stringify(tree, 
    ['key', 'name', 'message', 'value', 'type',
     'children', 'newscope'], 4);
} catch (e) {
  string = JSON.stringify(e, 
    ['name', 'message', 'from', 'to', 'key', 'value',
     'type', 'children', 'newscope'], 4);
}

console.log('\n');
console.log(string);

let evaluator = new Evaluator(parser);
evaluator.addExtern('print', console.log); 
evaluator.addExtern('test', console.log); 
evaluator.evaluate(tree);