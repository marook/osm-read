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

function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(toArrayBuffer(buffer)));
}

function readPBFElement(fd, position, size, pbfDecode, callback){
    var buffer;

    if(size > 32 * 1024 * 1024){
        return callback(new Error('PBF element too big: ' + size + ' bytes'));
    }

    buffer = new Buffer(size);

    fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
        if(bytesRead !== size){
            return bytesReadFail(callback, size, bytesRead);
        }

        return readPBFElementFromBuffer(buffer, pbfDecode, callback);
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
            if(err){
                return callback(err);
            }

            blobHeader.position = position + BLOB_HEADER_SIZE_SIZE + blobHeaderSize;

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

function pbfBufferToBuffer(src, srcOffset, len){
    var from, to, i;

    from = src.view;
    to = new Buffer(len);

    for(i = 0; i < len; ++i){
        to.writeUInt8(from.getUint8(i + srcOffset), i);
    }

    return to;
}

function blobDataToBuffer(blob){
    var from, len, offset;

    from = blob.view;

    // TODO find out where the offset comes from!?!
    offset = 0; //6; // 4
    for(offset = 0; offset < from.byteLength - 1; ++offset){
        if(from.getUint16(offset) === 0x789c){
            break;
        }
    }

    len = from.byteLength - offset;

    return pbfBufferToBuffer(blob, offset, len);
}

function getStringTableEntry(i){
    var s;

    s = this.s[i];

    // TODO specify toString encoding

    // obviously someone is missinterpreting the meanding of 'offset'
    // and 'length'. they should be named 'start' and 'end' instead.
    return pbfBufferToBuffer(s, s.offset, s.length - s.offset).toString();
}

function extendStringTable(st){
    st.getEntry = getStringTableEntry;
}

function createNodesView(pb, pg){
    var length, tagsList;

    if(pg.nodes.length !== 0){
        throw new Error('primitivegroup.nodes.length !== 0 not supported yet');
    }

    length = 0;

    if(pg.dense){
        length = pg.dense.id.length;
    }

    function createTagsList(){
        var tagsList, i, tagsListI, tags, keyId, keysVals, valId, key, val;

        if(!pg.dense){
            return [];
        }

        keysVals = pg.dense.keys_vals;
        tags = {};
        tagsList = [];

        for(i = 0; i < keysVals.length;){
            keyId = keysVals[i++];

            if(keyId === 0){
                tagsList.push(tags);

                tags = {};

                continue;
            }
            
            valId = keysVals[i++];

            key = pb.stringtable.getEntry(keyId);
            val = pb.stringtable.getEntry(valId);

            tags[key] = val;
        }

        return tagsList;
    }

    tagsList = createTagsList();

    function get(i){
        var id;

        if(i === 0){
            id = pg.dense.id[i].toNumber();
        }
        else{
            // TODO we should test wheather adding 64bit numbers works fine with high values
            id = get(i - 1)._id + pg.dense.id[i].toNumber();
        }

        return {
            _id: id,
            id: '' + id,
            lat: 0.000000001 * (pb.lat_offset.toNumber() + (pb.granularity * pg.dense.lat[i].toNumber())),
            lon: 0.000000001 * (pb.lon_offset.toNumber() + (pb.granularity * pg.dense.lon[i].toNumber())),
            tags: tagsList[i]
        };
    }

    return {
        length: length,
        get: get
    };
}

function extendPrimitiveGroup(pb, pg){
    pg.nodesView = createNodesView(pb, pg);
}

function decodePrimitiveBlock(buffer){
    var data, i;

    data = blockFormat.PrimitiveBlock.decode(buffer);

    // extend stringtable
    extendStringTable(data.stringtable);

    // extend primitivegroup
    for(i = 0; i < data.primitivegroup.length; ++i){
        extendPrimitiveGroup(data, data.primitivegroup[i]);
    }

    return data;
}

var OSM_BLOB_DECODER_BY_TYPE = {
    'OSMHeader': blockFormat.HeaderBlock.decode,
    'OSMData': decodePrimitiveBlock
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
            return readPBFElement(fd, fileBlock.blobHeader.position, fileBlock.blobHeader.datasize, fileFormat.Blob.decode, callback);
        }

        function readBlock(fileBlock, callback){
            return readBlob(fileBlock, function(err, blob){
                if(err){
                    return callback(err);
                }

                if(blob.raw_size === 0){
                    return callback('Uncompressed pbfs are currently not supported.');
                }

                zlib.inflate(blobDataToBuffer(blob.zlib_data), function(err, data){
                    if(err){
                        return callback(err);
                    }

                    return readPBFElementFromBuffer(data, OSM_BLOB_DECODER_BY_TYPE[fileBlock.blobHeader.type], callback);
                });
            });
        }

        return callback(null, {
            findFileBlocksByBlobType: findFileBlocksByBlobType,

            readBlock: readBlock
        });
    });
}

function parse(opts){
    fs.open(opts.filePath, 'r', function(err, fd){
        createParser(fd, function(err, parser){
            if(err){
                return opts.callback(err);
            }

            parser.close = function(callback){
                return fs.close(fd, callback);
            };

            return opts.callback(null, parser);
        });
    });
}

module.exports = {
    parse: parse
};
