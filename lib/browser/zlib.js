// don't use npm 'zlibjs' module, would require shims for the Node.js wrappers
var Zlib = require('../../node_modules/zlibjs/bin/inflate.min.js').Zlib;

function inflateBlob(blob, callback){
    var infl = new Zlib.Inflate(new Uint8Array(blob.zlibData), {
        bufferSize: blob.rawSize
    });
    return callback(null, infl.decompress());
}

module.exports = {
    inflateBlob: inflateBlob
};
