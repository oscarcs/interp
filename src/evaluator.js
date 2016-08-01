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
    
    // the args array is used during a CALL
    // to contain the 
    
    this.args = [];
  }
  
  newScope() {
    let s = this.scope;
    this.scope = new Scope(this, false);
    this.scope.def = {}; // clear definitions.
    this.scope.parent = s;
    return this.scope;
  }
  
  evaluate(ast) {
    let output = '';
    for (let i in ast) {
      let value = ast[i];
      if (value instanceof Array) {
        this.newScope();
        
        for (let j in value) {
          this.parseNode(value[j]);
        }
        this.scope.pop();
      }
      else {
        this.parseNode(value);
      }
      //if (typeof value !== 'undefined') output += value + '\n';
    }
    
    //console.log(this.globals);
    //console.log(this.scope.def);
    
    return output;
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
      let v = this.args[node.value] 
          || this.scope.find(node.value) 
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
    else if (node.type === 'UNARY') {
      if (this.operators[node.value]) {
        return this.operators[node.value](this.parseNode(node.children[0]));
      }
    }
    else if (node.type === 'BINARY') {
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
        let ident = node.children[0].value;
        
        let f = this.globals[ident] || this.scope.find(ident);
        if (!f) throw Error('Function definition not found');
        
        let argValues = node.children[1];
        let scope = node.children[0].scope;
        
        let args = []
        for (let i in argValues) {
          let val = this.parseNode(argValues[i]);
          //console.log(val);
          args.push(val);
        }
        let id = {
          name: 'args',
          value: args,
          reserved: false,
        };
        this.scope.define(id);

        // check if we're calling a JS function, 
        // otherwise interpret the function 'normally'.
        
        if (typeof(f) === 'function') {
          f.apply(null, this.scope.find('args').value);
        }
        else if (f.value) {
          
          if (!(f.value instanceof Array)) {
            f.value = [f.value];
          }
          //console.log(f.value);
          
          let i = 0;
          let returnVal = null;
          
          // continue executing statements until we reach
          // a breaking statement. Also process the returned
          // value of this function call.
          
          while (i < f.value.length) {
            //console.log(f.value[i]);
            let cur = this.parseNode(f.value[i]);
            if (cur.value) {
              returnVal = cur.value;
            }
            if (cur.stop) {
              break;
            }
            i++;
          }
          return returnVal;
        }
        
        this.args = [];
      }
      else if (this.operators[node.value]) {
        
        // handle mathematical operators.
        return this.operators[node.value](this.parseNode(node.children[0]), this.parseNode(node.children[1]));
      }
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
}