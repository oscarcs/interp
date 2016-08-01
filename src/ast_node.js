// a single parser node.

'use strict';

module.exports = class ASTNode {
  
  // static list of possible node types.
  static get tokenTypes() {
    return [
      'SYMBOL',
      'IDENTIFIER',
      'NUMBER',
    ];
  }
  static get nodeTypes() {
    return [
      'BINARY',
      'UNARY',
      'EXTERN',
      'LITERAL',
      'IDENTIFIER',
    ];
  }
  
  constructor() {
    this.type = 'BINARY';
    this.children = [];
  } 
  
  get type() {
    if (!this._type) {
      throw Error ('Node type not set.');
    }
    return this._type;
  }
  
  set type(type) {
    if (ASTNode.tokenTypes.indexOf(type) === -1 && 
        ASTNode.nodeTypes.indexOf(type) === -1) {
      throw Error ('Type "' + type + '" is not a valid type.');
    }
    this._type = type;
  }
  
  get first() {
    throw Error('Don\'t use the old style of children');    
  }
  
  set first(x) {
    throw Error('Don\'t use the old style of children');
  }

  get second() {
    throw Error('Don\'t use the old style of children');    
  }
  
  set second(x) {
    throw Error('Don\'t use the old style of children');
  }
  
  get thirdd() {
    throw Error('Don\'t use the old style of children');    
  }
  
  set third(x) {
    throw Error('Don\'t use the old style of children');
  }
  
  make_parseable(id, bp) {
    // @todo: better error messages.
    this.nud = () => { throw Error('Undefined.'); };
    this.led = (left) => { throw Error('Missing operator.'); };
    
    this.id = this.value = id;
    this.lbp = bp;
  }
  
  clean_parseable() {
    delete this.nud;
    delete this.led;
    
    if (this.children.length === 0) {
      delete this.children;
    }
  }
}