// a single parser node.

'use strict';

module.exports = class ASTNode {
  
  // static list of possible node types.
  static get tokenTypes() {
    return [
      'SYMBOL',
      'IDENTIFIER',
      'NUMBER',
      'STRING',
    ];
  }
  static get nodeTypes() {
    return [
      'EXTERN',
      'SCOPE',
      'UNARY',
      'BINARY',
      'LITERAL',
      'IDENTIFIER',
      'FUNCTION',
      'STATEMENT',
      'TERNARY',
    ];
  }
  
  constructor() {
    this.type = 'SYMBOL';
    this.children = [];
  } 
  
  get type() {
    if (!this._type) {
      throw Error('Node type not set.');
    }
    return this._type;
  }
  
  set type(type) {
    if (ASTNode.tokenTypes.indexOf(type) === -1 && 
        ASTNode.nodeTypes.indexOf(type) === -1) {
      throw Error('Type "' + type + '" is not a valid type.');
    }
    this._type = type;
  }
  
  // initialize the node for parsing.
  
  make_parseable(id, bp) {
    // @todo: better error messages.
    this.nud = () => { throw Error('Undefined.'); };
    this.led = (left) => { throw Error('Missing operator.'); };
    
    this.id = this.value = id;
    this.lbp = bp;
  }
  
  // remove the members we added to be able to 
  // parse this node.
  
  clean_parseable() {
    
    if (ASTNode.nodeTypes.indexOf(this.type) === -1) {
      throw Error('Cannot clean token that has not been converted to an AST node.');
    }
    
    delete this.nud;
    delete this.led;
    
    if (this.children.length === 0) {
      delete this.children;
    }
  }
} 