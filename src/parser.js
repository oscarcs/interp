// new parser

'use strict';

let Scope = require('./scope');
let Definitions = require('./definitions');

module.exports = class Parser {
  
  constructor(lexer) {
    this.lexer = lexer;
    
    // init the symbol table. create the base symbol that
    // has nud ('null denotation') and led ('left denotation')
    // functions with empty bodies.
    
    this.symbols = {};
    this.baseSymbol = {
      // @todo: better error messages.
      nud: () => { throw Error('Undefined.') },
      led: (left) => { throw Error('Missing operator.') }, 
    };
    
    // init the scope object. create the base scope from which
    // all other scopes with inherit.
    // @todo: do we keep the scope as part of the parser?
    // @todo: make initialization of this less error-prone.
    
    this.scope; // make sure this isn't initialized!
    
    let that = this; // scope silliness.
    // current position
    this.cur = 0;
    this.tokens = [];
    this.token;
    while (true) {
      let token = lexer.getToken();
      if (!token) break;
      
      // @todo: stop comments from emitting a token so this code can be moved 
      //        into the lexer.
      // ignore comments, don't add them to the token stream.
      // an AST that preserves comments and formatting is called a
      // 'full syntax tree'. We don't need to do this because we 
      // aren't writing a source-to-source compiler or a beautifier or anything.
      
      if (token.name !== 'COMMENT') {
        this.tokens.push({
          type: token.name,
          value: token.value
        });
      }
    }
    // add an end token
    // @todo move this into the lexer?
    this.tokens.push({
      type: 'OPERATOR',
      value: 'END',
    });
    
    console.log(this.tokens);
    
    // add the tokens we wil need
    Definitions.addDefinitions(this);
  }
  
  parse() {
    this.newScope();
    this.advanceToken();
    let s = this.statements();
    this.advanceToken('END');
    this.scope.pop(); 
    return s;
  } 
  
  // makes a new token object from the next simple token 
  // in the array and assigns it to the this.token variable.

  advanceToken(id) {
    
//    console.log('TOKEN:')
//    if (this.token) { console.log(this.token.type); console.log(this.token.value); }
//    console.log('\n');
    //console.log(this.scope);
    //console.log('\n');
    
    // optional id to check against the id of the previous token.
    if (id && this.token.id !== id) {
      throw Error('Expected "' + id + '".');
    }
    
    if (this.cur >= this.tokens.length) {
      this.token = this.symbols['END'];
      return;
    }
    
    // get the next token and increment.
    let tk = this.tokens[this.cur];
    this.cur++;
    
    let value = tk.value;
    let type = tk.type;
    let obj = null;
    
    if (type === 'IDENTIFIER') {
      let cur = this.scope.find(value);
      if (cur) {
        obj = cur;
      }
      else {
        obj = this.symbols['IDENTIFIER'];
      }
      //obj = this.scope.find(value);
    }
    else if (type === 'OPERATOR') {
      obj = this.symbols[value];
      if (!obj) {
        throw Error('Unknown operator type: "' + value + '".');
      }
    }
    else if (type === 'STRING' || type === 'NUMBER') {
      type = 'LITERAL';
      obj = this.symbols['LITERAL'];
    }
    else {
      throw Error('Unexpected token: "' + type + '".');
    }
    
    this.token = Object.create(obj);
    
    this.token.value = value;
    this.token.type = type;
    
    return this.token;
  }
  
  // establish a new scope for a function or a block.
  // makes a new instance of the original scope prototype.
  
  newScope() {
    let s = this.scope;
    this.scope = new Scope(this);
    this.scope.def = {}; // clear definitions.
    this.scope.parent = s;
    return this.scope;
  }
  
  // a function that makes symbols.
  // takes a symbol id and an optional binding power,
  // and returns a symbol object for that id.
  // if the symbol already exists in the symbol table, 
  // the function returns that symbol object.
  
  symbol(id, bp) {
    let symbol = this.symbols[id];
    bp = bp || 0;
    
    if (symbol) {
      if (bp >= symbol.lbp) {
        symbol.lbp = bp;
      }
    }
    else {
      symbol = Object.create(this.baseSymbol);
      symbol.id = symbol.value = id;
      symbol.lbp = bp;
      this.symbols[id] = symbol;
    }
    return symbol;
  }
  
  // the expression function is the core of the
  // technique. it takes a right binding power,
  // which controls how agressively it binds
  // to tokens on the right.
  
  expression(rbp) {
    let left;
    let t = this.token;
    
    this.advanceToken();
    
    // the nud is used to process literals, variables, 
    // and prefix operators.
    
    left = t.nud();
    
    // as long as the right binding power is less 
    // than the left binding power of the next token,
    // the led method is invoked on the following token.
    
    while (rbp < this.token.lbp) {
      t = this.token;
      this.advanceToken();
      
      // the led is used to process infix and 
      // suffix operators.
      left = t.led(left);
    }
    return left;
  }
  
  // a function for making symbols for infix operators.
  // takes an id, binding power, and a led function.
  
  infix(id, bp, led) {
    let s = this.symbol(id, bp);
    
    // if no led is provided, use a sane default.
    let that = this;
    let f = function(left) {
      this.first = left;
      this.second = that.expression(bp);
      this.type = 'BINARY'; 
      return this;
    };
    
    s.led = led || f;
    return s;
  }
  
  // a function for making symbols for right-associative
  // operators. (assignment, OR, AND, etc).
  infix_right(id, bp, led) {
    let s = this.symbol(id, bp);
    
    let that = this;
    let f = function(left) {
      this.first = left;
      this.second = that.expression(bp - 1);
      this.type = 'BINARY';
      return this;
    }
    s.led = led || f;
    
    return s;
  }
  
  // prefix operators are right associative. 
  // a prefix does not have a left binding power
  // because it does not bind to the left.
  
  prefix(id, nud) {
    let s = this.symbol(id);
    
    let that = this;
    let f = function() {
      that.scope.reserve(this);
      this.first = that.expression(70);
      this.type = 'UNARY';
      return this;
    };
    
    s.nud = nud || f;
    return s;
  }
  
  // makes a right-associating infix operator,
  // checks the left operand to make sure it is
  // valid, and adds an 'assigment' flag.
  
  assignment(id) {
    let that = this;
    return this.infix_right(id, 10, function(left) {
      
      // check that the left operand is valid.
      
      if (left.type !== 'IDENTIFIER') { // && left.id !== 'PERIOD' && left.id !== 'L_BRACKET'
        //@todo: better error message.
        throw Error('Bad lvalue');
      }
      
      if (!that.scope.find(left.value)) {
        throw Error('Undefined identifier "' + left.value + '" cannot be assigned to.')
      }
      
      this.first = left;
      this.second = that.expression(9);
      
      // add an assignment member so we can quickly check
      // for assignment statements.
      
      this.assignment = true;
      
      this.type = 'BINARY';
      return this;
    });
  }
  
  constant(name, value) {
    let x = this.symbol(name);
    let that = this;
    x.nud = function() {
      that.scope.reserve(this);
      this.value = that.symbols[this.id].value;
      this.type = 'LITERAL';
      return this;
    };
    x.value = value;
    return x;
  }
  
  // the statement function parses one statement. 
  // statements have an 'std', statement denotation,
  // that is called at the start of a statement only.
  
  statement() {
    let identifier = this.token;
    let v;
    
    // if the statement has an std, the token is
    // reserved and the std is invoked.
    
    if (identifier.std) {
      this.advanceToken();
      this.scope.reserve(identifier);
      
      return identifier.std();
    }
    v = this.expression(0);
    
    // reject an expression statement that isn't an
    // assignment or invocation.
    
    //if (!v.assignment && v.id !== 'L_PAREN') {
      // @todo: better error message. 
    //  throw Error('Bad expression statement.');
    //}
    
    //console.log(this.token);
    
    // @todo: remove assumption that statements are
    //        semicolon-terminated?
    this.advanceToken('SEMI');
    return v;
  }
  
  // the statements function parses statements until it sees
  // a block-terminating token. returns an array of statements
  // or null if there were no statements present.
  
  statements() {
    let a = [];
    let stat;    
    
    while (true) {
      if (this.token.id === 'R_BRACE' || this.token.id === 'END') {
        break;
      }
      stat = this.statement();
      if (stat) {
        a.push(stat);
      }
    }
    return a.length === 0 ? null : (a.length === 1 ? a[0] : a);
  }
  
  // adds a new statement symbol to the symbol table.
  
  statement_symbol(id, std) {
    let x = this.symbol(id);
    x.std = std;
    return x;
  }
  
  // the block function parses a block.
  
  block() {
    let t = this.token;
    this.advanceToken('L_BRACE');
    return t.std();
  }
  
  
  
}