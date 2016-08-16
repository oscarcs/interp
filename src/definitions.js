// contains definitions for program constructs.

'use strict';

module.exports = class Definitions {
  
  constructor() {
    
  }
  
  static addDefinitions(parser) {
    
    this.addSymbols(parser);
    this.addInfixes(parser);
    this.addPrefixes(parser);
    this.addAssignments(parser);
    this.addConstants(parser);
    this.addStatements(parser);
  }
  
  static addSymbols(parser) {
    
    parser.symbol('COLON');
    parser.symbol('SEMI');
    parser.symbol('COMMA');
    parser.symbol('R_PAREN');
    parser.symbol('R_BRACE');
    parser.symbol('R_BRACKET');
    parser.symbol('ELSE');
    parser.symbol('END');
    parser.symbol('IDENTIFIER');
    
    parser.symbol('LITERAL').nud = function() {
      return this;
    };
  }
  
  static addInfixes(parser) {
    
    parser.infix('PLUS', 50);
    parser.infix('MINUS', 50);
    parser.infix('MULTIPLY', 60);
    parser.infix('DIVIDE', 60);
    
    parser.infix('EQUALITY', 40);
    parser.infix('INEQUALITY', 40);
    parser.infix('LESS_THAN', 40);
    parser.infix('GREATER_THAN', 40);
    parser.infix('NOT_GREATER_THAN', 40);
    parser.infix('NOT_LESS_THAN', 40);
    
    // ternary dot operator. ( expr ? statement : statement; )
    parser.infix('QUESTION', 20, function(left) {
      this.children = [];
      this.children[0] = left;
      this.children[1] = parser.expression(0);
      parser.advance('COLON', 'Ternary expressions should be colon-separated.');
      this.children[2] = parser.expression(0);
      this.type = 'TERNARY';
      return this;
    });
    
    // the dot operator selects a member of an object.
    parser.infix('PERIOD', 80, function(left) {
      this.children = [];
      this.children[0] = left;
      if (parser.token.type !== 'IDENTIFIER') {
        throw Error('Expected a property name');
      }
      parser.token.type = 'LITERAL';
      this.children[1] = parser.token;
      this.type = 'BINARY';
      return this;
    });
    
    // && and || operators.
    // these are right-associative.
    parser.infix_right('AND', 30);
    parser.infix_right('OR', 30);
    
    // function invokation - an infix operator
    // that takes an identifier on the left and
    // a list of arguments on the right.
    
    parser.infix('L_PAREN', 80, function (left) {
      let a = [];

      /*
      if (left.id === 'PERIOD' || left.id === 'L_BRACKET') {
        this.type = 'TERNARY';
        this.children[0] = left.children[0];
        this.children[1] = left.children[1];
        this.children[2] = a;
      }
      else { */
      
      this.type = 'BINARY';
      this.children = [];
      this.children[0] = left;
      this.children[1] = a;

      if ((left.type !== 'UNARY' || left.id !== 'FUNCTION') &&
        left.type !== 'IDENTIFIER' && left.id !== 'L_PAREN' &&
        left.id !== 'AND' && left.id !== 'OR' && left.id !== 'QUESTION') {
        
        // @todo: better error message.
        throw Error('Expected a variable name.');
      }
      //}
      
      // parse each argument.
      
      if (parser.token.id !== 'R_PAREN') {
        while (true) {
          a.push(parser.expression(0));
          if (parser.token.id !== 'COMMA') {
            break;
          }
          parser.advance('COMMA', 'Function arguments should be comma-separated.');
        }
      }
      parser.advance('R_PAREN');
      
      this.value = 'CALL';
      return this;
    });
  }
  
  static addPrefixes(parser) {
    
    //this.prefix('INCREMENT');
    //this.prefix('DECREMENT');
    parser.prefix('MINUS');
    parser.prefix('NOT');
    
    // the nud of ( will call advance(")") 
    // to match a balancing ) token.
    parser.prefix('L_PAREN', function() {
      let e = parser.expression(0);
      parser.advance('R_PAREN');
      return e;
    });
  }
  
  static addAssignments(parser) {
    
    parser.assignment('EQUALS');
    parser.assignment('INCREMENT_ASSIGN');
    parser.assignment('DECREMENT_ASSIGN');
  }
  
  static addConstants(parser) {
    
    // @todo: move true and false into lexer?
    parser.constant('true', true);
    parser.constant('false', false);
    parser.constant('null', null);
    parser.constant('pi', Math.PI);
  }
  
  static addStatements(parser) {
    
    parser.statement_symbol('L_BRACE', function() {
      parser.newScope();
      let a = parser.statements();
      parser.advance('R_BRACE', 'Block should end in a "}"');
      parser.scope.pop();
      
      this.value = 'BLOCK';
      this.type = 'SCOPE';
      this.children = a;
      
      return this;
    });
    
    // @todo: fix and test this mess
    parser.statement_symbol('VAR', function() {
      let t;
      let ident;
      let a = [];
      
      while (true) {
        ident = parser.token;
        
        if (ident.type !== 'IDENTIFIER') {
          throw Error('Can only assign to an identifier.');
        }
        
        parser.scope.define(ident);
        parser.advance();
        
        if (parser.token.id === 'EQUALS') {
          t = parser.token;
          parser.advance('EQUALS');
          t.children = [];
          t.children[0] = ident;
          t.children[1] = parser.expression(0);
          t.type = 'BINARY';
          a.push(t);
        }
        
        // variable definitions can be comma-separated:
        // @todo: remove this capability.
        
        if (parser.token.id !== 'COMMA') {
          break;
        }
        parser.advance('COMMA');
      }
      parser.advance('SEMI', 'Missing semicolon after assignment.');
      
      return a.length === 0 ? null : (a.length === 1 ? a[0] : a);
    });
    
    parser.statement_symbol('WHILE', function() {
      this.children = [];

      parser.advance('L_PAREN');
      this.children[0] = parser.expression(0);
      parser.advance('R_PAREN');
      this.children[1] = parser.block();
      this.type = 'STATEMENT';
      return this;
    });
    
    parser.statement_symbol('IF', function() {
      this.children = [];

      parser.advance('L_PAREN');
      // parse the condition.
      this.children[0] = parser.expression(0);
      parser.advance('R_PAREN');
      this.children[1] = parser.block();
      
      if (parser.token.id === 'ELSE') {
        parser.scope.reserve(parser.token);
        parser.advance('ELSE');

        // handle 'else if' case if necessary.
        this.children[2] = parser.token.id === 'IF' ? parser.statement() : parser.block();
      }

      this.type = 'STATEMENT';
      return this;
    });
    
    parser.statement_symbol('BREAK', function() {
      parser.advance('SEMI', 'Break statement should be followed by a semicolon.');
      if (parser.token.id !== 'R_BRACE') {
        // @todo: make this into a warning.
        throw Error('Unreachable code after break statement.');
      }
      this.type = 'STATEMENT';
      return this;
    });
    
    parser.statement_symbol('RETURN', function() {
      this.children = [];

      if (parser.token.id !== 'SEMI') {
        this.children[0] = parser.expression(0);
      }
      parser.advance('SEMI', 'Return statement should be followed by a semicolon.');
      if (parser.token.id !== 'R_BRACE') {
        // @todo: make this into a warning.
        throw Error('Unreachable code after return statement.');
      }
      this.type = 'STATEMENT';
      return this;
    });
    
    // function definition.
    
    parser.statement_symbol('FUNCTION', function() {
      this.children = [];

      // find the name of the function
      if (parser.token.id === 'IDENTIFIER') {
        parser.scope.define(parser.token);
        this.name = parser.token.value;
      }
      parser.advance('IDENTIFIER');
      
      // create a new scope for arguments etc.
      parser.newScope();
      
      // parse the arguments
      let a = [];
      parser.advance('L_PAREN');
      if (parser.token.id !== 'R_PAREN') {
        while (true) {
          if (parser.token.type !== 'IDENTIFIER') {
            throw Error('Expected a parameter name.');
          }
          parser.scope.define(parser.token);
          
          a.push(parser.token);
          parser.advance();
          if (parser.token.id !== 'COMMA') {
            break;
          }
          parser.advance('COMMA');
        }
      }
      
      this.children[0] = a;
      parser.advance('R_PAREN');
      this.children[1] = parser.block();
      
      parser.scope.pop(); // leave the function scope.
      this.value = 'FUNCTION';
      this.type = 'FUNCTION';
      return this;
    });
    
    // define a function call as an extern so that it can
    // be used without being defined within the program.
    // Allows function implementation to be left up to
    // the backend.
    // @todo: do this in a way that isn't just a side-effect
    //        that doesn't leave a potentially useless token.
    
    parser.statement_symbol('EXTERN', function() {
      if (parser.token.type === 'IDENTIFIER') {
        parser.scope.define(parser.token);
        this.value = parser.token.value;
      }
      else {
        throw Error('The name of an extern should be an identifier.')
      }
      parser.advance('IDENTIFIER');
      parser.advance('SEMI');
      
      this.type = 'EXTERN';
      return this;
    });
  }
}