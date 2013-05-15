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
var zlib = require('zlib');

var fileFormat = protoBuf.protoFromFile('./lib/fileformat.proto').build('OSMPBF');
var blockFormat = protoBuf.protoFromFile('./lib/osmformat.proto').build('OSMPBF');

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

function readPBFElement(fd, position, size, pbfDecode, callback){
    var buffer;

    if(size > 64 * 1024){
        return callback(new Error('PBF element too big: ' + size + ' bytes'));
    }

    buffer = new Buffer(size);

    fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
        if(bytesRead !== size){
            return bytesReadFail(callback, size, bytesRead);
        }

        return callback(null, pbfDecode(toArrayBuffer(buffer)));
    });
}

function readBlobHeaderContent(fd, position, size, callback){
    return readPBFElement(fd, position, size, fileFormat.BlobHeader.decode, callback);
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

function blobDataToBuffer(blob){
    var from, to, len, i, offset;

    from = blob.view;

    // TODO find out where the offset comes from
    offset = 4;

    len = from.byteLength - offset;
    to = new Buffer(len);

    for(i = 0; i < len; ++i){
        to.writeUInt8(from.getUint8(i + offset), i);
    }

    return to;
}

function readOsmHeaderBlock(fd, fileBlock, data, callback){
    console.log(data);

    return callback();
}

var OSM_BLOB_READER_BY_TYPE = {
    'OSMHeader': readOsmHeaderBlock
};

function createParser(fd, callback){
    readFileBlocks(fd, function(err, fileBlocks){
        if(err){
            return callback(err);
        }

        function findFileBlocksByBlobType(blobType){
            var blocks, i, block;

            blocks = [];

            for(i = 0; i < fileBlocks.length; ++i){
                block = fileBlocks[i];

                if(block.blobHeader.type !== blobType){
                    continue;
                }

                blocks.push(block);
            }

            return blocks;
        }

        function readBlob(fileBlock, callback){
            return readPBFElement(fd, fileBlock.position + fileBlock.size - fileBlock.blobHeader.datasize, fileBlock.blobHeader.datasize, fileFormat.Blob.decode, callback);
        }

        function readBlock(fileBlock, callback){
            return readBlob(fileBlock, function(err, blob){
                if(blob.raw_size === 0){
                    return callback('Uncompressed pbfs are currently not supported.');
                }

                zlib.inflate(blobDataToBuffer(blob.zlib_data), function(err, data){
                    if(err){
                        return callback(err);
                    }

                    return OSM_BLOB_READER_BY_TYPE[fileBlock.blobHeader.type](fd, fileBlock, data, callback);
                });
            });
        }

        return callback(null, {
            findFileBlocksByBlobType: findFileBlocksByBlobType,

            readBlock: readBlock
        });
    });
}

function parse(callback){
//    fs.open('./germany.osm.pbf', 'r', function(err, fd){
    fs.open('./test/test.pbf', 'r', function(err, fd){
        createParser(fd, function(err, parser){
            var headers, i, block;

            headers = parser.findFileBlocksByBlobType('OSMHeader');

            for(i = 0; i < headers.length; ++i){
                block = headers[i];
                
                parser.readBlock(block, function(err, blob){
                    if(err){
                        return callback(err);
                    }

                    console.log(blob);

                    // TODO

                    return callback(null, blob);
                });
            }
        });
    });
}

module.exports = {
    parse: parse
};
