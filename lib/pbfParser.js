var protoBuf = require("protobufjs");
var fs = require('fs');

var fileFormat = protoBuf.protoFromFile('./lib/fileformat.proto').build('OSMPBF');

function toArrayBuffer(buffer) {
    /*
     * took this function from
     * http://stackoverflow.com/questions/8609289/convert-a-binary-nodejs-buffer-to-javascript-arraybuffer
     */
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

var BLOB_HEADER_SIZE_SIZE = 4;

function bytesReadFail(callback, expectedBytes, readBytes){
    return callback(new Error('Expected ' + expectedBytes + ' bytes but got ' + readBytes));
}

function readBlobHeaderSize(fd, position, callback){
    var buffer;

    buffer = new Buffer(BLOB_HEADER_SIZE_SIZE);

    fs.read(fd, buffer, 0, BLOB_HEADER_SIZE_SIZE, position, function(err, bytesRead, buffer){
        if(bytesRead !== BLOB_HEADER_SIZE_SIZE){
            return bytesReadFail(callback, BLOB_HEADER_SIZE_SIZE, bytesRead);
        }

        return callback(null, buffer.readInt32BE(0));
    });
}

function readBlobHeaderContent(fd, position, size, callback){
    var buffer;

    if(size > 16 * 1024){
        return callback(new Error('Blob header too big: ' + blobHeaderSize));
    }

    buffer = new Buffer(size);

    fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
        if(bytesRead !== size){
            return bytesReadFail(callback, size, bytesRead);
        }

        callback(null, fileFormat.BlobHeader.decode(toArrayBuffer(buffer)));
    });
}

function readBlobHeader(fd, position, callback){
    readBlobHeaderSize(fd, position, function(err, blobHeaderSize){
        if(err){
            return callback(err);
        }

        return readBlobHeaderContent(fd, position + BLOB_HEADER_SIZE_SIZE, blobHeaderSize, callback);
    });
}

function parse(){
    fs.open('./test/test.pbf', 'r', function(err, fd){
        readBlobHeader(fd, 0, function(err, blobHeader){
            console.log(blobHeader);
        });
    });
}

module.exports = {
    parse: parse
};
