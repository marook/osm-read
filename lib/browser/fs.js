// minimal fs module browser shim for pbfParser.js

var fs = (function() {

// pbfParser.js usages:
//   fs.read(fd, buffer, 0, BLOB_HEADER_SIZE_SIZE, position, function(err, bytesRead, buffer){
//   fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
// Node.js signature:
//   fs.read = function(fd, buffer, offset, length, position, callback) {
var read = function(arrayBuffer, viewBuffer, offset, length, position, callback) {
    //log('fs.read offset = ' + offset + ', length = ' + length + ', position ' + position);
    var viewBufferLength = viewBuffer.length,
        err = null;
    // ignore offset, always 0
    viewBuffer.set(new Uint8Array(arrayBuffer, position, length));

    if (!(viewBufferLength === viewBuffer.length)) {
        err = 'lengths dont match: ' + viewBufferLength + '!=' + viewBuffer.length;
        console.warn(err);
        throw err;
    }

    callback(err, viewBuffer.length, viewBuffer);
};

// fs.fstat(fd, function(err, fdStatus){
var fstat = function(arrayBuffer, callback) {
    callback(null, {
        size: arrayBuffer.byteLength
    });
};

//exports.read = read;
return {
    read: read,
    fstat: fstat
};

})();