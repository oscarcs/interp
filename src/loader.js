// file loader
// oscar c. s.

'use strict';

let fs = require('fs');

// the file loader loads source files into 
// the interpreter.

module.exports = class Loader {
  static load(path) {
    
    // synchronously load a file.
    // we don't want to deal with an asynchronous implementation!
    
    let contents = fs.readFileSync(path).toString();
    return contents;
  }
}