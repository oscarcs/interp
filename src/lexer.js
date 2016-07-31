// lexer
// oscar c.s.

'use strict';

// the lexer performs lexical analysis.
// that is, it converts the source text into 'lexemes',
// otherwise known as tokens.
// each one of these tokens is a 'fundamental unit' of 
// the language. We feed these tokens to the parser
// to perform the magic (and generate an AST!)

module.exports = class Lexer {

  constructor(input) {
    
    // table of operators
    this.optable = {
      '+':  'PLUS',
      '-':  'MINUS',
      '*':  'MULTIPLY',
      '/':  'DIVIDE',
      '%':  'MODULO',
      '^':  'EXPONENT',
      
      '.':  'PERIOD',
      '\\': 'BACKSLASH',
      '|':  'PIPE',
      '&':  'AMPERSAND',
      
      '||': 'OR',
      '&&': 'AND',
      '!':  'NOT',
      
      '?':  'QUESTION',
      ':':  'COLON',
      ';':  'SEMI',
      ',':  'COMMA',
      
      '(':  'L_PAREN',
      ')':  'R_PAREN',
      '{':  'L_BRACE',
      '}':  'R_BRACE',
      '[':  'L_BRACKET',
      ']':  'R_BRACKET',
      
      '=':  'EQUALS',
      '==': 'EQUALITY',
      '!=': 'INEQUALITY',
      '<':  'LESS_THAN',
      '>':  'GREATER_THAN',
      '<=': 'NOT_GREATER_THAN',
      '>=': 'NOT_LESS_THAN',
      // @future: currently not implementing increment and decrement 
      //          because they are not favoured in modern languages.
      //'++': 'INCREMENT',
      //'--': 'DECREMENT',
      '+=': 'INCREMENT_ASSIGN',
      '-=': 'DECREMENT_ASSIGN',
    };
    
    this.keywords = {
      'let':      'VAR',
      'function': 'FUNCTION',
      'while':    'WHILE',
      'if':       'IF',
      'else':     'ELSE',
      'return':   'RETURN',
      'break':    'BREAK',
      'extern':   'EXTERN',
    };
    
    // initialize the 'buffer'. the buffer is just a string,
    // because javascript doesn't have more advanced constructs.
    
    this.pos = 0;
    this.buf = input;
    this.buflen = input.length;
  }
  
  tokenize() {
    let tokens = [];
    while (true) {
      let token = this.getToken();
      if (!token) break;
      
      if (token.type !== 'COMMENT') {
        tokens.push(token);
      }
    }
    
    tokens.push({
      type: 'SYMBOL',
      value: 'END',
    });
    
    return tokens;
  }
  
  
  getToken() {
    
    // we don't care about empty space! they aren't a fundamental
    // part of the program logic.
    
    this.skipEmpty();
    
    if (this.pos >= this.buflen) return null;
    
    
    // check the optable for a matching operator.
    // we use lookahead to determine whether the 
    // operator is a two-character symbolic operator
    // like '==' '+=' '++' etc.
    let op;
    let c = this.buf.charAt(this.pos);
    let n = this.buf.charAt(this.pos + 1);

    if (this.optable[(c + n)]) {
      op = this.optable[(c + n)];
      this.pos++;
    }
    else {
      op = this.optable[c];
    }
    
    // check optable, then check for identifiers and literals.
    
    if (op !== undefined) {
      return {type: 'SYMBOL', value: op, pos: this.pos++};
    }
    else {
      if (Lexer.isAlpha(c)) {
        return this.processIdentifier(); 
      }
      else if (Lexer.isNumeric(c)) {
        return this.processNumber();
      }
      else if (c === '"' || c === "'") {
        return this.processQuote(c);
      }
      else {
        throw Error('Token error at position ' + this.pos + ': ' + c);
      }
    }
  }
  
  static isNewline(c) {
    return c === '\r' || c === '\n';
  }
  
  static isAlpha(c) {
    return (c >= 'a' && c <= 'z') 
        || (c >= 'A' && c <= 'Z') 
        || c === '_' 
        || c === '$';
  }
  
  // the characters that make up a valid number.
  // we include '.' (different from PERIOD), so that we can 
  // manipulate floating-point numbers.
  
  static isNumeric(c) {
    return (c >= '0' && c <= '9') || c === '.';
  }
  
  // the characters that make up a valid identifier.
  static isAlphanumeric(c) {
    return Lexer.isAlpha(c) 
        || Lexer.isNumeric(c) 
        || c === '_' 
        || c === '-';
  }
  
  skipEmpty() {
    while (this.pos < this.buflen) {
      let c = this.buf.charAt(this.pos);
      
      if (c === '/') {
        let next_c = this.buf.charAt(this.pos + 1);
        if (next_c === '/') {
          this.processComment();
        }
      }
      
      if (c === ' ' || c === '\t' || c === '\r' || c === '\n') {
        this.pos++;
      }
      else if (c !== '/') {
        break;
      }
    }
  }

  processComment() {
    let endpos = this.pos + 2;
    
    let c = this.buf.charAt(this.pos + 2);
    while (endpos < this.buflen && !Lexer.isNewline(this.buf.charAt(endpos))) {
      endpos++;
    }
    this.pos = endpos;
    
    return;
  }
  
  processNumber() {
    let endpos = this.pos + 1;
    
    let isFloat = false;
    let cur = this.buf.charAt(endpos);
    while (endpos < this.buflen && Lexer.isNumeric(cur)) {
      if (cur === '.') isFloat = true; 
      
      endpos++;
      cur = this.buf.charAt(endpos);
    }
    
    // parse strings into numbers to prevent 3 + 4 = 34, for example.
    const str = this.buf.substring(this.pos, endpos);
    let val = isFloat ? parseFloat(str) : parseInt(str);
    
    const token = {
      type: 'NUMBER',
      value: val,
      pos: this.pos
    };
    this.pos = endpos;
    return token;
  }
  
  processIdentifier() {
    let endpos = this.pos + 1;
    while (endpos < this.buflen 
          && Lexer.isAlphanumeric(this.buf.charAt(endpos))) {
      endpos++;
    }
    
    const val = this.buf.substring(this.pos, endpos); 
    
    // check the keyword table first:
    let keyword = this.keywords[val.toLowerCase()];
    let token;
    if (typeof(keyword) !== 'undefined') {
      token = {
        type: 'SYMBOL', 
        value: keyword,
        pos: this.pos,
      };
    } 
    else {
      token = {
        type: 'IDENTIFIER',
        value: val,
        pos: this.pos
      };
    }
  
    this.pos = endpos;
    return token;
  }
  
  // takes either a ' or " as a 'type'.
  // this just allows us to check for the terminating quote.
  
  processQuote(type) {
    let endpos = this.buf.indexOf(type, this.pos + 1);
    
    if (endpos === -1) {
      throw Error('Unterminated quote at position ' + this.pos);
    }
    else {
      const token = {
        type: 'STRING',
        value: this.buf.substring(this.pos + 1, endpos),
        pos: this.pos
      }
      this.pos = endpos + 1;
      return token;
    }
  }
}