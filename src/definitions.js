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
      this.first = left;
      this.second = parser.expression(0);
      parser.advanceToken('COLON');
      this.third = parser.expression(0);
      this.type = 'TERNARY';
      return this;
    });
    
    // the dot operator selects a member of an object.
    parser.infix('PERIOD', 80, function(left) {
      this.first = left;
      if (parser.token.type !== 'IDENTIFIER') {
        throw Error('Expected a property name');
      }
      parser.token.type = 'LITERAL';
      this.second = parser.token;
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
      if (left.id === 'PERIOD' || left.id === 'L_BRACKET') {
        this.type = 'TERNARY';
        this.first = left.first;
        this.second = left.second;
        this.third = a;
      }
      else {
        this.type = 'BINARY';
        this.first = left;
        this.second = a;
        if ((left.type !== 'UNARY' || left.id !== 'FUNCTION') &&
          left.type !== 'IDENTIFIER' && left.id !== 'L_PAREN' &&
          left.id !== 'AND' && left.id !== 'OR' && left.id !== 'QUESTION') {
          
          // @todo: better error message.
          throw Error('Expected a variable name.')
        }
      }
      
      // parse each argument.
      
      if (parser.token.id !== 'R_PAREN') {
        while (true) {
          a.push(parser.expression(0));
          if (parser.token.id !== 'COMMA') {
            break;
          }
          parser.advanceToken('COMMA');
        }
      }
      parser.advanceToken('R_PAREN');
      
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
      parser.advanceToken('R_PAREN');
      return e;
    });
  }
  
  static addAssignments(parser) {
    parser.assignment('EQUALS');
    parser.assignment('INCREMENT_ASSIGN');
    parser.assignment('DECREMENT_ASSIGN');
  }
  
  static addConstants(parser) {
    // @todo: move true and false into lexer.
    parser.constant('true', true);
    parser.constant('false', false);
    parser.constant('null', null);
    parser.constant('pi', Math.PI);
  }
  
  static addStatements(parser) {
    parser.statement_symbol('L_BRACE', function() {
      parser.newScope();
      let a = parser.statements();
      parser.advanceToken('R_BRACE');
      parser.scope.pop();
      return a;
    });
    
    // @todo: fix and test this mess
    parser.statement_symbol('VAR', function() {
      let t;
      let ident;
      let a = [];
      
      while (true) {
        ident = parser.token;
        
        if (ident.type !== 'IDENTIFIER') {
          throw Error ('Expected indentifier.');
        }
        
        parser.scope.define(ident);
        parser.advanceToken();
        
        if (parser.token.id === 'EQUALS') {
          t = parser.token;
          parser.advanceToken('EQUALS');
          t.first = ident;
          t.second = parser.expression(0);
          t.type = 'BINARY';
          a.push(t);
        }
        
        // variable definitions can be comma-separated:
        // @todo: remove this capability.
        
        if (parser.token.id !== 'COMMA') {
          break;
        }
        parser.advanceToken('COMMA');
      }
      parser.advanceToken('SEMI');
      
      return a.length === 0 ? null : (a.length === 1 ? a[0] : a);
    });
    
    parser.statement_symbol('WHILE', function() {
      parser.advanceToken('L_PAREN');
      this.first = parser.expression(0);
      parser.advanceToken('R_PAREN');
      this.second = parser.block();
      this.type = 'STATEMENT';
      return this;
    });
    
    parser.statement_symbol('IF', function() {
      parser.advanceToken('L_PAREN');
      this.first = parser.expression(0);
      parser.advanceToken('R_PAREN');
      this.second = parser.block();
      
      if (parser.token.id === 'ELSE') {
        parser.scope.reserve(parser.token);
        parser.advanceToken('ELSE');
        this.third = parser.token.id === 'IF' ? parser.statement() : parser.block();
      }
      else {
        this.third = null;
      }
      this.type = 'STATEMENT';
      return this;
    });
    
    parser.statement_symbol('BREAK', function() {
      parser.advanceToken('SEMI');
      if (parser.token.id !== 'R_BRACE') {
        // @todo: better error message.
        throw Error('Unreachable statement.');
      }
      this.type = 'STATEMENT';
    });
    
    parser.statement_symbol('RETURN', function() {
      if (parser.token.id !== 'SEMI') {
        this.first = parser.expression(0);
      }
      parser.advanceToken('SEMI');
      if (parser.token.id !== 'R_BRACE') {
        // @todo: better error message.
        throw Error('Unreachable statement.');
      }
      this.type = 'STATEMENT';
      return this;
    });
    
    // function definition.
    
    parser.statement_symbol('FUNCTION', function() {
      
      // find the name of the function
      if (parser.token.id === 'IDENTIFIER') {
        parser.scope.define(parser.token);
        this.name = parser.token.value;
      }
      parser.advanceToken('IDENTIFIER');
      
      // create a new scope for arguments etc.
      parser.newScope();
      
      // parse the arguments
      let a = [];
      parser.advanceToken('L_PAREN');
      if (parser.token.id !== 'R_PAREN') {
        while (true) {
          if (parser.token.type !== 'IDENTIFIER') {
            throw Error('Expected a parameter name.');
          }
          parser.scope.define(parser.token);
          
          a.push(parser.token);
          parser.advanceToken();
          if (parser.token.id !== 'COMMA') {
            break;
          }
          parser.advanceToken('COMMA');
        }
      }
      
      this.first = a;
      parser.advanceToken('R_PAREN');
      this.second = parser.block();
      
      parser.scope.pop(); // leave the function scope.
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
      parser.advanceToken('IDENTIFIER');
      parser.advanceToken('SEMI');
      
      this.type = 'EXTERN';
      return this;
    });
  }
}