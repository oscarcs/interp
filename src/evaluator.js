// evaluator
// oscar c. s.

'use strict';

let Scope = require('./scope');

// this is the evaluator.
// this is a simple implementation that executes the generated AST.
// we can call into 'native' functions and variables.

module.exports = class Evaluator {
  
  constructor(parser) {
    this.parser = parser;
    //this.ast = this.parser.parse();

    this.operators = {
      'PLUS': (a, b) => a + b,
      'MINUS': function(a, b) {
        if (typeof b === undefined) return -a;
        return a - b;
      },
      'MULTIPLY':   (a, b) => a * b,
      'DIVIDE':     (a, b) => a / b,
      'MODULO':     (a, b) => a % b,
      'EXPONENT':   (a, b) => a ^ b,
      
      'OR':   (a, b) => a || b,
      'AND':  (a, b) => a && b,
      'NOT':  (a) => !a,
       
      'EQUALITY':     (a, b) => a == b,
      'INEQUALITY':   (a, b) => a != b,
      'LESS_THAN':    (a, b) => a < b,
      'GREATER_THAN': (a, b) => a > b,
      'NOT_GREATER_THAN': (a, b) => a <= b,
      'NOT_LESS_THAN':    (a, b) => a >= b,
      'INCREMENT':    (a) => ++a,
      'DECREMENT':    (a) => --a,
    };
    
    this.globals = {
      pi: Math.PI
    };
    
    this.scope = new Scope(this, false);
  }
  
  newScope() {
    let s = this.scope;
    this.scope = new Scope(this, false);
    this.scope.def = {}; // clear definitions.
    this.scope.parent = s;
    return this.scope;
  }
  
  evaluate(ast) {
    this.parseNode(ast);
  }
  
  // we recursively perform operations on AST nodes
  // in order to evaluate the AST tree.
  
  parseNode(node) {
    if (typeof(node) === 'undefined') {
      // @todo: better error message.
      throw Error('Undefined node.');
    }
    
    let that = this;
    
    if (node.type === 'LITERAL') {
      return node.value;
    }
    
    
    else if (node.type === 'IDENTIFIER') {
      // check the current args first.
      let v = this.scope.find(node.value) 
           || this.globals[node.value]; 
      
      if (v) {
        return typeof(v.value) !== 'undefined' ? v.value : v;
      }
      else {
        // if there's no variable associated with this
        // identifier, we return the identifier name.
        // @todo: make this safer.
        return node.value;
      }
    }
    
    // define the name of an extern.
    // @todo: add advanced extern support by including
    //        the name & type of extern function.
    
    else if (node.type === 'EXTERN') {
      if (!this.globals[node.value]) {
        throw Error('The extern "' + node.value + '" has not been defined.');
      }
    }
    
    else if (node.type === 'SCOPE') {
      this.newScope();
      
      if (node.value === 'BLOCK') {
        let returnVal = null;
        if (node.children) {
          let cur;
          //console.log(node.children);
          for (let i in node.children) {
            cur = this.parseNode(node.children[i]);
            if (cur && cur.stop) {
              if (cur.value) {
                returnVal = cur.value;
              }
            }
          }
        }
        return returnVal;
      }
      else {
        if (node.children) {
          for (let i in node.children) {
            this.parseNode(node.children[i]);
          }
        }
      }
      this.scope.pop();
    }
    
    
    else if (node.type === 'UNARY') {
      if (this.operators[node.value]) {
        return this.operators[node.value](this.parseNode(node.children[0]));
      }
    }
    
    
    else if (node.type === 'BINARY') {
      return this.parseBinary(node);
    }
    
    
    else if (node.type === 'FUNCTION') {
      let scope = node.children[0].scope;
      
      let curArgs = [];
      // @todo: rename parser output obj to 'args'?
      for (let i in node.children[0]) { 
        curArgs.push(node.children[0][i].value);
      }
      
      let body = node.children[1];
          
      let id = {
        name: node.name,
        value: body,
        reserved: false,
        args: curArgs, 
      };
      
      this.scope.define(id);
      //console.log(this.variables);
    }
    
    
    else if (node.type === 'STATEMENT') {
      return this.parseStatement(node);
    }
    
    
    else {
      throw Error('Unsupported node type: ' + node.type);
    }
  }
  
  // add a function to the variables list.
  // this allows us to call external functions.
  // @todo: check that the extern added doesn't
  //        conflict with a variable to be added
  //        by the parser, or vice versa.
  
  addExtern(name, func) {
    this.globals[name] = func;
  }
  
  parseBinary(node) {
    // check for different types of assignment.
    if (node.value === 'EQUALS'
     || node.value === 'INCREMENT_ASSIGN'
     || node.value === 'DECREMENT_ASSIGN') {
      let scope = node.children[0].scope;
      let ident = node.children[0].value;
      let value = this.parseNode(node.children[1]);
      let cur = this.parseNode(node.children[0]);
      
      //console.log(' ' + value);
      
      // check the scope variable and store the
      // value in the variable table if it is acceptable.
      
      let v = scope.def[ident];
      
      if (v) {
        if (!v.reserved) {
          if (cur) {
            if (node.value === 'INCREMENT_ASSIGN') value = cur + value;
            if (node.value === 'DECREMENT_ASSIGN') value = cur - value;
          }
          let id = {
            name: ident,
            reserved: false,
            value: value,
          }
          this.scope.define(id);
        }
        else {
          throw Error('Identifier "' + ident + '" is reserved.');
        }
      }
      else {
        throw Error('Identifier "' + ident + '" is not defined in scope.');
      }
      
      return value;
    }
    
    // call a function.
    
    else if (node.value === 'CALL') {
      
      let name = node.children[0].value;
      let ident = this.scope.find(name) || this.globals[name];
      // let scope = node.scope;
      // console.log(scope);
      
      let argNames = ident.args;
      let argValues = node.children[1];
      
      for (let i in argValues) {
        argValues[i] = this.parseNode(argValues[i]);
      }

      if (typeof(ident) === 'function') {
        return ident.apply(null, argValues);
      }

      // @todo: refactor this so we can call a single
      //        'defineIdentifier' function.
      for (let i in argNames) {
        //console.log(argNames[i]);        
        let id = {
          name: argNames[i],
          reserved: false,
          value: argValues[i],
        }
        this.scope.define(id);
      }

      return this.parseNode(ident.value);
    }
    
    
    else if (this.operators[node.value]) {
      
      // handle mathematical operators.
      return this.operators[node.value](this.parseNode(node.children[0]), this.parseNode(node.children[1]));
    }
    
    
    else {
      throw Error('Unsupported binary operation: ' + node.type);
    }
  }
  
  parseStatement(node) {    
    // deal with function or loop-breaking statements.
    // the return value ('returnVal') of these nodes is 
    // used to break the loop or function
    
    if (node.value === 'RETURN') {
      let returnVal = {
        stop: true,
        value: this.parseNode(node.children[0]),
      };
      return returnVal;
    }
    else if (node.value === 'BREAK') {
      let returnVal = {
        stop: true,
        value: null,
      };
    }
    
    // implementation of the if statement.
    
    else if (node.value === 'IF') {
      let cond = this.parseNode(node.children[0]);
      
      // choose the right code branch to execute.
      let branch;
      if (cond) {
        if (node.children[1]) branch = node.children[1];
      }
      else {
        if (node.children[2]) branch = node.children[2];
      }
      
      // parse and execute the code branch itself.
      if (branch instanceof Array) {
        for (let i in branch) {
          if (branch[i]) this.parseNode(branch[i]);
        }
      }
      else {
        if (branch) this.parseNode(branch);
      }
    }
  }
}