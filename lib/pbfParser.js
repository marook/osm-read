/*
 * The following little overview extends the osm pbf file structure description
 * from http://wiki.openstreetmap.org/wiki/PBF_Format:
 *
 * - [1] file
 *   - [n] file blocks
 *     - [1] blob header
 *     - [1] blob
 */

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

function readFileBlock(fd, position, callback){
    readBlobHeaderSize(fd, position, function(err, blobHeaderSize){
        if(err){
            return callback(err);
        }

        return readBlobHeaderContent(fd, position + BLOB_HEADER_SIZE_SIZE, blobHeaderSize, function(err, blobHeader){
            var blobPosition;

            if(err){
                return callback(err);
            }

            return callback(err, {
                position: position,
                size: BLOB_HEADER_SIZE_SIZE + blobHeaderSize + blobHeader.datasize,
                blobHeader: blobHeader
            });
        });
    });
}

function readFileBlocks(fd, callback){
    fs.fstat(fd, function(err, fdStatus){
        var position, fileSize, fileBlocks;

        fileSize = fdStatus.size;
        position = 0;
        fileBlocks = [];

        function readNextFileBlock(){
            readFileBlock(fd, position, function(err, fileBlock){
                if(err){
                    return callback(err);
                }

                fileBlocks.push(fileBlock);

                position = fileBlock.position + fileBlock.size;

                if(position < fileSize){
                    readNextFileBlock();
                }
                else{
                    return callback(null, fileBlocks);
                }
            });
        }

        readNextFileBlock();
    });
}

function createParser(fd, callback){
    readFileBlocks(fd, function(err, fileBlocks){
        if(err){
            return callback(err);
        }

        console.log(fileBlocks);
    });
}

function parse(){
    fs.open('./test/test.pbf', 'r', function(err, fd){
        createParser(fd, function(err){
            // TODO
        });
    });
}

module.exports = {
    parse: parse
};
