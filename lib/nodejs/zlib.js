var zlib = require('zlib');

function inflateBlob(blob, callback){
    zlib.inflate(blob.zlibData, callback);
}

module.exports = {
    inflateBlob: inflateBlob
};