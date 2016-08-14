// test runner
'use strict';

let Loader = require('./loader');
let Lexer = require('./lexer');
let Parser = require('./parser');
let Evaluator = require('./evaluator');

module.exports = class Tests {
  constructor() {
    this.currentTest = '';
    this.currentOutput = '';
    this.numPassed = 0;
    this.tests = ['assignment', 'comment', 'boolean', 'while', 'if', 'scope', 'break', 'nested_break'];
  }

  run() {
    console.log('Running ' + this.tests.length + ' tests...');
    for (let i in this.tests) {
      this.runTest(this.tests[i]);
    }
    console.log(this.numPassed + ' of ' + this.tests.length + ' tests passed.');
  }

  runTest(name) {
    this.currentOutput = '';

    const program = Loader.load('./test/' + name + '.program');
    this.currentTest = name;

    let lexer = new Lexer(program);
    let tokens = lexer.tokenize();
    //console.log(tokens);

    let parser = new Parser(tokens);
    let tree = parser.parse();

    let evaluator = new Evaluator(parser);
    evaluator.addExtern('output', this.output.bind(this));
    evaluator.addExtern('assert', this.assert.bind(this));
    evaluator.evaluate(tree);
  }

  output(value) {
    this.currentOutput += value;
    //console.log(this.currentOutput);
  }

  assert(value, message) {
    if (message) console.log('"' + this.currentTest + '": ' + message);

    if (this.currentOutput === value) {
      console.log('Test "' + this.currentTest + '" passed.');
      this.numPassed += 1;
    }
    else {
      console.warn('Test "' + this.currentTest + '" failed.');
    }
  }
}
