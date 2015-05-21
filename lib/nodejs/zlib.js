var zlib = require('zlib');

function inflateBlob(blob, callback){
    zlib.inflate(blob.zlib_data.toBuffer(), callback);
}

module.exports = {
    inflateBlob: inflateBlob
};