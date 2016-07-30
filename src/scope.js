'use strict';

module.exports = class Scope {
  
  constructor(context, isParser) {
    if (typeof(isParser) === 'undefined') isParser = true;
    this.isParser = isParser;
    this.context = context;
    this.def = {};
  }
  
  // the define method transforms a ident token
  // into a variable token.
  
  define(identifier) {
    let v = this.def[identifier.value];
    
    // produces an error if the variable has already been 
    // defined in the scope or if the name has already 
    // been used as a reserved word.
    
    if (typeof(v) === 'object') {
      throw Error(v.reserved ?
        'Cannot use a reserved keyword "' + identifier.value + '".' :
        'Variable "' + identifier.value + '" already defined.');
    }
    
    if (this.isParser) {
      this.def[identifier.value] = identifier;
      identifier.reserved = false;
      identifier.nud = function () {
        return this; // return self
      };
      identifier.led = null;
      identifier.std = null;
      identifier.lbp = 0;
      identifier.scope = this.context.scope;
    }
    else {
      this.def[identifier.name] = identifier;
    }
    return identifier;
  }
  
  // the find method is used to find the definition 
  // of an identifier.
  
  find(ident) {
    let obj;
    let cur = this;
    
    // starts with the current scope and seeks, if necessary, 
    // back through the chain of parent scopes and ultimately
    // to the symbol table.
    
    while (true) {  
      obj = cur.def[ident];
      
      if (obj && typeof(obj) !== 'function') {
        return cur.def[ident];
      }
      
      // go up the stack. if we're at the top, return.
      cur = cur.parent; 
      if (!cur) {
        if (this.isParser) {
          obj = this.context.symbols[ident];
          if (obj && typeof(obj) !== 'function') {
            return obj;
          }
          else {
            // if we didn't find it, return nothing.
            return;
          }
        }
        else {
          return;
        }
      }
    }
  }
  
  // pop closes the scope, and gives focus to the parent.
  pop() { 
    this.context.scope = this.parent; 
  }
   
  // reserve indicates whether the id is a reserved word
  // in the current scope
  
  reserve(identifier) {
    let v = this.def[identifier.value];
    
    if (v && v.reserved) {
        return;
    }
    
    if (this.isParser) {
      if (identifier.type !== 'IDENTIFIER' || identifier.reserved) {
        return;
      }
      if (v && v.type === 'IDENTIFIER') {
        throw Error('Already defined.');
      }
      
      this.def[identifier.value] = identifier;
    }
    else {
      this.def[identifier.name] = identifier;
    }

    identifier.reserved = true;    
  }
}