(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.pbfParser = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var buf = require('../buffer.js');
require("setimmediate");

function readBlobHeaderSize(fd, position, size, callback){
    var headerSize = new DataView(fd).getInt32(position, false);
    return callback(null, headerSize);
}

function readPBFElement(fd, position, size, pbfDecode, callback){
    //var buffer = new Uint8Array(fd, position, size);
    var buffer = new Uint8Array(size);
    buffer.set(new Uint8Array(fd, position, size));

    // async call to avoid flooding the call stack when reading an already
    // loaded ArrayBuffer in the Browser (#30)
    setImmediate(function(){
        buf.readPBFElementFromBuffer(buffer, pbfDecode, callback);
    });
}

function getFileSize(fd, callback){
    return callback(null, fd.byteLength);
}

function get(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.onerror = function(evt) {
        callback(new Error(this.status + ': ' + this.statusText));
    };
    xhr.onload = function(evt) {
        callback(null, this.response);
    };
    xhr.send();
}

function open(opts, callback){
    if (opts.filePath) {
        get(opts.filePath, callback);
    } else if (opts.buffer) {
        callback(null, opts.buffer);
    } else {
        callback(new Error('Use either the "filePath" option to pass an URL'
            + ' or the "buffer" option to pass an ArrayBuffer.'));
    }
}

function close(fd, callback){
    if (callback) {
        callback(null);
    }
}

module.exports = {
    readBlobHeaderSize: readBlobHeaderSize,
    readPBFElement: readPBFElement,
    getFileSize: getFileSize,
    open: open,
    close: close
};

},{"../buffer.js":4,"setimmediate":27}],2:[function(require,module,exports){
var buf = require('../buffer.js');

function readBlobHeaderSize(file, position, size, callback){
    read(file, position, size, function(err, buffer){
        if (err) {
            return callback(err);
        }

        var headerSize = new DataView(buffer).getInt32(0, false);
        return callback(null, headerSize);
    });
}

function readPBFElement(file, position, size, pbfDecode, callback){
    read(file, position, size, function(err, buffer){
        if(err){
            return callback(err);
        }

        buf.readPBFElementFromBuffer(buffer, pbfDecode, callback);
    });    
}

function getFileSize(file, callback){
    return callback(null, file.size);
}

function read(file, position, size, callback){
    var reader, slice;
    
    reader = new FileReader();

    reader.onerror = function(e){
        return callback(new Error('Error reading file (' + reader.error.code + ')'));
    };
    reader.onload = function(e){
        return callback(null, reader.result);
    };

    // Safari still prefixed according to MDN (as of 11/2014)
    // https://developer.mozilla.org/en-US/docs/Web/API/Blob.slice#Browser_compatibility
    if(file.webkitSlice){
        slice = file.webkitSlice(position, position + size);
    } else {
        slice = file.slice(position, position + size);
    }

    reader.readAsArrayBuffer(slice);
}

function open(opts, callback){
    return callback(null, opts.file);
}

function close(file, callback){
    if(callback){
        return callback(null);
    }
}

module.exports = {
    readBlobHeaderSize: readBlobHeaderSize,
    readPBFElement: readPBFElement,
    getFileSize: getFileSize,
    open: open,
    close: close
};

},{"../buffer.js":4}],3:[function(require,module,exports){
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

},{"../../node_modules/zlibjs/bin/inflate.min.js":28}],4:[function(require,module,exports){
function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(buffer));
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer
};

},{}],5:[function(require,module,exports){
var fs = require('fs');
var buf = require('../buffer.js');

function bytesReadFail(callback, expectedBytes, readBytes){
    return callback(new Error('Expected ' + expectedBytes + ' bytes but got ' + readBytes));
}

function readBlobHeaderSize(fd, position, size, callback){
    var buffer;

    buffer = new Buffer(size);

    fs.read(fd, buffer, 0, size, position, function(err, bytesRead, buffer){
        if(bytesRead !== size){
            return bytesReadFail(callback, size, bytesRead);
        }

        return callback(null, buffer.readInt32BE(0));
    });
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

        return buf.readPBFElementFromBuffer(buffer, pbfDecode, callback);
    });
}

function getFileSize(fd, callback){
    fs.fstat(fd, function(err, fdStatus){
        return callback(err, fdStatus.size);
    });
}

function open(opts, callback){
    fs.open(opts.filePath, 'r', callback);
}

function close(fd, callback){
    return fs.close(fd, callback);
}

module.exports = {
    readBlobHeaderSize: readBlobHeaderSize,
    readPBFElement: readPBFElement,
    getFileSize: getFileSize,
    open: open,
    close: close
};

},{"../buffer.js":4,"fs":undefined}],6:[function(require,module,exports){
var zlib = require('zlib');

function inflateBlob(blob, callback){
    zlib.inflate(blob.zlibData, callback);
}

module.exports = {
    inflateBlob: inflateBlob
};
},{"zlib":undefined}],7:[function(require,module,exports){
/*
 * The following little overview extends the osm pbf file structure description
 * from http://wiki.openstreetmap.org/wiki/PBF_Format:
 *
 * - [1] file
 *   - [n] file blocks
 *     - [1] blob header
 *     - [1] blob
 */

var proto = require('./proto');
var buf = require('./buffer.js');

var zlib, reader, arrayBufferReader, fileReader;

// check if running in Browser or Node.js (use self not window because of Web Workers)
if (typeof self !== 'undefined') {
    zlib = require('./browser/zlib.js');
    arrayBufferReader = require('./browser/arrayBufferReader.js');
    fileReader = require('./browser/fileReader.js');
} else {
    zlib = require('./nodejs/zlib.js');
    reader = require('./nodejs/fsReader.js');
}

function parse(opts){
    var paused, resumeCallback, documentEndReached;

    documentEndReached = false;
    paused = false;
    resumeCallback = null;

    createPathParser({
        filePath: opts.filePath,
        buffer: opts.buffer,
        file: opts.file,
        callback: function(err, parser){
            var nextFileBlockIndex;

            function fail(err){
                if( parser ){
                    parser.close();
                }

                return opts.error(err);
            }
            
            if(err){
                return fail(err);
            }

            nextFileBlockIndex = 0;

            function visitNextBlock(){
                var fileBlock;

                if(documentEndReached || paused){
                    return;
                }

                if(nextFileBlockIndex >= parser.fileBlocks.length){
                    documentEndReached = true;

                    parser.close();

                    opts.endDocument();

                    return;
                }

                fileBlock = parser.fileBlocks[nextFileBlockIndex];

                parser.readBlock(fileBlock, function(err, block){
                    if(err){
                        return fail(err);
                    }

                    visitBlock(fileBlock, block, opts);

                    nextFileBlockIndex += 1;

                    visitNextBlock();
                });
            }

            resumeCallback = visitNextBlock;

            visitNextBlock();
        }
    });

    function pause(){
        paused = true;
    }

    function resume(){
        paused = false;

        if(resumeCallback){
            resumeCallback();
        }
    }

    return {
        pause: pause,

        resume: resume
    };
}

function createPathParser(opts){
    reader = getReader(opts);
    reader.open(opts, function(err, fd){
        createFileParser(fd, function(err, parser){
            if(err){
                return opts.callback(err);
            }

            parser.close = function(callback){
                return reader.close(fd, callback);
            };

            return opts.callback(null, parser);
        });
    });
}

function getReader(opts){
    if(!arrayBufferReader){
        // Node.js
        return reader;
    }
    
    if(opts.file){
        return fileReader;
    }
    return arrayBufferReader;
}

function visitBlock(fileBlock, block, opts){
    BLOCK_VISITORS_BY_TYPE[fileBlock.blobHeader.type](block, opts);
}

function visitOSMHeaderBlock(block, opts){
    // TODO
}

function visitOSMDataBlock(block, opts){
    var i;

    for(i = 0; i < block.primitivegroup.length; ++i){
        visitPrimitiveGroup(block.primitivegroup[i], opts);
    }
}

function visitPrimitiveGroup(pg, opts){
    var i;

    // visit nodes
    if(opts.node){
        for(i = 0; i < pg.nodesView.length; ++i){
            opts.node(pg.nodesView.get(i));
        }
    }

    // visit ways
    if(opts.way){
        for(i = 0; i < pg.waysView.length; ++i){
            opts.way(pg.waysView.get(i));
        }
    }

    // visit relations
    if(opts.relation){
        for(i = 0; i < pg.relationsView.length; ++i){
            opts.relation(pg.relationsView.get(i));
        }
    }
}

var BLOCK_VISITORS_BY_TYPE = {
    OSMHeader: visitOSMHeaderBlock,
    OSMData: visitOSMDataBlock
};

var BLOB_HEADER_SIZE_SIZE = 4;

function readBlobHeaderContent(fd, position, size, callback){
    return reader.readPBFElement(fd, position, size, proto.OSMPBF.BlobHeader.decode, callback);
}

function readFileBlock(fd, position, callback){
    reader.readBlobHeaderSize(fd, position, BLOB_HEADER_SIZE_SIZE, function(err, blobHeaderSize){
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
    reader.getFileSize(fd, function(err, fileSize){
        var position, fileBlocks;

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

function getStringTableEntry(i){
    var s, str;

    // decode StringTable entry only once and cache
    if (i in this.cache) {
        str = this.cache[i];
    } else {
        s = this.s[i];

        str = s.toString('utf-8');
        this.cache[i] = str;
    }

    return str;
}

function extendStringTable(st){
    st.cache = {};
    st.getEntry = getStringTableEntry;
}

function createNodesView(pb, pg){
    var length, tagsList, deltaData;

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
            return null;
        }

        keysVals = pg.dense.keysVals;
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

    function collectDeltaData(){
        var i, id, timestamp, changeset, uid, userIndex, deltaDataList, deltaData, lat, lon;

        if(!pg.dense){
            return null;
        }

        id = 0;
        lat = 0;
        lon = 0;

        if(pg.dense.denseinfo){
            timestamp = 0;
            changeset = 0;
            uid = 0;
            userIndex = 0;
        }

        deltaDataList = [];

        for(i = 0; i < length; ++i){
            // TODO we should test wheather adding 64bit numbers works fine with high values
            id += toNumber(pg.dense.id[i]);

            lat += toNumber(pg.dense.lat[i]);
            lon += toNumber(pg.dense.lon[i]);

            deltaData = {
                id: id,
                lat: lat,
                lon: lon
            };

            if(pg.dense.denseinfo){
                // TODO we should test wheather adding 64bit numbers works fine with high values
                timestamp += toNumber(pg.dense.denseinfo.timestamp[i]);
                changeset += toNumber(pg.dense.denseinfo.changeset[i]);

                // TODO we should test wheather adding 64bit numbers works fine with high values
                uid += pg.dense.denseinfo.uid[i];

                userIndex += pg.dense.denseinfo.userSid[i];

                deltaData.timestamp = timestamp * pb.dateGranularity;
                deltaData.changeset = changeset;
                deltaData.uid = uid;
                deltaData.userIndex = userIndex;
            }

            deltaDataList.push(deltaData);
        }

        return deltaDataList;
    }

    deltaData = collectDeltaData();

    function get(i){
        var node, nodeDeltaData;

        nodeDeltaData = deltaData[i];

        node = {
            id: '' + nodeDeltaData.id,
            lat: (toNumber(pb.latOffset) + (pb.granularity * nodeDeltaData.lat)) / 1000000000,
            lon: (toNumber(pb.lonOffset) + (pb.granularity * nodeDeltaData.lon)) / 1000000000,
            tags: tagsList[i]
        };

        if(pg.dense.denseinfo){
            node.version = pg.dense.denseinfo.version[i];
            node.timestamp = nodeDeltaData.timestamp;
            node.changeset = nodeDeltaData.changeset;
            node.uid = '' + nodeDeltaData.uid;
            node.user = pb.stringtable.getEntry(nodeDeltaData.userIndex);
        }

        return node;
    }

    return {
        length: length,
        get: get
    };
}

function createTagsObject(pb, entity){
    var tags, i, len, keyI, valI, key, val;

    tags = {};

    for(i = 0, len = entity.keys.length; i < len; ++i){
        keyI = entity.keys[i];
        valI = entity.vals[i];

        key = pb.stringtable.getEntry(keyI);
        val = pb.stringtable.getEntry(valI);

        tags[key] = val;
    }

    return tags;
}

function addInfo(pb, result, info){
    if (info) {
        if (info.version) {
            result.version = info.version;
        }
        if (info.timestamp) {
            result.timestamp = toNumber(info.timestamp) * pb.dateGranularity;
        }
        if (info.changeset) {
            result.changeset = toNumber(info.changeset);
        }
        if (info.uid) {
            result.uid = '' + info.uid;
        }
        if (info.userSid) {
            result.user = pb.stringtable.getEntry(info.userSid);
        }
    }
}

function createWaysView(pb, pg){
    var length;

    length = pg.ways.length;

    function get(i){
        var way, result, info;

        way = pg.ways[i];

        function createNodeRefIds(){
            var nodeIds, lastRefId, i;

            nodeIds = [];
            lastRefId = 0;

            for(i = 0; i < way.refs.length; ++i){
                // TODO we should test wheather adding 64bit numbers works fine with high values
                lastRefId += toNumber(way.refs[i]);

                nodeIds.push('' + lastRefId);
            }

            return nodeIds;
        }

        result = {
            id: way.id.toString(),
            tags: createTagsObject(pb, way),
            nodeRefs: createNodeRefIds()
        };

        addInfo(pb, result, way.info);

        return result;
    }

    return {
        length: length,
        get: get
    };
}

function createRelationsView(pb, pg){
    var length;

    length = pg.relations.length;

    function get(i){
        var relation, result, info;

        relation = pg.relations[i];

        function createMembers(){
            var members, memberObj, lastRefId, i, MemberType, type;

            MemberType = proto.OSMPBF.Relation.MemberType;
            members = [];
            lastRefId = 0;

            for(i = 0; i < relation.memids.length; ++i){
                memberObj = {};

                // TODO we should test wheather adding 64bit numbers works fine with high values
                lastRefId += toNumber(relation.memids[i]);
                memberObj.ref = '' + lastRefId;

                memberObj.role = pb.stringtable.getEntry(relation.rolesSid[i]);

                type = relation.types[i];
                if (MemberType.NODE === type) {
                    memberObj.type = 'node';
                } else if(MemberType.WAY === type) {
                    memberObj.type = 'way';
                } else if(MemberType.RELATION === type) {
                    memberObj.type = 'relation';
                }

                members.push(memberObj);
            }

            return members;
        }

        result = {
            id: relation.id.toString(),
            tags: createTagsObject(pb, relation),
            members: createMembers()
        };

        addInfo(pb, result, relation.info);

        return result;
    }

    return {
        length: length,
        get: get
    };
}

function toNumber(x){
    return typeof(x) === 'number' ? x : x.toNumber();
}

function extendPrimitiveGroup(pb, pg){
    pg.nodesView = createNodesView(pb, pg);
    pg.waysView = createWaysView(pb, pg);
    pg.relationsView = createRelationsView(pb, pg);
}

function decodePrimitiveBlock(buffer){
    var data, i;

    data = proto.OSMPBF.PrimitiveBlock.decode(buffer);

    // extend stringtable
    extendStringTable(data.stringtable);

    // extend primitivegroup
    for(i = 0; i < data.primitivegroup.length; ++i){
        extendPrimitiveGroup(data, data.primitivegroup[i]);
    }

    return data;
}

var OSM_BLOB_DECODER_BY_TYPE = {
    'OSMHeader': proto.OSMPBF.HeaderBlock.decode,
    'OSMData': decodePrimitiveBlock
};

function createFileParser(fd, callback){
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
            return reader.readPBFElement(fd, fileBlock.blobHeader.position, fileBlock.blobHeader.datasize, proto.OSMPBF.Blob.decode, callback);
        }

        function readBlock(fileBlock, callback){
            return readBlob(fileBlock, function(err, blob){
                if(err){
                    return callback(err);
                }

                if(blob.rawSize === 0){
                    return callback('Uncompressed pbfs are currently not supported.');
                }

                zlib.inflateBlob(blob, function(err, data){
                    if(err){
                        return callback(err);
                    }

                    return buf.readPBFElementFromBuffer(data, OSM_BLOB_DECODER_BY_TYPE[fileBlock.blobHeader.type], callback);
                });
            });
        }

        return callback(null, {
            fileBlocks: fileBlocks,
            
            findFileBlocksByBlobType: findFileBlocksByBlobType,

            readBlock: readBlock
        });
    });
}

module.exports = {
    parse: parse,

    createParser: createPathParser
};

},{"./browser/arrayBufferReader.js":1,"./browser/fileReader.js":2,"./browser/zlib.js":3,"./buffer.js":4,"./nodejs/fsReader.js":5,"./nodejs/zlib.js":6,"./proto":8}],8:[function(require,module,exports){
/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
"use strict";

var $protobuf = require("protobufjs/minimal");

// Common aliases
var $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
var $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

$root.OSMPBF = (function() {

    /**
     * Namespace OSMPBF.
     * @exports OSMPBF
     * @namespace
     */
    var OSMPBF = {};

    OSMPBF.Blob = (function() {

        /**
         * Properties of a Blob.
         * @memberof OSMPBF
         * @interface IBlob
         * @property {Uint8Array|null} [raw] Blob raw
         * @property {number|null} [rawSize] Blob rawSize
         * @property {Uint8Array|null} [zlibData] Blob zlibData
         * @property {Uint8Array|null} [lzmaData] Blob lzmaData
         * @property {Uint8Array|null} [OBSOLETEBzip2Data] Blob OBSOLETEBzip2Data
         */

        /**
         * Constructs a new Blob.
         * @memberof OSMPBF
         * @classdesc Represents a Blob.
         * @implements IBlob
         * @constructor
         * @param {OSMPBF.IBlob=} [properties] Properties to set
         */
        function Blob(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Blob raw.
         * @member {Uint8Array} raw
         * @memberof OSMPBF.Blob
         * @instance
         */
        Blob.prototype.raw = $util.newBuffer([]);

        /**
         * Blob rawSize.
         * @member {number} rawSize
         * @memberof OSMPBF.Blob
         * @instance
         */
        Blob.prototype.rawSize = 0;

        /**
         * Blob zlibData.
         * @member {Uint8Array} zlibData
         * @memberof OSMPBF.Blob
         * @instance
         */
        Blob.prototype.zlibData = $util.newBuffer([]);

        /**
         * Blob lzmaData.
         * @member {Uint8Array} lzmaData
         * @memberof OSMPBF.Blob
         * @instance
         */
        Blob.prototype.lzmaData = $util.newBuffer([]);

        /**
         * Blob OBSOLETEBzip2Data.
         * @member {Uint8Array} OBSOLETEBzip2Data
         * @memberof OSMPBF.Blob
         * @instance
         */
        Blob.prototype.OBSOLETEBzip2Data = $util.newBuffer([]);

        /**
         * Creates a new Blob instance using the specified properties.
         * @function create
         * @memberof OSMPBF.Blob
         * @static
         * @param {OSMPBF.IBlob=} [properties] Properties to set
         * @returns {OSMPBF.Blob} Blob instance
         */
        Blob.create = function create(properties) {
            return new Blob(properties);
        };

        /**
         * Encodes the specified Blob message. Does not implicitly {@link OSMPBF.Blob.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.Blob
         * @static
         * @param {OSMPBF.IBlob} message Blob message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Blob.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.raw != null && message.hasOwnProperty("raw"))
                writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.raw);
            if (message.rawSize != null && message.hasOwnProperty("rawSize"))
                writer.uint32(/* id 2, wireType 0 =*/16).int32(message.rawSize);
            if (message.zlibData != null && message.hasOwnProperty("zlibData"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.zlibData);
            if (message.lzmaData != null && message.hasOwnProperty("lzmaData"))
                writer.uint32(/* id 4, wireType 2 =*/34).bytes(message.lzmaData);
            if (message.OBSOLETEBzip2Data != null && message.hasOwnProperty("OBSOLETEBzip2Data"))
                writer.uint32(/* id 5, wireType 2 =*/42).bytes(message.OBSOLETEBzip2Data);
            return writer;
        };

        /**
         * Encodes the specified Blob message, length delimited. Does not implicitly {@link OSMPBF.Blob.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.Blob
         * @static
         * @param {OSMPBF.IBlob} message Blob message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Blob.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Blob message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.Blob
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.Blob} Blob
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Blob.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.Blob();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.raw = reader.bytes();
                    break;
                case 2:
                    message.rawSize = reader.int32();
                    break;
                case 3:
                    message.zlibData = reader.bytes();
                    break;
                case 4:
                    message.lzmaData = reader.bytes();
                    break;
                case 5:
                    message.OBSOLETEBzip2Data = reader.bytes();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Blob message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.Blob
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.Blob} Blob
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Blob.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Blob message.
         * @function verify
         * @memberof OSMPBF.Blob
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Blob.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.raw != null && message.hasOwnProperty("raw"))
                if (!(message.raw && typeof message.raw.length === "number" || $util.isString(message.raw)))
                    return "raw: buffer expected";
            if (message.rawSize != null && message.hasOwnProperty("rawSize"))
                if (!$util.isInteger(message.rawSize))
                    return "rawSize: integer expected";
            if (message.zlibData != null && message.hasOwnProperty("zlibData"))
                if (!(message.zlibData && typeof message.zlibData.length === "number" || $util.isString(message.zlibData)))
                    return "zlibData: buffer expected";
            if (message.lzmaData != null && message.hasOwnProperty("lzmaData"))
                if (!(message.lzmaData && typeof message.lzmaData.length === "number" || $util.isString(message.lzmaData)))
                    return "lzmaData: buffer expected";
            if (message.OBSOLETEBzip2Data != null && message.hasOwnProperty("OBSOLETEBzip2Data"))
                if (!(message.OBSOLETEBzip2Data && typeof message.OBSOLETEBzip2Data.length === "number" || $util.isString(message.OBSOLETEBzip2Data)))
                    return "OBSOLETEBzip2Data: buffer expected";
            return null;
        };

        /**
         * Creates a Blob message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.Blob
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.Blob} Blob
         */
        Blob.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.Blob)
                return object;
            var message = new $root.OSMPBF.Blob();
            if (object.raw != null)
                if (typeof object.raw === "string")
                    $util.base64.decode(object.raw, message.raw = $util.newBuffer($util.base64.length(object.raw)), 0);
                else if (object.raw.length)
                    message.raw = object.raw;
            if (object.rawSize != null)
                message.rawSize = object.rawSize | 0;
            if (object.zlibData != null)
                if (typeof object.zlibData === "string")
                    $util.base64.decode(object.zlibData, message.zlibData = $util.newBuffer($util.base64.length(object.zlibData)), 0);
                else if (object.zlibData.length)
                    message.zlibData = object.zlibData;
            if (object.lzmaData != null)
                if (typeof object.lzmaData === "string")
                    $util.base64.decode(object.lzmaData, message.lzmaData = $util.newBuffer($util.base64.length(object.lzmaData)), 0);
                else if (object.lzmaData.length)
                    message.lzmaData = object.lzmaData;
            if (object.OBSOLETEBzip2Data != null)
                if (typeof object.OBSOLETEBzip2Data === "string")
                    $util.base64.decode(object.OBSOLETEBzip2Data, message.OBSOLETEBzip2Data = $util.newBuffer($util.base64.length(object.OBSOLETEBzip2Data)), 0);
                else if (object.OBSOLETEBzip2Data.length)
                    message.OBSOLETEBzip2Data = object.OBSOLETEBzip2Data;
            return message;
        };

        /**
         * Creates a plain object from a Blob message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.Blob
         * @static
         * @param {OSMPBF.Blob} message Blob
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Blob.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if (options.bytes === String)
                    object.raw = "";
                else {
                    object.raw = [];
                    if (options.bytes !== Array)
                        object.raw = $util.newBuffer(object.raw);
                }
                object.rawSize = 0;
                if (options.bytes === String)
                    object.zlibData = "";
                else {
                    object.zlibData = [];
                    if (options.bytes !== Array)
                        object.zlibData = $util.newBuffer(object.zlibData);
                }
                if (options.bytes === String)
                    object.lzmaData = "";
                else {
                    object.lzmaData = [];
                    if (options.bytes !== Array)
                        object.lzmaData = $util.newBuffer(object.lzmaData);
                }
                if (options.bytes === String)
                    object.OBSOLETEBzip2Data = "";
                else {
                    object.OBSOLETEBzip2Data = [];
                    if (options.bytes !== Array)
                        object.OBSOLETEBzip2Data = $util.newBuffer(object.OBSOLETEBzip2Data);
                }
            }
            if (message.raw != null && message.hasOwnProperty("raw"))
                object.raw = options.bytes === String ? $util.base64.encode(message.raw, 0, message.raw.length) : options.bytes === Array ? Array.prototype.slice.call(message.raw) : message.raw;
            if (message.rawSize != null && message.hasOwnProperty("rawSize"))
                object.rawSize = message.rawSize;
            if (message.zlibData != null && message.hasOwnProperty("zlibData"))
                object.zlibData = options.bytes === String ? $util.base64.encode(message.zlibData, 0, message.zlibData.length) : options.bytes === Array ? Array.prototype.slice.call(message.zlibData) : message.zlibData;
            if (message.lzmaData != null && message.hasOwnProperty("lzmaData"))
                object.lzmaData = options.bytes === String ? $util.base64.encode(message.lzmaData, 0, message.lzmaData.length) : options.bytes === Array ? Array.prototype.slice.call(message.lzmaData) : message.lzmaData;
            if (message.OBSOLETEBzip2Data != null && message.hasOwnProperty("OBSOLETEBzip2Data"))
                object.OBSOLETEBzip2Data = options.bytes === String ? $util.base64.encode(message.OBSOLETEBzip2Data, 0, message.OBSOLETEBzip2Data.length) : options.bytes === Array ? Array.prototype.slice.call(message.OBSOLETEBzip2Data) : message.OBSOLETEBzip2Data;
            return object;
        };

        /**
         * Converts this Blob to JSON.
         * @function toJSON
         * @memberof OSMPBF.Blob
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Blob.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Blob;
    })();

    OSMPBF.BlobHeader = (function() {

        /**
         * Properties of a BlobHeader.
         * @memberof OSMPBF
         * @interface IBlobHeader
         * @property {string} type BlobHeader type
         * @property {Uint8Array|null} [indexdata] BlobHeader indexdata
         * @property {number} datasize BlobHeader datasize
         */

        /**
         * Constructs a new BlobHeader.
         * @memberof OSMPBF
         * @classdesc Represents a BlobHeader.
         * @implements IBlobHeader
         * @constructor
         * @param {OSMPBF.IBlobHeader=} [properties] Properties to set
         */
        function BlobHeader(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * BlobHeader type.
         * @member {string} type
         * @memberof OSMPBF.BlobHeader
         * @instance
         */
        BlobHeader.prototype.type = "";

        /**
         * BlobHeader indexdata.
         * @member {Uint8Array} indexdata
         * @memberof OSMPBF.BlobHeader
         * @instance
         */
        BlobHeader.prototype.indexdata = $util.newBuffer([]);

        /**
         * BlobHeader datasize.
         * @member {number} datasize
         * @memberof OSMPBF.BlobHeader
         * @instance
         */
        BlobHeader.prototype.datasize = 0;

        /**
         * Creates a new BlobHeader instance using the specified properties.
         * @function create
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {OSMPBF.IBlobHeader=} [properties] Properties to set
         * @returns {OSMPBF.BlobHeader} BlobHeader instance
         */
        BlobHeader.create = function create(properties) {
            return new BlobHeader(properties);
        };

        /**
         * Encodes the specified BlobHeader message. Does not implicitly {@link OSMPBF.BlobHeader.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {OSMPBF.IBlobHeader} message BlobHeader message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobHeader.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 2 =*/10).string(message.type);
            if (message.indexdata != null && message.hasOwnProperty("indexdata"))
                writer.uint32(/* id 2, wireType 2 =*/18).bytes(message.indexdata);
            writer.uint32(/* id 3, wireType 0 =*/24).int32(message.datasize);
            return writer;
        };

        /**
         * Encodes the specified BlobHeader message, length delimited. Does not implicitly {@link OSMPBF.BlobHeader.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {OSMPBF.IBlobHeader} message BlobHeader message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        BlobHeader.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a BlobHeader message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.BlobHeader} BlobHeader
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobHeader.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.BlobHeader();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.type = reader.string();
                    break;
                case 2:
                    message.indexdata = reader.bytes();
                    break;
                case 3:
                    message.datasize = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("type"))
                throw $util.ProtocolError("missing required 'type'", { instance: message });
            if (!message.hasOwnProperty("datasize"))
                throw $util.ProtocolError("missing required 'datasize'", { instance: message });
            return message;
        };

        /**
         * Decodes a BlobHeader message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.BlobHeader} BlobHeader
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        BlobHeader.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a BlobHeader message.
         * @function verify
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        BlobHeader.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isString(message.type))
                return "type: string expected";
            if (message.indexdata != null && message.hasOwnProperty("indexdata"))
                if (!(message.indexdata && typeof message.indexdata.length === "number" || $util.isString(message.indexdata)))
                    return "indexdata: buffer expected";
            if (!$util.isInteger(message.datasize))
                return "datasize: integer expected";
            return null;
        };

        /**
         * Creates a BlobHeader message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.BlobHeader} BlobHeader
         */
        BlobHeader.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.BlobHeader)
                return object;
            var message = new $root.OSMPBF.BlobHeader();
            if (object.type != null)
                message.type = String(object.type);
            if (object.indexdata != null)
                if (typeof object.indexdata === "string")
                    $util.base64.decode(object.indexdata, message.indexdata = $util.newBuffer($util.base64.length(object.indexdata)), 0);
                else if (object.indexdata.length)
                    message.indexdata = object.indexdata;
            if (object.datasize != null)
                message.datasize = object.datasize | 0;
            return message;
        };

        /**
         * Creates a plain object from a BlobHeader message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.BlobHeader
         * @static
         * @param {OSMPBF.BlobHeader} message BlobHeader
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        BlobHeader.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.type = "";
                if (options.bytes === String)
                    object.indexdata = "";
                else {
                    object.indexdata = [];
                    if (options.bytes !== Array)
                        object.indexdata = $util.newBuffer(object.indexdata);
                }
                object.datasize = 0;
            }
            if (message.type != null && message.hasOwnProperty("type"))
                object.type = message.type;
            if (message.indexdata != null && message.hasOwnProperty("indexdata"))
                object.indexdata = options.bytes === String ? $util.base64.encode(message.indexdata, 0, message.indexdata.length) : options.bytes === Array ? Array.prototype.slice.call(message.indexdata) : message.indexdata;
            if (message.datasize != null && message.hasOwnProperty("datasize"))
                object.datasize = message.datasize;
            return object;
        };

        /**
         * Converts this BlobHeader to JSON.
         * @function toJSON
         * @memberof OSMPBF.BlobHeader
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        BlobHeader.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return BlobHeader;
    })();

    OSMPBF.HeaderBlock = (function() {

        /**
         * Properties of a HeaderBlock.
         * @memberof OSMPBF
         * @interface IHeaderBlock
         * @property {OSMPBF.IHeaderBBox|null} [bbox] HeaderBlock bbox
         * @property {Array.<string>|null} [requiredFeatures] HeaderBlock requiredFeatures
         * @property {Array.<string>|null} [optionalFeatures] HeaderBlock optionalFeatures
         * @property {string|null} [writingprogram] HeaderBlock writingprogram
         * @property {string|null} [source] HeaderBlock source
         * @property {number|Long|null} [osmosisReplicationTimestamp] HeaderBlock osmosisReplicationTimestamp
         * @property {number|Long|null} [osmosisReplicationSequenceNumber] HeaderBlock osmosisReplicationSequenceNumber
         * @property {string|null} [osmosisReplicationBaseUrl] HeaderBlock osmosisReplicationBaseUrl
         */

        /**
         * Constructs a new HeaderBlock.
         * @memberof OSMPBF
         * @classdesc Represents a HeaderBlock.
         * @implements IHeaderBlock
         * @constructor
         * @param {OSMPBF.IHeaderBlock=} [properties] Properties to set
         */
        function HeaderBlock(properties) {
            this.requiredFeatures = [];
            this.optionalFeatures = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * HeaderBlock bbox.
         * @member {OSMPBF.IHeaderBBox|null|undefined} bbox
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.bbox = null;

        /**
         * HeaderBlock requiredFeatures.
         * @member {Array.<string>} requiredFeatures
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.requiredFeatures = $util.emptyArray;

        /**
         * HeaderBlock optionalFeatures.
         * @member {Array.<string>} optionalFeatures
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.optionalFeatures = $util.emptyArray;

        /**
         * HeaderBlock writingprogram.
         * @member {string} writingprogram
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.writingprogram = "";

        /**
         * HeaderBlock source.
         * @member {string} source
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.source = "";

        /**
         * HeaderBlock osmosisReplicationTimestamp.
         * @member {number|Long} osmosisReplicationTimestamp
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.osmosisReplicationTimestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * HeaderBlock osmosisReplicationSequenceNumber.
         * @member {number|Long} osmosisReplicationSequenceNumber
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.osmosisReplicationSequenceNumber = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * HeaderBlock osmosisReplicationBaseUrl.
         * @member {string} osmosisReplicationBaseUrl
         * @memberof OSMPBF.HeaderBlock
         * @instance
         */
        HeaderBlock.prototype.osmosisReplicationBaseUrl = "";

        /**
         * Creates a new HeaderBlock instance using the specified properties.
         * @function create
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {OSMPBF.IHeaderBlock=} [properties] Properties to set
         * @returns {OSMPBF.HeaderBlock} HeaderBlock instance
         */
        HeaderBlock.create = function create(properties) {
            return new HeaderBlock(properties);
        };

        /**
         * Encodes the specified HeaderBlock message. Does not implicitly {@link OSMPBF.HeaderBlock.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {OSMPBF.IHeaderBlock} message HeaderBlock message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HeaderBlock.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.bbox != null && message.hasOwnProperty("bbox"))
                $root.OSMPBF.HeaderBBox.encode(message.bbox, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.requiredFeatures != null && message.requiredFeatures.length)
                for (var i = 0; i < message.requiredFeatures.length; ++i)
                    writer.uint32(/* id 4, wireType 2 =*/34).string(message.requiredFeatures[i]);
            if (message.optionalFeatures != null && message.optionalFeatures.length)
                for (var i = 0; i < message.optionalFeatures.length; ++i)
                    writer.uint32(/* id 5, wireType 2 =*/42).string(message.optionalFeatures[i]);
            if (message.writingprogram != null && message.hasOwnProperty("writingprogram"))
                writer.uint32(/* id 16, wireType 2 =*/130).string(message.writingprogram);
            if (message.source != null && message.hasOwnProperty("source"))
                writer.uint32(/* id 17, wireType 2 =*/138).string(message.source);
            if (message.osmosisReplicationTimestamp != null && message.hasOwnProperty("osmosisReplicationTimestamp"))
                writer.uint32(/* id 32, wireType 0 =*/256).int64(message.osmosisReplicationTimestamp);
            if (message.osmosisReplicationSequenceNumber != null && message.hasOwnProperty("osmosisReplicationSequenceNumber"))
                writer.uint32(/* id 33, wireType 0 =*/264).int64(message.osmosisReplicationSequenceNumber);
            if (message.osmosisReplicationBaseUrl != null && message.hasOwnProperty("osmosisReplicationBaseUrl"))
                writer.uint32(/* id 34, wireType 2 =*/274).string(message.osmosisReplicationBaseUrl);
            return writer;
        };

        /**
         * Encodes the specified HeaderBlock message, length delimited. Does not implicitly {@link OSMPBF.HeaderBlock.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {OSMPBF.IHeaderBlock} message HeaderBlock message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HeaderBlock.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HeaderBlock message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.HeaderBlock} HeaderBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HeaderBlock.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.HeaderBlock();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.bbox = $root.OSMPBF.HeaderBBox.decode(reader, reader.uint32());
                    break;
                case 4:
                    if (!(message.requiredFeatures && message.requiredFeatures.length))
                        message.requiredFeatures = [];
                    message.requiredFeatures.push(reader.string());
                    break;
                case 5:
                    if (!(message.optionalFeatures && message.optionalFeatures.length))
                        message.optionalFeatures = [];
                    message.optionalFeatures.push(reader.string());
                    break;
                case 16:
                    message.writingprogram = reader.string();
                    break;
                case 17:
                    message.source = reader.string();
                    break;
                case 32:
                    message.osmosisReplicationTimestamp = reader.int64();
                    break;
                case 33:
                    message.osmosisReplicationSequenceNumber = reader.int64();
                    break;
                case 34:
                    message.osmosisReplicationBaseUrl = reader.string();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a HeaderBlock message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.HeaderBlock} HeaderBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HeaderBlock.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HeaderBlock message.
         * @function verify
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HeaderBlock.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.bbox != null && message.hasOwnProperty("bbox")) {
                var error = $root.OSMPBF.HeaderBBox.verify(message.bbox);
                if (error)
                    return "bbox." + error;
            }
            if (message.requiredFeatures != null && message.hasOwnProperty("requiredFeatures")) {
                if (!Array.isArray(message.requiredFeatures))
                    return "requiredFeatures: array expected";
                for (var i = 0; i < message.requiredFeatures.length; ++i)
                    if (!$util.isString(message.requiredFeatures[i]))
                        return "requiredFeatures: string[] expected";
            }
            if (message.optionalFeatures != null && message.hasOwnProperty("optionalFeatures")) {
                if (!Array.isArray(message.optionalFeatures))
                    return "optionalFeatures: array expected";
                for (var i = 0; i < message.optionalFeatures.length; ++i)
                    if (!$util.isString(message.optionalFeatures[i]))
                        return "optionalFeatures: string[] expected";
            }
            if (message.writingprogram != null && message.hasOwnProperty("writingprogram"))
                if (!$util.isString(message.writingprogram))
                    return "writingprogram: string expected";
            if (message.source != null && message.hasOwnProperty("source"))
                if (!$util.isString(message.source))
                    return "source: string expected";
            if (message.osmosisReplicationTimestamp != null && message.hasOwnProperty("osmosisReplicationTimestamp"))
                if (!$util.isInteger(message.osmosisReplicationTimestamp) && !(message.osmosisReplicationTimestamp && $util.isInteger(message.osmosisReplicationTimestamp.low) && $util.isInteger(message.osmosisReplicationTimestamp.high)))
                    return "osmosisReplicationTimestamp: integer|Long expected";
            if (message.osmosisReplicationSequenceNumber != null && message.hasOwnProperty("osmosisReplicationSequenceNumber"))
                if (!$util.isInteger(message.osmosisReplicationSequenceNumber) && !(message.osmosisReplicationSequenceNumber && $util.isInteger(message.osmosisReplicationSequenceNumber.low) && $util.isInteger(message.osmosisReplicationSequenceNumber.high)))
                    return "osmosisReplicationSequenceNumber: integer|Long expected";
            if (message.osmosisReplicationBaseUrl != null && message.hasOwnProperty("osmosisReplicationBaseUrl"))
                if (!$util.isString(message.osmosisReplicationBaseUrl))
                    return "osmosisReplicationBaseUrl: string expected";
            return null;
        };

        /**
         * Creates a HeaderBlock message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.HeaderBlock} HeaderBlock
         */
        HeaderBlock.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.HeaderBlock)
                return object;
            var message = new $root.OSMPBF.HeaderBlock();
            if (object.bbox != null) {
                if (typeof object.bbox !== "object")
                    throw TypeError(".OSMPBF.HeaderBlock.bbox: object expected");
                message.bbox = $root.OSMPBF.HeaderBBox.fromObject(object.bbox);
            }
            if (object.requiredFeatures) {
                if (!Array.isArray(object.requiredFeatures))
                    throw TypeError(".OSMPBF.HeaderBlock.requiredFeatures: array expected");
                message.requiredFeatures = [];
                for (var i = 0; i < object.requiredFeatures.length; ++i)
                    message.requiredFeatures[i] = String(object.requiredFeatures[i]);
            }
            if (object.optionalFeatures) {
                if (!Array.isArray(object.optionalFeatures))
                    throw TypeError(".OSMPBF.HeaderBlock.optionalFeatures: array expected");
                message.optionalFeatures = [];
                for (var i = 0; i < object.optionalFeatures.length; ++i)
                    message.optionalFeatures[i] = String(object.optionalFeatures[i]);
            }
            if (object.writingprogram != null)
                message.writingprogram = String(object.writingprogram);
            if (object.source != null)
                message.source = String(object.source);
            if (object.osmosisReplicationTimestamp != null)
                if ($util.Long)
                    (message.osmosisReplicationTimestamp = $util.Long.fromValue(object.osmosisReplicationTimestamp)).unsigned = false;
                else if (typeof object.osmosisReplicationTimestamp === "string")
                    message.osmosisReplicationTimestamp = parseInt(object.osmosisReplicationTimestamp, 10);
                else if (typeof object.osmosisReplicationTimestamp === "number")
                    message.osmosisReplicationTimestamp = object.osmosisReplicationTimestamp;
                else if (typeof object.osmosisReplicationTimestamp === "object")
                    message.osmosisReplicationTimestamp = new $util.LongBits(object.osmosisReplicationTimestamp.low >>> 0, object.osmosisReplicationTimestamp.high >>> 0).toNumber();
            if (object.osmosisReplicationSequenceNumber != null)
                if ($util.Long)
                    (message.osmosisReplicationSequenceNumber = $util.Long.fromValue(object.osmosisReplicationSequenceNumber)).unsigned = false;
                else if (typeof object.osmosisReplicationSequenceNumber === "string")
                    message.osmosisReplicationSequenceNumber = parseInt(object.osmosisReplicationSequenceNumber, 10);
                else if (typeof object.osmosisReplicationSequenceNumber === "number")
                    message.osmosisReplicationSequenceNumber = object.osmosisReplicationSequenceNumber;
                else if (typeof object.osmosisReplicationSequenceNumber === "object")
                    message.osmosisReplicationSequenceNumber = new $util.LongBits(object.osmosisReplicationSequenceNumber.low >>> 0, object.osmosisReplicationSequenceNumber.high >>> 0).toNumber();
            if (object.osmosisReplicationBaseUrl != null)
                message.osmosisReplicationBaseUrl = String(object.osmosisReplicationBaseUrl);
            return message;
        };

        /**
         * Creates a plain object from a HeaderBlock message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.HeaderBlock
         * @static
         * @param {OSMPBF.HeaderBlock} message HeaderBlock
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HeaderBlock.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.requiredFeatures = [];
                object.optionalFeatures = [];
            }
            if (options.defaults) {
                object.bbox = null;
                object.writingprogram = "";
                object.source = "";
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.osmosisReplicationTimestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.osmosisReplicationTimestamp = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.osmosisReplicationSequenceNumber = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.osmosisReplicationSequenceNumber = options.longs === String ? "0" : 0;
                object.osmosisReplicationBaseUrl = "";
            }
            if (message.bbox != null && message.hasOwnProperty("bbox"))
                object.bbox = $root.OSMPBF.HeaderBBox.toObject(message.bbox, options);
            if (message.requiredFeatures && message.requiredFeatures.length) {
                object.requiredFeatures = [];
                for (var j = 0; j < message.requiredFeatures.length; ++j)
                    object.requiredFeatures[j] = message.requiredFeatures[j];
            }
            if (message.optionalFeatures && message.optionalFeatures.length) {
                object.optionalFeatures = [];
                for (var j = 0; j < message.optionalFeatures.length; ++j)
                    object.optionalFeatures[j] = message.optionalFeatures[j];
            }
            if (message.writingprogram != null && message.hasOwnProperty("writingprogram"))
                object.writingprogram = message.writingprogram;
            if (message.source != null && message.hasOwnProperty("source"))
                object.source = message.source;
            if (message.osmosisReplicationTimestamp != null && message.hasOwnProperty("osmosisReplicationTimestamp"))
                if (typeof message.osmosisReplicationTimestamp === "number")
                    object.osmosisReplicationTimestamp = options.longs === String ? String(message.osmosisReplicationTimestamp) : message.osmosisReplicationTimestamp;
                else
                    object.osmosisReplicationTimestamp = options.longs === String ? $util.Long.prototype.toString.call(message.osmosisReplicationTimestamp) : options.longs === Number ? new $util.LongBits(message.osmosisReplicationTimestamp.low >>> 0, message.osmosisReplicationTimestamp.high >>> 0).toNumber() : message.osmosisReplicationTimestamp;
            if (message.osmosisReplicationSequenceNumber != null && message.hasOwnProperty("osmosisReplicationSequenceNumber"))
                if (typeof message.osmosisReplicationSequenceNumber === "number")
                    object.osmosisReplicationSequenceNumber = options.longs === String ? String(message.osmosisReplicationSequenceNumber) : message.osmosisReplicationSequenceNumber;
                else
                    object.osmosisReplicationSequenceNumber = options.longs === String ? $util.Long.prototype.toString.call(message.osmosisReplicationSequenceNumber) : options.longs === Number ? new $util.LongBits(message.osmosisReplicationSequenceNumber.low >>> 0, message.osmosisReplicationSequenceNumber.high >>> 0).toNumber() : message.osmosisReplicationSequenceNumber;
            if (message.osmosisReplicationBaseUrl != null && message.hasOwnProperty("osmosisReplicationBaseUrl"))
                object.osmosisReplicationBaseUrl = message.osmosisReplicationBaseUrl;
            return object;
        };

        /**
         * Converts this HeaderBlock to JSON.
         * @function toJSON
         * @memberof OSMPBF.HeaderBlock
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HeaderBlock.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return HeaderBlock;
    })();

    OSMPBF.HeaderBBox = (function() {

        /**
         * Properties of a HeaderBBox.
         * @memberof OSMPBF
         * @interface IHeaderBBox
         * @property {number|Long} left HeaderBBox left
         * @property {number|Long} right HeaderBBox right
         * @property {number|Long} top HeaderBBox top
         * @property {number|Long} bottom HeaderBBox bottom
         */

        /**
         * Constructs a new HeaderBBox.
         * @memberof OSMPBF
         * @classdesc Represents a HeaderBBox.
         * @implements IHeaderBBox
         * @constructor
         * @param {OSMPBF.IHeaderBBox=} [properties] Properties to set
         */
        function HeaderBBox(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * HeaderBBox left.
         * @member {number|Long} left
         * @memberof OSMPBF.HeaderBBox
         * @instance
         */
        HeaderBBox.prototype.left = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * HeaderBBox right.
         * @member {number|Long} right
         * @memberof OSMPBF.HeaderBBox
         * @instance
         */
        HeaderBBox.prototype.right = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * HeaderBBox top.
         * @member {number|Long} top
         * @memberof OSMPBF.HeaderBBox
         * @instance
         */
        HeaderBBox.prototype.top = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * HeaderBBox bottom.
         * @member {number|Long} bottom
         * @memberof OSMPBF.HeaderBBox
         * @instance
         */
        HeaderBBox.prototype.bottom = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new HeaderBBox instance using the specified properties.
         * @function create
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {OSMPBF.IHeaderBBox=} [properties] Properties to set
         * @returns {OSMPBF.HeaderBBox} HeaderBBox instance
         */
        HeaderBBox.create = function create(properties) {
            return new HeaderBBox(properties);
        };

        /**
         * Encodes the specified HeaderBBox message. Does not implicitly {@link OSMPBF.HeaderBBox.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {OSMPBF.IHeaderBBox} message HeaderBBox message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HeaderBBox.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 0 =*/8).sint64(message.left);
            writer.uint32(/* id 2, wireType 0 =*/16).sint64(message.right);
            writer.uint32(/* id 3, wireType 0 =*/24).sint64(message.top);
            writer.uint32(/* id 4, wireType 0 =*/32).sint64(message.bottom);
            return writer;
        };

        /**
         * Encodes the specified HeaderBBox message, length delimited. Does not implicitly {@link OSMPBF.HeaderBBox.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {OSMPBF.IHeaderBBox} message HeaderBBox message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        HeaderBBox.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a HeaderBBox message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.HeaderBBox} HeaderBBox
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HeaderBBox.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.HeaderBBox();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.left = reader.sint64();
                    break;
                case 2:
                    message.right = reader.sint64();
                    break;
                case 3:
                    message.top = reader.sint64();
                    break;
                case 4:
                    message.bottom = reader.sint64();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("left"))
                throw $util.ProtocolError("missing required 'left'", { instance: message });
            if (!message.hasOwnProperty("right"))
                throw $util.ProtocolError("missing required 'right'", { instance: message });
            if (!message.hasOwnProperty("top"))
                throw $util.ProtocolError("missing required 'top'", { instance: message });
            if (!message.hasOwnProperty("bottom"))
                throw $util.ProtocolError("missing required 'bottom'", { instance: message });
            return message;
        };

        /**
         * Decodes a HeaderBBox message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.HeaderBBox} HeaderBBox
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        HeaderBBox.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a HeaderBBox message.
         * @function verify
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        HeaderBBox.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isInteger(message.left) && !(message.left && $util.isInteger(message.left.low) && $util.isInteger(message.left.high)))
                return "left: integer|Long expected";
            if (!$util.isInteger(message.right) && !(message.right && $util.isInteger(message.right.low) && $util.isInteger(message.right.high)))
                return "right: integer|Long expected";
            if (!$util.isInteger(message.top) && !(message.top && $util.isInteger(message.top.low) && $util.isInteger(message.top.high)))
                return "top: integer|Long expected";
            if (!$util.isInteger(message.bottom) && !(message.bottom && $util.isInteger(message.bottom.low) && $util.isInteger(message.bottom.high)))
                return "bottom: integer|Long expected";
            return null;
        };

        /**
         * Creates a HeaderBBox message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.HeaderBBox} HeaderBBox
         */
        HeaderBBox.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.HeaderBBox)
                return object;
            var message = new $root.OSMPBF.HeaderBBox();
            if (object.left != null)
                if ($util.Long)
                    (message.left = $util.Long.fromValue(object.left)).unsigned = false;
                else if (typeof object.left === "string")
                    message.left = parseInt(object.left, 10);
                else if (typeof object.left === "number")
                    message.left = object.left;
                else if (typeof object.left === "object")
                    message.left = new $util.LongBits(object.left.low >>> 0, object.left.high >>> 0).toNumber();
            if (object.right != null)
                if ($util.Long)
                    (message.right = $util.Long.fromValue(object.right)).unsigned = false;
                else if (typeof object.right === "string")
                    message.right = parseInt(object.right, 10);
                else if (typeof object.right === "number")
                    message.right = object.right;
                else if (typeof object.right === "object")
                    message.right = new $util.LongBits(object.right.low >>> 0, object.right.high >>> 0).toNumber();
            if (object.top != null)
                if ($util.Long)
                    (message.top = $util.Long.fromValue(object.top)).unsigned = false;
                else if (typeof object.top === "string")
                    message.top = parseInt(object.top, 10);
                else if (typeof object.top === "number")
                    message.top = object.top;
                else if (typeof object.top === "object")
                    message.top = new $util.LongBits(object.top.low >>> 0, object.top.high >>> 0).toNumber();
            if (object.bottom != null)
                if ($util.Long)
                    (message.bottom = $util.Long.fromValue(object.bottom)).unsigned = false;
                else if (typeof object.bottom === "string")
                    message.bottom = parseInt(object.bottom, 10);
                else if (typeof object.bottom === "number")
                    message.bottom = object.bottom;
                else if (typeof object.bottom === "object")
                    message.bottom = new $util.LongBits(object.bottom.low >>> 0, object.bottom.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a HeaderBBox message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.HeaderBBox
         * @static
         * @param {OSMPBF.HeaderBBox} message HeaderBBox
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        HeaderBBox.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.left = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.left = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.right = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.right = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.top = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.top = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.bottom = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.bottom = options.longs === String ? "0" : 0;
            }
            if (message.left != null && message.hasOwnProperty("left"))
                if (typeof message.left === "number")
                    object.left = options.longs === String ? String(message.left) : message.left;
                else
                    object.left = options.longs === String ? $util.Long.prototype.toString.call(message.left) : options.longs === Number ? new $util.LongBits(message.left.low >>> 0, message.left.high >>> 0).toNumber() : message.left;
            if (message.right != null && message.hasOwnProperty("right"))
                if (typeof message.right === "number")
                    object.right = options.longs === String ? String(message.right) : message.right;
                else
                    object.right = options.longs === String ? $util.Long.prototype.toString.call(message.right) : options.longs === Number ? new $util.LongBits(message.right.low >>> 0, message.right.high >>> 0).toNumber() : message.right;
            if (message.top != null && message.hasOwnProperty("top"))
                if (typeof message.top === "number")
                    object.top = options.longs === String ? String(message.top) : message.top;
                else
                    object.top = options.longs === String ? $util.Long.prototype.toString.call(message.top) : options.longs === Number ? new $util.LongBits(message.top.low >>> 0, message.top.high >>> 0).toNumber() : message.top;
            if (message.bottom != null && message.hasOwnProperty("bottom"))
                if (typeof message.bottom === "number")
                    object.bottom = options.longs === String ? String(message.bottom) : message.bottom;
                else
                    object.bottom = options.longs === String ? $util.Long.prototype.toString.call(message.bottom) : options.longs === Number ? new $util.LongBits(message.bottom.low >>> 0, message.bottom.high >>> 0).toNumber() : message.bottom;
            return object;
        };

        /**
         * Converts this HeaderBBox to JSON.
         * @function toJSON
         * @memberof OSMPBF.HeaderBBox
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        HeaderBBox.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return HeaderBBox;
    })();

    OSMPBF.PrimitiveBlock = (function() {

        /**
         * Properties of a PrimitiveBlock.
         * @memberof OSMPBF
         * @interface IPrimitiveBlock
         * @property {OSMPBF.IStringTable} stringtable PrimitiveBlock stringtable
         * @property {Array.<OSMPBF.IPrimitiveGroup>|null} [primitivegroup] PrimitiveBlock primitivegroup
         * @property {number|null} [granularity] PrimitiveBlock granularity
         * @property {number|Long|null} [latOffset] PrimitiveBlock latOffset
         * @property {number|Long|null} [lonOffset] PrimitiveBlock lonOffset
         * @property {number|null} [dateGranularity] PrimitiveBlock dateGranularity
         */

        /**
         * Constructs a new PrimitiveBlock.
         * @memberof OSMPBF
         * @classdesc Represents a PrimitiveBlock.
         * @implements IPrimitiveBlock
         * @constructor
         * @param {OSMPBF.IPrimitiveBlock=} [properties] Properties to set
         */
        function PrimitiveBlock(properties) {
            this.primitivegroup = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PrimitiveBlock stringtable.
         * @member {OSMPBF.IStringTable} stringtable
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         */
        PrimitiveBlock.prototype.stringtable = null;

        /**
         * PrimitiveBlock primitivegroup.
         * @member {Array.<OSMPBF.IPrimitiveGroup>} primitivegroup
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         */
        PrimitiveBlock.prototype.primitivegroup = $util.emptyArray;

        /**
         * PrimitiveBlock granularity.
         * @member {number} granularity
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         */
        PrimitiveBlock.prototype.granularity = 100;

        /**
         * PrimitiveBlock latOffset.
         * @member {number|Long} latOffset
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         */
        PrimitiveBlock.prototype.latOffset = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * PrimitiveBlock lonOffset.
         * @member {number|Long} lonOffset
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         */
        PrimitiveBlock.prototype.lonOffset = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * PrimitiveBlock dateGranularity.
         * @member {number} dateGranularity
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         */
        PrimitiveBlock.prototype.dateGranularity = 1000;

        /**
         * Creates a new PrimitiveBlock instance using the specified properties.
         * @function create
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {OSMPBF.IPrimitiveBlock=} [properties] Properties to set
         * @returns {OSMPBF.PrimitiveBlock} PrimitiveBlock instance
         */
        PrimitiveBlock.create = function create(properties) {
            return new PrimitiveBlock(properties);
        };

        /**
         * Encodes the specified PrimitiveBlock message. Does not implicitly {@link OSMPBF.PrimitiveBlock.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {OSMPBF.IPrimitiveBlock} message PrimitiveBlock message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PrimitiveBlock.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            $root.OSMPBF.StringTable.encode(message.stringtable, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.primitivegroup != null && message.primitivegroup.length)
                for (var i = 0; i < message.primitivegroup.length; ++i)
                    $root.OSMPBF.PrimitiveGroup.encode(message.primitivegroup[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.granularity != null && message.hasOwnProperty("granularity"))
                writer.uint32(/* id 17, wireType 0 =*/136).int32(message.granularity);
            if (message.dateGranularity != null && message.hasOwnProperty("dateGranularity"))
                writer.uint32(/* id 18, wireType 0 =*/144).int32(message.dateGranularity);
            if (message.latOffset != null && message.hasOwnProperty("latOffset"))
                writer.uint32(/* id 19, wireType 0 =*/152).int64(message.latOffset);
            if (message.lonOffset != null && message.hasOwnProperty("lonOffset"))
                writer.uint32(/* id 20, wireType 0 =*/160).int64(message.lonOffset);
            return writer;
        };

        /**
         * Encodes the specified PrimitiveBlock message, length delimited. Does not implicitly {@link OSMPBF.PrimitiveBlock.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {OSMPBF.IPrimitiveBlock} message PrimitiveBlock message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PrimitiveBlock.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PrimitiveBlock message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.PrimitiveBlock} PrimitiveBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PrimitiveBlock.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.PrimitiveBlock();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.stringtable = $root.OSMPBF.StringTable.decode(reader, reader.uint32());
                    break;
                case 2:
                    if (!(message.primitivegroup && message.primitivegroup.length))
                        message.primitivegroup = [];
                    message.primitivegroup.push($root.OSMPBF.PrimitiveGroup.decode(reader, reader.uint32()));
                    break;
                case 17:
                    message.granularity = reader.int32();
                    break;
                case 19:
                    message.latOffset = reader.int64();
                    break;
                case 20:
                    message.lonOffset = reader.int64();
                    break;
                case 18:
                    message.dateGranularity = reader.int32();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("stringtable"))
                throw $util.ProtocolError("missing required 'stringtable'", { instance: message });
            return message;
        };

        /**
         * Decodes a PrimitiveBlock message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.PrimitiveBlock} PrimitiveBlock
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PrimitiveBlock.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PrimitiveBlock message.
         * @function verify
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PrimitiveBlock.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            {
                var error = $root.OSMPBF.StringTable.verify(message.stringtable);
                if (error)
                    return "stringtable." + error;
            }
            if (message.primitivegroup != null && message.hasOwnProperty("primitivegroup")) {
                if (!Array.isArray(message.primitivegroup))
                    return "primitivegroup: array expected";
                for (var i = 0; i < message.primitivegroup.length; ++i) {
                    var error = $root.OSMPBF.PrimitiveGroup.verify(message.primitivegroup[i]);
                    if (error)
                        return "primitivegroup." + error;
                }
            }
            if (message.granularity != null && message.hasOwnProperty("granularity"))
                if (!$util.isInteger(message.granularity))
                    return "granularity: integer expected";
            if (message.latOffset != null && message.hasOwnProperty("latOffset"))
                if (!$util.isInteger(message.latOffset) && !(message.latOffset && $util.isInteger(message.latOffset.low) && $util.isInteger(message.latOffset.high)))
                    return "latOffset: integer|Long expected";
            if (message.lonOffset != null && message.hasOwnProperty("lonOffset"))
                if (!$util.isInteger(message.lonOffset) && !(message.lonOffset && $util.isInteger(message.lonOffset.low) && $util.isInteger(message.lonOffset.high)))
                    return "lonOffset: integer|Long expected";
            if (message.dateGranularity != null && message.hasOwnProperty("dateGranularity"))
                if (!$util.isInteger(message.dateGranularity))
                    return "dateGranularity: integer expected";
            return null;
        };

        /**
         * Creates a PrimitiveBlock message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.PrimitiveBlock} PrimitiveBlock
         */
        PrimitiveBlock.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.PrimitiveBlock)
                return object;
            var message = new $root.OSMPBF.PrimitiveBlock();
            if (object.stringtable != null) {
                if (typeof object.stringtable !== "object")
                    throw TypeError(".OSMPBF.PrimitiveBlock.stringtable: object expected");
                message.stringtable = $root.OSMPBF.StringTable.fromObject(object.stringtable);
            }
            if (object.primitivegroup) {
                if (!Array.isArray(object.primitivegroup))
                    throw TypeError(".OSMPBF.PrimitiveBlock.primitivegroup: array expected");
                message.primitivegroup = [];
                for (var i = 0; i < object.primitivegroup.length; ++i) {
                    if (typeof object.primitivegroup[i] !== "object")
                        throw TypeError(".OSMPBF.PrimitiveBlock.primitivegroup: object expected");
                    message.primitivegroup[i] = $root.OSMPBF.PrimitiveGroup.fromObject(object.primitivegroup[i]);
                }
            }
            if (object.granularity != null)
                message.granularity = object.granularity | 0;
            if (object.latOffset != null)
                if ($util.Long)
                    (message.latOffset = $util.Long.fromValue(object.latOffset)).unsigned = false;
                else if (typeof object.latOffset === "string")
                    message.latOffset = parseInt(object.latOffset, 10);
                else if (typeof object.latOffset === "number")
                    message.latOffset = object.latOffset;
                else if (typeof object.latOffset === "object")
                    message.latOffset = new $util.LongBits(object.latOffset.low >>> 0, object.latOffset.high >>> 0).toNumber();
            if (object.lonOffset != null)
                if ($util.Long)
                    (message.lonOffset = $util.Long.fromValue(object.lonOffset)).unsigned = false;
                else if (typeof object.lonOffset === "string")
                    message.lonOffset = parseInt(object.lonOffset, 10);
                else if (typeof object.lonOffset === "number")
                    message.lonOffset = object.lonOffset;
                else if (typeof object.lonOffset === "object")
                    message.lonOffset = new $util.LongBits(object.lonOffset.low >>> 0, object.lonOffset.high >>> 0).toNumber();
            if (object.dateGranularity != null)
                message.dateGranularity = object.dateGranularity | 0;
            return message;
        };

        /**
         * Creates a plain object from a PrimitiveBlock message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.PrimitiveBlock
         * @static
         * @param {OSMPBF.PrimitiveBlock} message PrimitiveBlock
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PrimitiveBlock.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.primitivegroup = [];
            if (options.defaults) {
                object.stringtable = null;
                object.granularity = 100;
                object.dateGranularity = 1000;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.latOffset = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.latOffset = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.lonOffset = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.lonOffset = options.longs === String ? "0" : 0;
            }
            if (message.stringtable != null && message.hasOwnProperty("stringtable"))
                object.stringtable = $root.OSMPBF.StringTable.toObject(message.stringtable, options);
            if (message.primitivegroup && message.primitivegroup.length) {
                object.primitivegroup = [];
                for (var j = 0; j < message.primitivegroup.length; ++j)
                    object.primitivegroup[j] = $root.OSMPBF.PrimitiveGroup.toObject(message.primitivegroup[j], options);
            }
            if (message.granularity != null && message.hasOwnProperty("granularity"))
                object.granularity = message.granularity;
            if (message.dateGranularity != null && message.hasOwnProperty("dateGranularity"))
                object.dateGranularity = message.dateGranularity;
            if (message.latOffset != null && message.hasOwnProperty("latOffset"))
                if (typeof message.latOffset === "number")
                    object.latOffset = options.longs === String ? String(message.latOffset) : message.latOffset;
                else
                    object.latOffset = options.longs === String ? $util.Long.prototype.toString.call(message.latOffset) : options.longs === Number ? new $util.LongBits(message.latOffset.low >>> 0, message.latOffset.high >>> 0).toNumber() : message.latOffset;
            if (message.lonOffset != null && message.hasOwnProperty("lonOffset"))
                if (typeof message.lonOffset === "number")
                    object.lonOffset = options.longs === String ? String(message.lonOffset) : message.lonOffset;
                else
                    object.lonOffset = options.longs === String ? $util.Long.prototype.toString.call(message.lonOffset) : options.longs === Number ? new $util.LongBits(message.lonOffset.low >>> 0, message.lonOffset.high >>> 0).toNumber() : message.lonOffset;
            return object;
        };

        /**
         * Converts this PrimitiveBlock to JSON.
         * @function toJSON
         * @memberof OSMPBF.PrimitiveBlock
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PrimitiveBlock.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return PrimitiveBlock;
    })();

    OSMPBF.PrimitiveGroup = (function() {

        /**
         * Properties of a PrimitiveGroup.
         * @memberof OSMPBF
         * @interface IPrimitiveGroup
         * @property {Array.<OSMPBF.INode>|null} [nodes] PrimitiveGroup nodes
         * @property {OSMPBF.IDenseNodes|null} [dense] PrimitiveGroup dense
         * @property {Array.<OSMPBF.IWay>|null} [ways] PrimitiveGroup ways
         * @property {Array.<OSMPBF.IRelation>|null} [relations] PrimitiveGroup relations
         * @property {Array.<OSMPBF.IChangeSet>|null} [changesets] PrimitiveGroup changesets
         */

        /**
         * Constructs a new PrimitiveGroup.
         * @memberof OSMPBF
         * @classdesc Represents a PrimitiveGroup.
         * @implements IPrimitiveGroup
         * @constructor
         * @param {OSMPBF.IPrimitiveGroup=} [properties] Properties to set
         */
        function PrimitiveGroup(properties) {
            this.nodes = [];
            this.ways = [];
            this.relations = [];
            this.changesets = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PrimitiveGroup nodes.
         * @member {Array.<OSMPBF.INode>} nodes
         * @memberof OSMPBF.PrimitiveGroup
         * @instance
         */
        PrimitiveGroup.prototype.nodes = $util.emptyArray;

        /**
         * PrimitiveGroup dense.
         * @member {OSMPBF.IDenseNodes|null|undefined} dense
         * @memberof OSMPBF.PrimitiveGroup
         * @instance
         */
        PrimitiveGroup.prototype.dense = null;

        /**
         * PrimitiveGroup ways.
         * @member {Array.<OSMPBF.IWay>} ways
         * @memberof OSMPBF.PrimitiveGroup
         * @instance
         */
        PrimitiveGroup.prototype.ways = $util.emptyArray;

        /**
         * PrimitiveGroup relations.
         * @member {Array.<OSMPBF.IRelation>} relations
         * @memberof OSMPBF.PrimitiveGroup
         * @instance
         */
        PrimitiveGroup.prototype.relations = $util.emptyArray;

        /**
         * PrimitiveGroup changesets.
         * @member {Array.<OSMPBF.IChangeSet>} changesets
         * @memberof OSMPBF.PrimitiveGroup
         * @instance
         */
        PrimitiveGroup.prototype.changesets = $util.emptyArray;

        /**
         * Creates a new PrimitiveGroup instance using the specified properties.
         * @function create
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {OSMPBF.IPrimitiveGroup=} [properties] Properties to set
         * @returns {OSMPBF.PrimitiveGroup} PrimitiveGroup instance
         */
        PrimitiveGroup.create = function create(properties) {
            return new PrimitiveGroup(properties);
        };

        /**
         * Encodes the specified PrimitiveGroup message. Does not implicitly {@link OSMPBF.PrimitiveGroup.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {OSMPBF.IPrimitiveGroup} message PrimitiveGroup message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PrimitiveGroup.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.nodes != null && message.nodes.length)
                for (var i = 0; i < message.nodes.length; ++i)
                    $root.OSMPBF.Node.encode(message.nodes[i], writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.dense != null && message.hasOwnProperty("dense"))
                $root.OSMPBF.DenseNodes.encode(message.dense, writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.ways != null && message.ways.length)
                for (var i = 0; i < message.ways.length; ++i)
                    $root.OSMPBF.Way.encode(message.ways[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.relations != null && message.relations.length)
                for (var i = 0; i < message.relations.length; ++i)
                    $root.OSMPBF.Relation.encode(message.relations[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.changesets != null && message.changesets.length)
                for (var i = 0; i < message.changesets.length; ++i)
                    $root.OSMPBF.ChangeSet.encode(message.changesets[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified PrimitiveGroup message, length delimited. Does not implicitly {@link OSMPBF.PrimitiveGroup.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {OSMPBF.IPrimitiveGroup} message PrimitiveGroup message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PrimitiveGroup.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PrimitiveGroup message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.PrimitiveGroup} PrimitiveGroup
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PrimitiveGroup.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.PrimitiveGroup();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    if (!(message.nodes && message.nodes.length))
                        message.nodes = [];
                    message.nodes.push($root.OSMPBF.Node.decode(reader, reader.uint32()));
                    break;
                case 2:
                    message.dense = $root.OSMPBF.DenseNodes.decode(reader, reader.uint32());
                    break;
                case 3:
                    if (!(message.ways && message.ways.length))
                        message.ways = [];
                    message.ways.push($root.OSMPBF.Way.decode(reader, reader.uint32()));
                    break;
                case 4:
                    if (!(message.relations && message.relations.length))
                        message.relations = [];
                    message.relations.push($root.OSMPBF.Relation.decode(reader, reader.uint32()));
                    break;
                case 5:
                    if (!(message.changesets && message.changesets.length))
                        message.changesets = [];
                    message.changesets.push($root.OSMPBF.ChangeSet.decode(reader, reader.uint32()));
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PrimitiveGroup message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.PrimitiveGroup} PrimitiveGroup
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PrimitiveGroup.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PrimitiveGroup message.
         * @function verify
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PrimitiveGroup.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.nodes != null && message.hasOwnProperty("nodes")) {
                if (!Array.isArray(message.nodes))
                    return "nodes: array expected";
                for (var i = 0; i < message.nodes.length; ++i) {
                    var error = $root.OSMPBF.Node.verify(message.nodes[i]);
                    if (error)
                        return "nodes." + error;
                }
            }
            if (message.dense != null && message.hasOwnProperty("dense")) {
                var error = $root.OSMPBF.DenseNodes.verify(message.dense);
                if (error)
                    return "dense." + error;
            }
            if (message.ways != null && message.hasOwnProperty("ways")) {
                if (!Array.isArray(message.ways))
                    return "ways: array expected";
                for (var i = 0; i < message.ways.length; ++i) {
                    var error = $root.OSMPBF.Way.verify(message.ways[i]);
                    if (error)
                        return "ways." + error;
                }
            }
            if (message.relations != null && message.hasOwnProperty("relations")) {
                if (!Array.isArray(message.relations))
                    return "relations: array expected";
                for (var i = 0; i < message.relations.length; ++i) {
                    var error = $root.OSMPBF.Relation.verify(message.relations[i]);
                    if (error)
                        return "relations." + error;
                }
            }
            if (message.changesets != null && message.hasOwnProperty("changesets")) {
                if (!Array.isArray(message.changesets))
                    return "changesets: array expected";
                for (var i = 0; i < message.changesets.length; ++i) {
                    var error = $root.OSMPBF.ChangeSet.verify(message.changesets[i]);
                    if (error)
                        return "changesets." + error;
                }
            }
            return null;
        };

        /**
         * Creates a PrimitiveGroup message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.PrimitiveGroup} PrimitiveGroup
         */
        PrimitiveGroup.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.PrimitiveGroup)
                return object;
            var message = new $root.OSMPBF.PrimitiveGroup();
            if (object.nodes) {
                if (!Array.isArray(object.nodes))
                    throw TypeError(".OSMPBF.PrimitiveGroup.nodes: array expected");
                message.nodes = [];
                for (var i = 0; i < object.nodes.length; ++i) {
                    if (typeof object.nodes[i] !== "object")
                        throw TypeError(".OSMPBF.PrimitiveGroup.nodes: object expected");
                    message.nodes[i] = $root.OSMPBF.Node.fromObject(object.nodes[i]);
                }
            }
            if (object.dense != null) {
                if (typeof object.dense !== "object")
                    throw TypeError(".OSMPBF.PrimitiveGroup.dense: object expected");
                message.dense = $root.OSMPBF.DenseNodes.fromObject(object.dense);
            }
            if (object.ways) {
                if (!Array.isArray(object.ways))
                    throw TypeError(".OSMPBF.PrimitiveGroup.ways: array expected");
                message.ways = [];
                for (var i = 0; i < object.ways.length; ++i) {
                    if (typeof object.ways[i] !== "object")
                        throw TypeError(".OSMPBF.PrimitiveGroup.ways: object expected");
                    message.ways[i] = $root.OSMPBF.Way.fromObject(object.ways[i]);
                }
            }
            if (object.relations) {
                if (!Array.isArray(object.relations))
                    throw TypeError(".OSMPBF.PrimitiveGroup.relations: array expected");
                message.relations = [];
                for (var i = 0; i < object.relations.length; ++i) {
                    if (typeof object.relations[i] !== "object")
                        throw TypeError(".OSMPBF.PrimitiveGroup.relations: object expected");
                    message.relations[i] = $root.OSMPBF.Relation.fromObject(object.relations[i]);
                }
            }
            if (object.changesets) {
                if (!Array.isArray(object.changesets))
                    throw TypeError(".OSMPBF.PrimitiveGroup.changesets: array expected");
                message.changesets = [];
                for (var i = 0; i < object.changesets.length; ++i) {
                    if (typeof object.changesets[i] !== "object")
                        throw TypeError(".OSMPBF.PrimitiveGroup.changesets: object expected");
                    message.changesets[i] = $root.OSMPBF.ChangeSet.fromObject(object.changesets[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a PrimitiveGroup message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.PrimitiveGroup
         * @static
         * @param {OSMPBF.PrimitiveGroup} message PrimitiveGroup
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PrimitiveGroup.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.nodes = [];
                object.ways = [];
                object.relations = [];
                object.changesets = [];
            }
            if (options.defaults)
                object.dense = null;
            if (message.nodes && message.nodes.length) {
                object.nodes = [];
                for (var j = 0; j < message.nodes.length; ++j)
                    object.nodes[j] = $root.OSMPBF.Node.toObject(message.nodes[j], options);
            }
            if (message.dense != null && message.hasOwnProperty("dense"))
                object.dense = $root.OSMPBF.DenseNodes.toObject(message.dense, options);
            if (message.ways && message.ways.length) {
                object.ways = [];
                for (var j = 0; j < message.ways.length; ++j)
                    object.ways[j] = $root.OSMPBF.Way.toObject(message.ways[j], options);
            }
            if (message.relations && message.relations.length) {
                object.relations = [];
                for (var j = 0; j < message.relations.length; ++j)
                    object.relations[j] = $root.OSMPBF.Relation.toObject(message.relations[j], options);
            }
            if (message.changesets && message.changesets.length) {
                object.changesets = [];
                for (var j = 0; j < message.changesets.length; ++j)
                    object.changesets[j] = $root.OSMPBF.ChangeSet.toObject(message.changesets[j], options);
            }
            return object;
        };

        /**
         * Converts this PrimitiveGroup to JSON.
         * @function toJSON
         * @memberof OSMPBF.PrimitiveGroup
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PrimitiveGroup.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return PrimitiveGroup;
    })();

    OSMPBF.StringTable = (function() {

        /**
         * Properties of a StringTable.
         * @memberof OSMPBF
         * @interface IStringTable
         * @property {Array.<Uint8Array>|null} [s] StringTable s
         */

        /**
         * Constructs a new StringTable.
         * @memberof OSMPBF
         * @classdesc String table, contains the common strings in each block.
         * 
         * Note that we reserve index '0' as a delimiter, so the entry at that
         * index in the table is ALWAYS blank and unused.
         * @implements IStringTable
         * @constructor
         * @param {OSMPBF.IStringTable=} [properties] Properties to set
         */
        function StringTable(properties) {
            this.s = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * StringTable s.
         * @member {Array.<Uint8Array>} s
         * @memberof OSMPBF.StringTable
         * @instance
         */
        StringTable.prototype.s = $util.emptyArray;

        /**
         * Creates a new StringTable instance using the specified properties.
         * @function create
         * @memberof OSMPBF.StringTable
         * @static
         * @param {OSMPBF.IStringTable=} [properties] Properties to set
         * @returns {OSMPBF.StringTable} StringTable instance
         */
        StringTable.create = function create(properties) {
            return new StringTable(properties);
        };

        /**
         * Encodes the specified StringTable message. Does not implicitly {@link OSMPBF.StringTable.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.StringTable
         * @static
         * @param {OSMPBF.IStringTable} message StringTable message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringTable.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.s != null && message.s.length)
                for (var i = 0; i < message.s.length; ++i)
                    writer.uint32(/* id 1, wireType 2 =*/10).bytes(message.s[i]);
            return writer;
        };

        /**
         * Encodes the specified StringTable message, length delimited. Does not implicitly {@link OSMPBF.StringTable.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.StringTable
         * @static
         * @param {OSMPBF.IStringTable} message StringTable message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        StringTable.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a StringTable message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.StringTable
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.StringTable} StringTable
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringTable.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.StringTable();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    if (!(message.s && message.s.length))
                        message.s = [];
                    message.s.push(reader.bytes());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a StringTable message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.StringTable
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.StringTable} StringTable
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        StringTable.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a StringTable message.
         * @function verify
         * @memberof OSMPBF.StringTable
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        StringTable.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.s != null && message.hasOwnProperty("s")) {
                if (!Array.isArray(message.s))
                    return "s: array expected";
                for (var i = 0; i < message.s.length; ++i)
                    if (!(message.s[i] && typeof message.s[i].length === "number" || $util.isString(message.s[i])))
                        return "s: buffer[] expected";
            }
            return null;
        };

        /**
         * Creates a StringTable message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.StringTable
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.StringTable} StringTable
         */
        StringTable.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.StringTable)
                return object;
            var message = new $root.OSMPBF.StringTable();
            if (object.s) {
                if (!Array.isArray(object.s))
                    throw TypeError(".OSMPBF.StringTable.s: array expected");
                message.s = [];
                for (var i = 0; i < object.s.length; ++i)
                    if (typeof object.s[i] === "string")
                        $util.base64.decode(object.s[i], message.s[i] = $util.newBuffer($util.base64.length(object.s[i])), 0);
                    else if (object.s[i].length)
                        message.s[i] = object.s[i];
            }
            return message;
        };

        /**
         * Creates a plain object from a StringTable message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.StringTable
         * @static
         * @param {OSMPBF.StringTable} message StringTable
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        StringTable.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults)
                object.s = [];
            if (message.s && message.s.length) {
                object.s = [];
                for (var j = 0; j < message.s.length; ++j)
                    object.s[j] = options.bytes === String ? $util.base64.encode(message.s[j], 0, message.s[j].length) : options.bytes === Array ? Array.prototype.slice.call(message.s[j]) : message.s[j];
            }
            return object;
        };

        /**
         * Converts this StringTable to JSON.
         * @function toJSON
         * @memberof OSMPBF.StringTable
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        StringTable.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return StringTable;
    })();

    OSMPBF.Info = (function() {

        /**
         * Properties of an Info.
         * @memberof OSMPBF
         * @interface IInfo
         * @property {number|null} [version] Info version
         * @property {number|Long|null} [timestamp] Info timestamp
         * @property {number|Long|null} [changeset] Info changeset
         * @property {number|null} [uid] Info uid
         * @property {number|null} [userSid] Info userSid
         * @property {boolean|null} [visible] Info visible
         */

        /**
         * Constructs a new Info.
         * @memberof OSMPBF
         * @classdesc Represents an Info.
         * @implements IInfo
         * @constructor
         * @param {OSMPBF.IInfo=} [properties] Properties to set
         */
        function Info(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Info version.
         * @member {number} version
         * @memberof OSMPBF.Info
         * @instance
         */
        Info.prototype.version = -1;

        /**
         * Info timestamp.
         * @member {number|Long} timestamp
         * @memberof OSMPBF.Info
         * @instance
         */
        Info.prototype.timestamp = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Info changeset.
         * @member {number|Long} changeset
         * @memberof OSMPBF.Info
         * @instance
         */
        Info.prototype.changeset = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Info uid.
         * @member {number} uid
         * @memberof OSMPBF.Info
         * @instance
         */
        Info.prototype.uid = 0;

        /**
         * Info userSid.
         * @member {number} userSid
         * @memberof OSMPBF.Info
         * @instance
         */
        Info.prototype.userSid = 0;

        /**
         * Info visible.
         * @member {boolean} visible
         * @memberof OSMPBF.Info
         * @instance
         */
        Info.prototype.visible = false;

        /**
         * Creates a new Info instance using the specified properties.
         * @function create
         * @memberof OSMPBF.Info
         * @static
         * @param {OSMPBF.IInfo=} [properties] Properties to set
         * @returns {OSMPBF.Info} Info instance
         */
        Info.create = function create(properties) {
            return new Info(properties);
        };

        /**
         * Encodes the specified Info message. Does not implicitly {@link OSMPBF.Info.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.Info
         * @static
         * @param {OSMPBF.IInfo} message Info message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Info.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && message.hasOwnProperty("version"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.version);
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                writer.uint32(/* id 2, wireType 0 =*/16).int64(message.timestamp);
            if (message.changeset != null && message.hasOwnProperty("changeset"))
                writer.uint32(/* id 3, wireType 0 =*/24).int64(message.changeset);
            if (message.uid != null && message.hasOwnProperty("uid"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.uid);
            if (message.userSid != null && message.hasOwnProperty("userSid"))
                writer.uint32(/* id 5, wireType 0 =*/40).uint32(message.userSid);
            if (message.visible != null && message.hasOwnProperty("visible"))
                writer.uint32(/* id 6, wireType 0 =*/48).bool(message.visible);
            return writer;
        };

        /**
         * Encodes the specified Info message, length delimited. Does not implicitly {@link OSMPBF.Info.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.Info
         * @static
         * @param {OSMPBF.IInfo} message Info message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Info.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes an Info message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.Info
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.Info} Info
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Info.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.Info();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.version = reader.int32();
                    break;
                case 2:
                    message.timestamp = reader.int64();
                    break;
                case 3:
                    message.changeset = reader.int64();
                    break;
                case 4:
                    message.uid = reader.int32();
                    break;
                case 5:
                    message.userSid = reader.uint32();
                    break;
                case 6:
                    message.visible = reader.bool();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes an Info message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.Info
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.Info} Info
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Info.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies an Info message.
         * @function verify
         * @memberof OSMPBF.Info
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Info.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.version != null && message.hasOwnProperty("version"))
                if (!$util.isInteger(message.version))
                    return "version: integer expected";
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (!$util.isInteger(message.timestamp) && !(message.timestamp && $util.isInteger(message.timestamp.low) && $util.isInteger(message.timestamp.high)))
                    return "timestamp: integer|Long expected";
            if (message.changeset != null && message.hasOwnProperty("changeset"))
                if (!$util.isInteger(message.changeset) && !(message.changeset && $util.isInteger(message.changeset.low) && $util.isInteger(message.changeset.high)))
                    return "changeset: integer|Long expected";
            if (message.uid != null && message.hasOwnProperty("uid"))
                if (!$util.isInteger(message.uid))
                    return "uid: integer expected";
            if (message.userSid != null && message.hasOwnProperty("userSid"))
                if (!$util.isInteger(message.userSid))
                    return "userSid: integer expected";
            if (message.visible != null && message.hasOwnProperty("visible"))
                if (typeof message.visible !== "boolean")
                    return "visible: boolean expected";
            return null;
        };

        /**
         * Creates an Info message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.Info
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.Info} Info
         */
        Info.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.Info)
                return object;
            var message = new $root.OSMPBF.Info();
            if (object.version != null)
                message.version = object.version | 0;
            if (object.timestamp != null)
                if ($util.Long)
                    (message.timestamp = $util.Long.fromValue(object.timestamp)).unsigned = false;
                else if (typeof object.timestamp === "string")
                    message.timestamp = parseInt(object.timestamp, 10);
                else if (typeof object.timestamp === "number")
                    message.timestamp = object.timestamp;
                else if (typeof object.timestamp === "object")
                    message.timestamp = new $util.LongBits(object.timestamp.low >>> 0, object.timestamp.high >>> 0).toNumber();
            if (object.changeset != null)
                if ($util.Long)
                    (message.changeset = $util.Long.fromValue(object.changeset)).unsigned = false;
                else if (typeof object.changeset === "string")
                    message.changeset = parseInt(object.changeset, 10);
                else if (typeof object.changeset === "number")
                    message.changeset = object.changeset;
                else if (typeof object.changeset === "object")
                    message.changeset = new $util.LongBits(object.changeset.low >>> 0, object.changeset.high >>> 0).toNumber();
            if (object.uid != null)
                message.uid = object.uid | 0;
            if (object.userSid != null)
                message.userSid = object.userSid >>> 0;
            if (object.visible != null)
                message.visible = Boolean(object.visible);
            return message;
        };

        /**
         * Creates a plain object from an Info message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.Info
         * @static
         * @param {OSMPBF.Info} message Info
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Info.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults) {
                object.version = -1;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.timestamp = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.timestamp = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.changeset = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.changeset = options.longs === String ? "0" : 0;
                object.uid = 0;
                object.userSid = 0;
                object.visible = false;
            }
            if (message.version != null && message.hasOwnProperty("version"))
                object.version = message.version;
            if (message.timestamp != null && message.hasOwnProperty("timestamp"))
                if (typeof message.timestamp === "number")
                    object.timestamp = options.longs === String ? String(message.timestamp) : message.timestamp;
                else
                    object.timestamp = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp) : options.longs === Number ? new $util.LongBits(message.timestamp.low >>> 0, message.timestamp.high >>> 0).toNumber() : message.timestamp;
            if (message.changeset != null && message.hasOwnProperty("changeset"))
                if (typeof message.changeset === "number")
                    object.changeset = options.longs === String ? String(message.changeset) : message.changeset;
                else
                    object.changeset = options.longs === String ? $util.Long.prototype.toString.call(message.changeset) : options.longs === Number ? new $util.LongBits(message.changeset.low >>> 0, message.changeset.high >>> 0).toNumber() : message.changeset;
            if (message.uid != null && message.hasOwnProperty("uid"))
                object.uid = message.uid;
            if (message.userSid != null && message.hasOwnProperty("userSid"))
                object.userSid = message.userSid;
            if (message.visible != null && message.hasOwnProperty("visible"))
                object.visible = message.visible;
            return object;
        };

        /**
         * Converts this Info to JSON.
         * @function toJSON
         * @memberof OSMPBF.Info
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Info.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Info;
    })();

    OSMPBF.DenseInfo = (function() {

        /**
         * Properties of a DenseInfo.
         * @memberof OSMPBF
         * @interface IDenseInfo
         * @property {Array.<number>|null} [version] DenseInfo version
         * @property {Array.<number|Long>|null} [timestamp] DenseInfo timestamp
         * @property {Array.<number|Long>|null} [changeset] DenseInfo changeset
         * @property {Array.<number>|null} [uid] DenseInfo uid
         * @property {Array.<number>|null} [userSid] DenseInfo userSid
         * @property {Array.<boolean>|null} [visible] DenseInfo visible
         */

        /**
         * Constructs a new DenseInfo.
         * @memberof OSMPBF
         * @classdesc Optional metadata that may be included into each primitive. Special dense format used in DenseNodes.
         * @implements IDenseInfo
         * @constructor
         * @param {OSMPBF.IDenseInfo=} [properties] Properties to set
         */
        function DenseInfo(properties) {
            this.version = [];
            this.timestamp = [];
            this.changeset = [];
            this.uid = [];
            this.userSid = [];
            this.visible = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DenseInfo version.
         * @member {Array.<number>} version
         * @memberof OSMPBF.DenseInfo
         * @instance
         */
        DenseInfo.prototype.version = $util.emptyArray;

        /**
         * DenseInfo timestamp.
         * @member {Array.<number|Long>} timestamp
         * @memberof OSMPBF.DenseInfo
         * @instance
         */
        DenseInfo.prototype.timestamp = $util.emptyArray;

        /**
         * DenseInfo changeset.
         * @member {Array.<number|Long>} changeset
         * @memberof OSMPBF.DenseInfo
         * @instance
         */
        DenseInfo.prototype.changeset = $util.emptyArray;

        /**
         * DenseInfo uid.
         * @member {Array.<number>} uid
         * @memberof OSMPBF.DenseInfo
         * @instance
         */
        DenseInfo.prototype.uid = $util.emptyArray;

        /**
         * DenseInfo userSid.
         * @member {Array.<number>} userSid
         * @memberof OSMPBF.DenseInfo
         * @instance
         */
        DenseInfo.prototype.userSid = $util.emptyArray;

        /**
         * DenseInfo visible.
         * @member {Array.<boolean>} visible
         * @memberof OSMPBF.DenseInfo
         * @instance
         */
        DenseInfo.prototype.visible = $util.emptyArray;

        /**
         * Creates a new DenseInfo instance using the specified properties.
         * @function create
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {OSMPBF.IDenseInfo=} [properties] Properties to set
         * @returns {OSMPBF.DenseInfo} DenseInfo instance
         */
        DenseInfo.create = function create(properties) {
            return new DenseInfo(properties);
        };

        /**
         * Encodes the specified DenseInfo message. Does not implicitly {@link OSMPBF.DenseInfo.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {OSMPBF.IDenseInfo} message DenseInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DenseInfo.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && message.version.length) {
                writer.uint32(/* id 1, wireType 2 =*/10).fork();
                for (var i = 0; i < message.version.length; ++i)
                    writer.int32(message.version[i]);
                writer.ldelim();
            }
            if (message.timestamp != null && message.timestamp.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.timestamp.length; ++i)
                    writer.sint64(message.timestamp[i]);
                writer.ldelim();
            }
            if (message.changeset != null && message.changeset.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (var i = 0; i < message.changeset.length; ++i)
                    writer.sint64(message.changeset[i]);
                writer.ldelim();
            }
            if (message.uid != null && message.uid.length) {
                writer.uint32(/* id 4, wireType 2 =*/34).fork();
                for (var i = 0; i < message.uid.length; ++i)
                    writer.sint32(message.uid[i]);
                writer.ldelim();
            }
            if (message.userSid != null && message.userSid.length) {
                writer.uint32(/* id 5, wireType 2 =*/42).fork();
                for (var i = 0; i < message.userSid.length; ++i)
                    writer.sint32(message.userSid[i]);
                writer.ldelim();
            }
            if (message.visible != null && message.visible.length) {
                writer.uint32(/* id 6, wireType 2 =*/50).fork();
                for (var i = 0; i < message.visible.length; ++i)
                    writer.bool(message.visible[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified DenseInfo message, length delimited. Does not implicitly {@link OSMPBF.DenseInfo.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {OSMPBF.IDenseInfo} message DenseInfo message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DenseInfo.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DenseInfo message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.DenseInfo} DenseInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DenseInfo.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.DenseInfo();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    if (!(message.version && message.version.length))
                        message.version = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.version.push(reader.int32());
                    } else
                        message.version.push(reader.int32());
                    break;
                case 2:
                    if (!(message.timestamp && message.timestamp.length))
                        message.timestamp = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.timestamp.push(reader.sint64());
                    } else
                        message.timestamp.push(reader.sint64());
                    break;
                case 3:
                    if (!(message.changeset && message.changeset.length))
                        message.changeset = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.changeset.push(reader.sint64());
                    } else
                        message.changeset.push(reader.sint64());
                    break;
                case 4:
                    if (!(message.uid && message.uid.length))
                        message.uid = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.uid.push(reader.sint32());
                    } else
                        message.uid.push(reader.sint32());
                    break;
                case 5:
                    if (!(message.userSid && message.userSid.length))
                        message.userSid = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.userSid.push(reader.sint32());
                    } else
                        message.userSid.push(reader.sint32());
                    break;
                case 6:
                    if (!(message.visible && message.visible.length))
                        message.visible = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.visible.push(reader.bool());
                    } else
                        message.visible.push(reader.bool());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DenseInfo message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.DenseInfo} DenseInfo
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DenseInfo.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DenseInfo message.
         * @function verify
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DenseInfo.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.version != null && message.hasOwnProperty("version")) {
                if (!Array.isArray(message.version))
                    return "version: array expected";
                for (var i = 0; i < message.version.length; ++i)
                    if (!$util.isInteger(message.version[i]))
                        return "version: integer[] expected";
            }
            if (message.timestamp != null && message.hasOwnProperty("timestamp")) {
                if (!Array.isArray(message.timestamp))
                    return "timestamp: array expected";
                for (var i = 0; i < message.timestamp.length; ++i)
                    if (!$util.isInteger(message.timestamp[i]) && !(message.timestamp[i] && $util.isInteger(message.timestamp[i].low) && $util.isInteger(message.timestamp[i].high)))
                        return "timestamp: integer|Long[] expected";
            }
            if (message.changeset != null && message.hasOwnProperty("changeset")) {
                if (!Array.isArray(message.changeset))
                    return "changeset: array expected";
                for (var i = 0; i < message.changeset.length; ++i)
                    if (!$util.isInteger(message.changeset[i]) && !(message.changeset[i] && $util.isInteger(message.changeset[i].low) && $util.isInteger(message.changeset[i].high)))
                        return "changeset: integer|Long[] expected";
            }
            if (message.uid != null && message.hasOwnProperty("uid")) {
                if (!Array.isArray(message.uid))
                    return "uid: array expected";
                for (var i = 0; i < message.uid.length; ++i)
                    if (!$util.isInteger(message.uid[i]))
                        return "uid: integer[] expected";
            }
            if (message.userSid != null && message.hasOwnProperty("userSid")) {
                if (!Array.isArray(message.userSid))
                    return "userSid: array expected";
                for (var i = 0; i < message.userSid.length; ++i)
                    if (!$util.isInteger(message.userSid[i]))
                        return "userSid: integer[] expected";
            }
            if (message.visible != null && message.hasOwnProperty("visible")) {
                if (!Array.isArray(message.visible))
                    return "visible: array expected";
                for (var i = 0; i < message.visible.length; ++i)
                    if (typeof message.visible[i] !== "boolean")
                        return "visible: boolean[] expected";
            }
            return null;
        };

        /**
         * Creates a DenseInfo message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.DenseInfo} DenseInfo
         */
        DenseInfo.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.DenseInfo)
                return object;
            var message = new $root.OSMPBF.DenseInfo();
            if (object.version) {
                if (!Array.isArray(object.version))
                    throw TypeError(".OSMPBF.DenseInfo.version: array expected");
                message.version = [];
                for (var i = 0; i < object.version.length; ++i)
                    message.version[i] = object.version[i] | 0;
            }
            if (object.timestamp) {
                if (!Array.isArray(object.timestamp))
                    throw TypeError(".OSMPBF.DenseInfo.timestamp: array expected");
                message.timestamp = [];
                for (var i = 0; i < object.timestamp.length; ++i)
                    if ($util.Long)
                        (message.timestamp[i] = $util.Long.fromValue(object.timestamp[i])).unsigned = false;
                    else if (typeof object.timestamp[i] === "string")
                        message.timestamp[i] = parseInt(object.timestamp[i], 10);
                    else if (typeof object.timestamp[i] === "number")
                        message.timestamp[i] = object.timestamp[i];
                    else if (typeof object.timestamp[i] === "object")
                        message.timestamp[i] = new $util.LongBits(object.timestamp[i].low >>> 0, object.timestamp[i].high >>> 0).toNumber();
            }
            if (object.changeset) {
                if (!Array.isArray(object.changeset))
                    throw TypeError(".OSMPBF.DenseInfo.changeset: array expected");
                message.changeset = [];
                for (var i = 0; i < object.changeset.length; ++i)
                    if ($util.Long)
                        (message.changeset[i] = $util.Long.fromValue(object.changeset[i])).unsigned = false;
                    else if (typeof object.changeset[i] === "string")
                        message.changeset[i] = parseInt(object.changeset[i], 10);
                    else if (typeof object.changeset[i] === "number")
                        message.changeset[i] = object.changeset[i];
                    else if (typeof object.changeset[i] === "object")
                        message.changeset[i] = new $util.LongBits(object.changeset[i].low >>> 0, object.changeset[i].high >>> 0).toNumber();
            }
            if (object.uid) {
                if (!Array.isArray(object.uid))
                    throw TypeError(".OSMPBF.DenseInfo.uid: array expected");
                message.uid = [];
                for (var i = 0; i < object.uid.length; ++i)
                    message.uid[i] = object.uid[i] | 0;
            }
            if (object.userSid) {
                if (!Array.isArray(object.userSid))
                    throw TypeError(".OSMPBF.DenseInfo.userSid: array expected");
                message.userSid = [];
                for (var i = 0; i < object.userSid.length; ++i)
                    message.userSid[i] = object.userSid[i] | 0;
            }
            if (object.visible) {
                if (!Array.isArray(object.visible))
                    throw TypeError(".OSMPBF.DenseInfo.visible: array expected");
                message.visible = [];
                for (var i = 0; i < object.visible.length; ++i)
                    message.visible[i] = Boolean(object.visible[i]);
            }
            return message;
        };

        /**
         * Creates a plain object from a DenseInfo message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.DenseInfo
         * @static
         * @param {OSMPBF.DenseInfo} message DenseInfo
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DenseInfo.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.version = [];
                object.timestamp = [];
                object.changeset = [];
                object.uid = [];
                object.userSid = [];
                object.visible = [];
            }
            if (message.version && message.version.length) {
                object.version = [];
                for (var j = 0; j < message.version.length; ++j)
                    object.version[j] = message.version[j];
            }
            if (message.timestamp && message.timestamp.length) {
                object.timestamp = [];
                for (var j = 0; j < message.timestamp.length; ++j)
                    if (typeof message.timestamp[j] === "number")
                        object.timestamp[j] = options.longs === String ? String(message.timestamp[j]) : message.timestamp[j];
                    else
                        object.timestamp[j] = options.longs === String ? $util.Long.prototype.toString.call(message.timestamp[j]) : options.longs === Number ? new $util.LongBits(message.timestamp[j].low >>> 0, message.timestamp[j].high >>> 0).toNumber() : message.timestamp[j];
            }
            if (message.changeset && message.changeset.length) {
                object.changeset = [];
                for (var j = 0; j < message.changeset.length; ++j)
                    if (typeof message.changeset[j] === "number")
                        object.changeset[j] = options.longs === String ? String(message.changeset[j]) : message.changeset[j];
                    else
                        object.changeset[j] = options.longs === String ? $util.Long.prototype.toString.call(message.changeset[j]) : options.longs === Number ? new $util.LongBits(message.changeset[j].low >>> 0, message.changeset[j].high >>> 0).toNumber() : message.changeset[j];
            }
            if (message.uid && message.uid.length) {
                object.uid = [];
                for (var j = 0; j < message.uid.length; ++j)
                    object.uid[j] = message.uid[j];
            }
            if (message.userSid && message.userSid.length) {
                object.userSid = [];
                for (var j = 0; j < message.userSid.length; ++j)
                    object.userSid[j] = message.userSid[j];
            }
            if (message.visible && message.visible.length) {
                object.visible = [];
                for (var j = 0; j < message.visible.length; ++j)
                    object.visible[j] = message.visible[j];
            }
            return object;
        };

        /**
         * Converts this DenseInfo to JSON.
         * @function toJSON
         * @memberof OSMPBF.DenseInfo
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DenseInfo.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return DenseInfo;
    })();

    OSMPBF.ChangeSet = (function() {

        /**
         * Properties of a ChangeSet.
         * @memberof OSMPBF
         * @interface IChangeSet
         * @property {number|Long} id ChangeSet id
         */

        /**
         * Constructs a new ChangeSet.
         * @memberof OSMPBF
         * @classdesc Represents a ChangeSet.
         * @implements IChangeSet
         * @constructor
         * @param {OSMPBF.IChangeSet=} [properties] Properties to set
         */
        function ChangeSet(properties) {
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ChangeSet id.
         * @member {number|Long} id
         * @memberof OSMPBF.ChangeSet
         * @instance
         */
        ChangeSet.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new ChangeSet instance using the specified properties.
         * @function create
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {OSMPBF.IChangeSet=} [properties] Properties to set
         * @returns {OSMPBF.ChangeSet} ChangeSet instance
         */
        ChangeSet.create = function create(properties) {
            return new ChangeSet(properties);
        };

        /**
         * Encodes the specified ChangeSet message. Does not implicitly {@link OSMPBF.ChangeSet.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {OSMPBF.IChangeSet} message ChangeSet message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChangeSet.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 0 =*/8).int64(message.id);
            return writer;
        };

        /**
         * Encodes the specified ChangeSet message, length delimited. Does not implicitly {@link OSMPBF.ChangeSet.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {OSMPBF.IChangeSet} message ChangeSet message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ChangeSet.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ChangeSet message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.ChangeSet} ChangeSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChangeSet.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.ChangeSet();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.id = reader.int64();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("id"))
                throw $util.ProtocolError("missing required 'id'", { instance: message });
            return message;
        };

        /**
         * Decodes a ChangeSet message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.ChangeSet} ChangeSet
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ChangeSet.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ChangeSet message.
         * @function verify
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ChangeSet.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                return "id: integer|Long expected";
            return null;
        };

        /**
         * Creates a ChangeSet message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.ChangeSet} ChangeSet
         */
        ChangeSet.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.ChangeSet)
                return object;
            var message = new $root.OSMPBF.ChangeSet();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a ChangeSet message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.ChangeSet
         * @static
         * @param {OSMPBF.ChangeSet} message ChangeSet
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ChangeSet.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.defaults)
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            return object;
        };

        /**
         * Converts this ChangeSet to JSON.
         * @function toJSON
         * @memberof OSMPBF.ChangeSet
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ChangeSet.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return ChangeSet;
    })();

    OSMPBF.Node = (function() {

        /**
         * Properties of a Node.
         * @memberof OSMPBF
         * @interface INode
         * @property {number|Long} id Node id
         * @property {Array.<number>|null} [keys] Node keys
         * @property {Array.<number>|null} [vals] Node vals
         * @property {OSMPBF.IInfo|null} [info] Node info
         * @property {number|Long} lat Node lat
         * @property {number|Long} lon Node lon
         */

        /**
         * Constructs a new Node.
         * @memberof OSMPBF
         * @classdesc Represents a Node.
         * @implements INode
         * @constructor
         * @param {OSMPBF.INode=} [properties] Properties to set
         */
        function Node(properties) {
            this.keys = [];
            this.vals = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Node id.
         * @member {number|Long} id
         * @memberof OSMPBF.Node
         * @instance
         */
        Node.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Node keys.
         * @member {Array.<number>} keys
         * @memberof OSMPBF.Node
         * @instance
         */
        Node.prototype.keys = $util.emptyArray;

        /**
         * Node vals.
         * @member {Array.<number>} vals
         * @memberof OSMPBF.Node
         * @instance
         */
        Node.prototype.vals = $util.emptyArray;

        /**
         * Node info.
         * @member {OSMPBF.IInfo|null|undefined} info
         * @memberof OSMPBF.Node
         * @instance
         */
        Node.prototype.info = null;

        /**
         * Node lat.
         * @member {number|Long} lat
         * @memberof OSMPBF.Node
         * @instance
         */
        Node.prototype.lat = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Node lon.
         * @member {number|Long} lon
         * @memberof OSMPBF.Node
         * @instance
         */
        Node.prototype.lon = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Creates a new Node instance using the specified properties.
         * @function create
         * @memberof OSMPBF.Node
         * @static
         * @param {OSMPBF.INode=} [properties] Properties to set
         * @returns {OSMPBF.Node} Node instance
         */
        Node.create = function create(properties) {
            return new Node(properties);
        };

        /**
         * Encodes the specified Node message. Does not implicitly {@link OSMPBF.Node.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.Node
         * @static
         * @param {OSMPBF.INode} message Node message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Node.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 0 =*/8).sint64(message.id);
            if (message.keys != null && message.keys.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.keys.length; ++i)
                    writer.uint32(message.keys[i]);
                writer.ldelim();
            }
            if (message.vals != null && message.vals.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (var i = 0; i < message.vals.length; ++i)
                    writer.uint32(message.vals[i]);
                writer.ldelim();
            }
            if (message.info != null && message.hasOwnProperty("info"))
                $root.OSMPBF.Info.encode(message.info, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            writer.uint32(/* id 8, wireType 0 =*/64).sint64(message.lat);
            writer.uint32(/* id 9, wireType 0 =*/72).sint64(message.lon);
            return writer;
        };

        /**
         * Encodes the specified Node message, length delimited. Does not implicitly {@link OSMPBF.Node.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.Node
         * @static
         * @param {OSMPBF.INode} message Node message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Node.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Node message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.Node
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.Node} Node
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Node.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.Node();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.id = reader.sint64();
                    break;
                case 2:
                    if (!(message.keys && message.keys.length))
                        message.keys = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.keys.push(reader.uint32());
                    } else
                        message.keys.push(reader.uint32());
                    break;
                case 3:
                    if (!(message.vals && message.vals.length))
                        message.vals = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.vals.push(reader.uint32());
                    } else
                        message.vals.push(reader.uint32());
                    break;
                case 4:
                    message.info = $root.OSMPBF.Info.decode(reader, reader.uint32());
                    break;
                case 8:
                    message.lat = reader.sint64();
                    break;
                case 9:
                    message.lon = reader.sint64();
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("id"))
                throw $util.ProtocolError("missing required 'id'", { instance: message });
            if (!message.hasOwnProperty("lat"))
                throw $util.ProtocolError("missing required 'lat'", { instance: message });
            if (!message.hasOwnProperty("lon"))
                throw $util.ProtocolError("missing required 'lon'", { instance: message });
            return message;
        };

        /**
         * Decodes a Node message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.Node
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.Node} Node
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Node.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Node message.
         * @function verify
         * @memberof OSMPBF.Node
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Node.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                return "id: integer|Long expected";
            if (message.keys != null && message.hasOwnProperty("keys")) {
                if (!Array.isArray(message.keys))
                    return "keys: array expected";
                for (var i = 0; i < message.keys.length; ++i)
                    if (!$util.isInteger(message.keys[i]))
                        return "keys: integer[] expected";
            }
            if (message.vals != null && message.hasOwnProperty("vals")) {
                if (!Array.isArray(message.vals))
                    return "vals: array expected";
                for (var i = 0; i < message.vals.length; ++i)
                    if (!$util.isInteger(message.vals[i]))
                        return "vals: integer[] expected";
            }
            if (message.info != null && message.hasOwnProperty("info")) {
                var error = $root.OSMPBF.Info.verify(message.info);
                if (error)
                    return "info." + error;
            }
            if (!$util.isInteger(message.lat) && !(message.lat && $util.isInteger(message.lat.low) && $util.isInteger(message.lat.high)))
                return "lat: integer|Long expected";
            if (!$util.isInteger(message.lon) && !(message.lon && $util.isInteger(message.lon.low) && $util.isInteger(message.lon.high)))
                return "lon: integer|Long expected";
            return null;
        };

        /**
         * Creates a Node message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.Node
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.Node} Node
         */
        Node.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.Node)
                return object;
            var message = new $root.OSMPBF.Node();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.keys) {
                if (!Array.isArray(object.keys))
                    throw TypeError(".OSMPBF.Node.keys: array expected");
                message.keys = [];
                for (var i = 0; i < object.keys.length; ++i)
                    message.keys[i] = object.keys[i] >>> 0;
            }
            if (object.vals) {
                if (!Array.isArray(object.vals))
                    throw TypeError(".OSMPBF.Node.vals: array expected");
                message.vals = [];
                for (var i = 0; i < object.vals.length; ++i)
                    message.vals[i] = object.vals[i] >>> 0;
            }
            if (object.info != null) {
                if (typeof object.info !== "object")
                    throw TypeError(".OSMPBF.Node.info: object expected");
                message.info = $root.OSMPBF.Info.fromObject(object.info);
            }
            if (object.lat != null)
                if ($util.Long)
                    (message.lat = $util.Long.fromValue(object.lat)).unsigned = false;
                else if (typeof object.lat === "string")
                    message.lat = parseInt(object.lat, 10);
                else if (typeof object.lat === "number")
                    message.lat = object.lat;
                else if (typeof object.lat === "object")
                    message.lat = new $util.LongBits(object.lat.low >>> 0, object.lat.high >>> 0).toNumber();
            if (object.lon != null)
                if ($util.Long)
                    (message.lon = $util.Long.fromValue(object.lon)).unsigned = false;
                else if (typeof object.lon === "string")
                    message.lon = parseInt(object.lon, 10);
                else if (typeof object.lon === "number")
                    message.lon = object.lon;
                else if (typeof object.lon === "object")
                    message.lon = new $util.LongBits(object.lon.low >>> 0, object.lon.high >>> 0).toNumber();
            return message;
        };

        /**
         * Creates a plain object from a Node message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.Node
         * @static
         * @param {OSMPBF.Node} message Node
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Node.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.keys = [];
                object.vals = [];
            }
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
                object.info = null;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.lat = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.lat = options.longs === String ? "0" : 0;
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.lon = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.lon = options.longs === String ? "0" : 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.keys && message.keys.length) {
                object.keys = [];
                for (var j = 0; j < message.keys.length; ++j)
                    object.keys[j] = message.keys[j];
            }
            if (message.vals && message.vals.length) {
                object.vals = [];
                for (var j = 0; j < message.vals.length; ++j)
                    object.vals[j] = message.vals[j];
            }
            if (message.info != null && message.hasOwnProperty("info"))
                object.info = $root.OSMPBF.Info.toObject(message.info, options);
            if (message.lat != null && message.hasOwnProperty("lat"))
                if (typeof message.lat === "number")
                    object.lat = options.longs === String ? String(message.lat) : message.lat;
                else
                    object.lat = options.longs === String ? $util.Long.prototype.toString.call(message.lat) : options.longs === Number ? new $util.LongBits(message.lat.low >>> 0, message.lat.high >>> 0).toNumber() : message.lat;
            if (message.lon != null && message.hasOwnProperty("lon"))
                if (typeof message.lon === "number")
                    object.lon = options.longs === String ? String(message.lon) : message.lon;
                else
                    object.lon = options.longs === String ? $util.Long.prototype.toString.call(message.lon) : options.longs === Number ? new $util.LongBits(message.lon.low >>> 0, message.lon.high >>> 0).toNumber() : message.lon;
            return object;
        };

        /**
         * Converts this Node to JSON.
         * @function toJSON
         * @memberof OSMPBF.Node
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Node.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Node;
    })();

    OSMPBF.DenseNodes = (function() {

        /**
         * Properties of a DenseNodes.
         * @memberof OSMPBF
         * @interface IDenseNodes
         * @property {Array.<number|Long>|null} [id] DenseNodes id
         * @property {OSMPBF.IDenseInfo|null} [denseinfo] DenseNodes denseinfo
         * @property {Array.<number|Long>|null} [lat] DenseNodes lat
         * @property {Array.<number|Long>|null} [lon] DenseNodes lon
         * @property {Array.<number>|null} [keysVals] DenseNodes keysVals
         */

        /**
         * Constructs a new DenseNodes.
         * @memberof OSMPBF
         * @classdesc Represents a DenseNodes.
         * @implements IDenseNodes
         * @constructor
         * @param {OSMPBF.IDenseNodes=} [properties] Properties to set
         */
        function DenseNodes(properties) {
            this.id = [];
            this.lat = [];
            this.lon = [];
            this.keysVals = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DenseNodes id.
         * @member {Array.<number|Long>} id
         * @memberof OSMPBF.DenseNodes
         * @instance
         */
        DenseNodes.prototype.id = $util.emptyArray;

        /**
         * DenseNodes denseinfo.
         * @member {OSMPBF.IDenseInfo|null|undefined} denseinfo
         * @memberof OSMPBF.DenseNodes
         * @instance
         */
        DenseNodes.prototype.denseinfo = null;

        /**
         * DenseNodes lat.
         * @member {Array.<number|Long>} lat
         * @memberof OSMPBF.DenseNodes
         * @instance
         */
        DenseNodes.prototype.lat = $util.emptyArray;

        /**
         * DenseNodes lon.
         * @member {Array.<number|Long>} lon
         * @memberof OSMPBF.DenseNodes
         * @instance
         */
        DenseNodes.prototype.lon = $util.emptyArray;

        /**
         * DenseNodes keysVals.
         * @member {Array.<number>} keysVals
         * @memberof OSMPBF.DenseNodes
         * @instance
         */
        DenseNodes.prototype.keysVals = $util.emptyArray;

        /**
         * Creates a new DenseNodes instance using the specified properties.
         * @function create
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {OSMPBF.IDenseNodes=} [properties] Properties to set
         * @returns {OSMPBF.DenseNodes} DenseNodes instance
         */
        DenseNodes.create = function create(properties) {
            return new DenseNodes(properties);
        };

        /**
         * Encodes the specified DenseNodes message. Does not implicitly {@link OSMPBF.DenseNodes.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {OSMPBF.IDenseNodes} message DenseNodes message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DenseNodes.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && message.id.length) {
                writer.uint32(/* id 1, wireType 2 =*/10).fork();
                for (var i = 0; i < message.id.length; ++i)
                    writer.sint64(message.id[i]);
                writer.ldelim();
            }
            if (message.denseinfo != null && message.hasOwnProperty("denseinfo"))
                $root.OSMPBF.DenseInfo.encode(message.denseinfo, writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            if (message.lat != null && message.lat.length) {
                writer.uint32(/* id 8, wireType 2 =*/66).fork();
                for (var i = 0; i < message.lat.length; ++i)
                    writer.sint64(message.lat[i]);
                writer.ldelim();
            }
            if (message.lon != null && message.lon.length) {
                writer.uint32(/* id 9, wireType 2 =*/74).fork();
                for (var i = 0; i < message.lon.length; ++i)
                    writer.sint64(message.lon[i]);
                writer.ldelim();
            }
            if (message.keysVals != null && message.keysVals.length) {
                writer.uint32(/* id 10, wireType 2 =*/82).fork();
                for (var i = 0; i < message.keysVals.length; ++i)
                    writer.int32(message.keysVals[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified DenseNodes message, length delimited. Does not implicitly {@link OSMPBF.DenseNodes.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {OSMPBF.IDenseNodes} message DenseNodes message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DenseNodes.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DenseNodes message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.DenseNodes} DenseNodes
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DenseNodes.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.DenseNodes();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    if (!(message.id && message.id.length))
                        message.id = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.id.push(reader.sint64());
                    } else
                        message.id.push(reader.sint64());
                    break;
                case 5:
                    message.denseinfo = $root.OSMPBF.DenseInfo.decode(reader, reader.uint32());
                    break;
                case 8:
                    if (!(message.lat && message.lat.length))
                        message.lat = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.lat.push(reader.sint64());
                    } else
                        message.lat.push(reader.sint64());
                    break;
                case 9:
                    if (!(message.lon && message.lon.length))
                        message.lon = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.lon.push(reader.sint64());
                    } else
                        message.lon.push(reader.sint64());
                    break;
                case 10:
                    if (!(message.keysVals && message.keysVals.length))
                        message.keysVals = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.keysVals.push(reader.int32());
                    } else
                        message.keysVals.push(reader.int32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DenseNodes message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.DenseNodes} DenseNodes
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DenseNodes.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DenseNodes message.
         * @function verify
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DenseNodes.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id")) {
                if (!Array.isArray(message.id))
                    return "id: array expected";
                for (var i = 0; i < message.id.length; ++i)
                    if (!$util.isInteger(message.id[i]) && !(message.id[i] && $util.isInteger(message.id[i].low) && $util.isInteger(message.id[i].high)))
                        return "id: integer|Long[] expected";
            }
            if (message.denseinfo != null && message.hasOwnProperty("denseinfo")) {
                var error = $root.OSMPBF.DenseInfo.verify(message.denseinfo);
                if (error)
                    return "denseinfo." + error;
            }
            if (message.lat != null && message.hasOwnProperty("lat")) {
                if (!Array.isArray(message.lat))
                    return "lat: array expected";
                for (var i = 0; i < message.lat.length; ++i)
                    if (!$util.isInteger(message.lat[i]) && !(message.lat[i] && $util.isInteger(message.lat[i].low) && $util.isInteger(message.lat[i].high)))
                        return "lat: integer|Long[] expected";
            }
            if (message.lon != null && message.hasOwnProperty("lon")) {
                if (!Array.isArray(message.lon))
                    return "lon: array expected";
                for (var i = 0; i < message.lon.length; ++i)
                    if (!$util.isInteger(message.lon[i]) && !(message.lon[i] && $util.isInteger(message.lon[i].low) && $util.isInteger(message.lon[i].high)))
                        return "lon: integer|Long[] expected";
            }
            if (message.keysVals != null && message.hasOwnProperty("keysVals")) {
                if (!Array.isArray(message.keysVals))
                    return "keysVals: array expected";
                for (var i = 0; i < message.keysVals.length; ++i)
                    if (!$util.isInteger(message.keysVals[i]))
                        return "keysVals: integer[] expected";
            }
            return null;
        };

        /**
         * Creates a DenseNodes message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.DenseNodes} DenseNodes
         */
        DenseNodes.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.DenseNodes)
                return object;
            var message = new $root.OSMPBF.DenseNodes();
            if (object.id) {
                if (!Array.isArray(object.id))
                    throw TypeError(".OSMPBF.DenseNodes.id: array expected");
                message.id = [];
                for (var i = 0; i < object.id.length; ++i)
                    if ($util.Long)
                        (message.id[i] = $util.Long.fromValue(object.id[i])).unsigned = false;
                    else if (typeof object.id[i] === "string")
                        message.id[i] = parseInt(object.id[i], 10);
                    else if (typeof object.id[i] === "number")
                        message.id[i] = object.id[i];
                    else if (typeof object.id[i] === "object")
                        message.id[i] = new $util.LongBits(object.id[i].low >>> 0, object.id[i].high >>> 0).toNumber();
            }
            if (object.denseinfo != null) {
                if (typeof object.denseinfo !== "object")
                    throw TypeError(".OSMPBF.DenseNodes.denseinfo: object expected");
                message.denseinfo = $root.OSMPBF.DenseInfo.fromObject(object.denseinfo);
            }
            if (object.lat) {
                if (!Array.isArray(object.lat))
                    throw TypeError(".OSMPBF.DenseNodes.lat: array expected");
                message.lat = [];
                for (var i = 0; i < object.lat.length; ++i)
                    if ($util.Long)
                        (message.lat[i] = $util.Long.fromValue(object.lat[i])).unsigned = false;
                    else if (typeof object.lat[i] === "string")
                        message.lat[i] = parseInt(object.lat[i], 10);
                    else if (typeof object.lat[i] === "number")
                        message.lat[i] = object.lat[i];
                    else if (typeof object.lat[i] === "object")
                        message.lat[i] = new $util.LongBits(object.lat[i].low >>> 0, object.lat[i].high >>> 0).toNumber();
            }
            if (object.lon) {
                if (!Array.isArray(object.lon))
                    throw TypeError(".OSMPBF.DenseNodes.lon: array expected");
                message.lon = [];
                for (var i = 0; i < object.lon.length; ++i)
                    if ($util.Long)
                        (message.lon[i] = $util.Long.fromValue(object.lon[i])).unsigned = false;
                    else if (typeof object.lon[i] === "string")
                        message.lon[i] = parseInt(object.lon[i], 10);
                    else if (typeof object.lon[i] === "number")
                        message.lon[i] = object.lon[i];
                    else if (typeof object.lon[i] === "object")
                        message.lon[i] = new $util.LongBits(object.lon[i].low >>> 0, object.lon[i].high >>> 0).toNumber();
            }
            if (object.keysVals) {
                if (!Array.isArray(object.keysVals))
                    throw TypeError(".OSMPBF.DenseNodes.keysVals: array expected");
                message.keysVals = [];
                for (var i = 0; i < object.keysVals.length; ++i)
                    message.keysVals[i] = object.keysVals[i] | 0;
            }
            return message;
        };

        /**
         * Creates a plain object from a DenseNodes message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.DenseNodes
         * @static
         * @param {OSMPBF.DenseNodes} message DenseNodes
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DenseNodes.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.id = [];
                object.lat = [];
                object.lon = [];
                object.keysVals = [];
            }
            if (options.defaults)
                object.denseinfo = null;
            if (message.id && message.id.length) {
                object.id = [];
                for (var j = 0; j < message.id.length; ++j)
                    if (typeof message.id[j] === "number")
                        object.id[j] = options.longs === String ? String(message.id[j]) : message.id[j];
                    else
                        object.id[j] = options.longs === String ? $util.Long.prototype.toString.call(message.id[j]) : options.longs === Number ? new $util.LongBits(message.id[j].low >>> 0, message.id[j].high >>> 0).toNumber() : message.id[j];
            }
            if (message.denseinfo != null && message.hasOwnProperty("denseinfo"))
                object.denseinfo = $root.OSMPBF.DenseInfo.toObject(message.denseinfo, options);
            if (message.lat && message.lat.length) {
                object.lat = [];
                for (var j = 0; j < message.lat.length; ++j)
                    if (typeof message.lat[j] === "number")
                        object.lat[j] = options.longs === String ? String(message.lat[j]) : message.lat[j];
                    else
                        object.lat[j] = options.longs === String ? $util.Long.prototype.toString.call(message.lat[j]) : options.longs === Number ? new $util.LongBits(message.lat[j].low >>> 0, message.lat[j].high >>> 0).toNumber() : message.lat[j];
            }
            if (message.lon && message.lon.length) {
                object.lon = [];
                for (var j = 0; j < message.lon.length; ++j)
                    if (typeof message.lon[j] === "number")
                        object.lon[j] = options.longs === String ? String(message.lon[j]) : message.lon[j];
                    else
                        object.lon[j] = options.longs === String ? $util.Long.prototype.toString.call(message.lon[j]) : options.longs === Number ? new $util.LongBits(message.lon[j].low >>> 0, message.lon[j].high >>> 0).toNumber() : message.lon[j];
            }
            if (message.keysVals && message.keysVals.length) {
                object.keysVals = [];
                for (var j = 0; j < message.keysVals.length; ++j)
                    object.keysVals[j] = message.keysVals[j];
            }
            return object;
        };

        /**
         * Converts this DenseNodes to JSON.
         * @function toJSON
         * @memberof OSMPBF.DenseNodes
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DenseNodes.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return DenseNodes;
    })();

    OSMPBF.Way = (function() {

        /**
         * Properties of a Way.
         * @memberof OSMPBF
         * @interface IWay
         * @property {number|Long} id Way id
         * @property {Array.<number>|null} [keys] Way keys
         * @property {Array.<number>|null} [vals] Way vals
         * @property {OSMPBF.IInfo|null} [info] Way info
         * @property {Array.<number|Long>|null} [refs] Way refs
         */

        /**
         * Constructs a new Way.
         * @memberof OSMPBF
         * @classdesc Represents a Way.
         * @implements IWay
         * @constructor
         * @param {OSMPBF.IWay=} [properties] Properties to set
         */
        function Way(properties) {
            this.keys = [];
            this.vals = [];
            this.refs = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Way id.
         * @member {number|Long} id
         * @memberof OSMPBF.Way
         * @instance
         */
        Way.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Way keys.
         * @member {Array.<number>} keys
         * @memberof OSMPBF.Way
         * @instance
         */
        Way.prototype.keys = $util.emptyArray;

        /**
         * Way vals.
         * @member {Array.<number>} vals
         * @memberof OSMPBF.Way
         * @instance
         */
        Way.prototype.vals = $util.emptyArray;

        /**
         * Way info.
         * @member {OSMPBF.IInfo|null|undefined} info
         * @memberof OSMPBF.Way
         * @instance
         */
        Way.prototype.info = null;

        /**
         * Way refs.
         * @member {Array.<number|Long>} refs
         * @memberof OSMPBF.Way
         * @instance
         */
        Way.prototype.refs = $util.emptyArray;

        /**
         * Creates a new Way instance using the specified properties.
         * @function create
         * @memberof OSMPBF.Way
         * @static
         * @param {OSMPBF.IWay=} [properties] Properties to set
         * @returns {OSMPBF.Way} Way instance
         */
        Way.create = function create(properties) {
            return new Way(properties);
        };

        /**
         * Encodes the specified Way message. Does not implicitly {@link OSMPBF.Way.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.Way
         * @static
         * @param {OSMPBF.IWay} message Way message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Way.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 0 =*/8).int64(message.id);
            if (message.keys != null && message.keys.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.keys.length; ++i)
                    writer.uint32(message.keys[i]);
                writer.ldelim();
            }
            if (message.vals != null && message.vals.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (var i = 0; i < message.vals.length; ++i)
                    writer.uint32(message.vals[i]);
                writer.ldelim();
            }
            if (message.info != null && message.hasOwnProperty("info"))
                $root.OSMPBF.Info.encode(message.info, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.refs != null && message.refs.length) {
                writer.uint32(/* id 8, wireType 2 =*/66).fork();
                for (var i = 0; i < message.refs.length; ++i)
                    writer.sint64(message.refs[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified Way message, length delimited. Does not implicitly {@link OSMPBF.Way.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.Way
         * @static
         * @param {OSMPBF.IWay} message Way message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Way.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Way message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.Way
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.Way} Way
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Way.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.Way();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.id = reader.int64();
                    break;
                case 2:
                    if (!(message.keys && message.keys.length))
                        message.keys = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.keys.push(reader.uint32());
                    } else
                        message.keys.push(reader.uint32());
                    break;
                case 3:
                    if (!(message.vals && message.vals.length))
                        message.vals = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.vals.push(reader.uint32());
                    } else
                        message.vals.push(reader.uint32());
                    break;
                case 4:
                    message.info = $root.OSMPBF.Info.decode(reader, reader.uint32());
                    break;
                case 8:
                    if (!(message.refs && message.refs.length))
                        message.refs = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.refs.push(reader.sint64());
                    } else
                        message.refs.push(reader.sint64());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("id"))
                throw $util.ProtocolError("missing required 'id'", { instance: message });
            return message;
        };

        /**
         * Decodes a Way message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.Way
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.Way} Way
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Way.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Way message.
         * @function verify
         * @memberof OSMPBF.Way
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Way.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                return "id: integer|Long expected";
            if (message.keys != null && message.hasOwnProperty("keys")) {
                if (!Array.isArray(message.keys))
                    return "keys: array expected";
                for (var i = 0; i < message.keys.length; ++i)
                    if (!$util.isInteger(message.keys[i]))
                        return "keys: integer[] expected";
            }
            if (message.vals != null && message.hasOwnProperty("vals")) {
                if (!Array.isArray(message.vals))
                    return "vals: array expected";
                for (var i = 0; i < message.vals.length; ++i)
                    if (!$util.isInteger(message.vals[i]))
                        return "vals: integer[] expected";
            }
            if (message.info != null && message.hasOwnProperty("info")) {
                var error = $root.OSMPBF.Info.verify(message.info);
                if (error)
                    return "info." + error;
            }
            if (message.refs != null && message.hasOwnProperty("refs")) {
                if (!Array.isArray(message.refs))
                    return "refs: array expected";
                for (var i = 0; i < message.refs.length; ++i)
                    if (!$util.isInteger(message.refs[i]) && !(message.refs[i] && $util.isInteger(message.refs[i].low) && $util.isInteger(message.refs[i].high)))
                        return "refs: integer|Long[] expected";
            }
            return null;
        };

        /**
         * Creates a Way message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.Way
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.Way} Way
         */
        Way.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.Way)
                return object;
            var message = new $root.OSMPBF.Way();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.keys) {
                if (!Array.isArray(object.keys))
                    throw TypeError(".OSMPBF.Way.keys: array expected");
                message.keys = [];
                for (var i = 0; i < object.keys.length; ++i)
                    message.keys[i] = object.keys[i] >>> 0;
            }
            if (object.vals) {
                if (!Array.isArray(object.vals))
                    throw TypeError(".OSMPBF.Way.vals: array expected");
                message.vals = [];
                for (var i = 0; i < object.vals.length; ++i)
                    message.vals[i] = object.vals[i] >>> 0;
            }
            if (object.info != null) {
                if (typeof object.info !== "object")
                    throw TypeError(".OSMPBF.Way.info: object expected");
                message.info = $root.OSMPBF.Info.fromObject(object.info);
            }
            if (object.refs) {
                if (!Array.isArray(object.refs))
                    throw TypeError(".OSMPBF.Way.refs: array expected");
                message.refs = [];
                for (var i = 0; i < object.refs.length; ++i)
                    if ($util.Long)
                        (message.refs[i] = $util.Long.fromValue(object.refs[i])).unsigned = false;
                    else if (typeof object.refs[i] === "string")
                        message.refs[i] = parseInt(object.refs[i], 10);
                    else if (typeof object.refs[i] === "number")
                        message.refs[i] = object.refs[i];
                    else if (typeof object.refs[i] === "object")
                        message.refs[i] = new $util.LongBits(object.refs[i].low >>> 0, object.refs[i].high >>> 0).toNumber();
            }
            return message;
        };

        /**
         * Creates a plain object from a Way message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.Way
         * @static
         * @param {OSMPBF.Way} message Way
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Way.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.keys = [];
                object.vals = [];
                object.refs = [];
            }
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
                object.info = null;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.keys && message.keys.length) {
                object.keys = [];
                for (var j = 0; j < message.keys.length; ++j)
                    object.keys[j] = message.keys[j];
            }
            if (message.vals && message.vals.length) {
                object.vals = [];
                for (var j = 0; j < message.vals.length; ++j)
                    object.vals[j] = message.vals[j];
            }
            if (message.info != null && message.hasOwnProperty("info"))
                object.info = $root.OSMPBF.Info.toObject(message.info, options);
            if (message.refs && message.refs.length) {
                object.refs = [];
                for (var j = 0; j < message.refs.length; ++j)
                    if (typeof message.refs[j] === "number")
                        object.refs[j] = options.longs === String ? String(message.refs[j]) : message.refs[j];
                    else
                        object.refs[j] = options.longs === String ? $util.Long.prototype.toString.call(message.refs[j]) : options.longs === Number ? new $util.LongBits(message.refs[j].low >>> 0, message.refs[j].high >>> 0).toNumber() : message.refs[j];
            }
            return object;
        };

        /**
         * Converts this Way to JSON.
         * @function toJSON
         * @memberof OSMPBF.Way
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Way.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        return Way;
    })();

    OSMPBF.Relation = (function() {

        /**
         * Properties of a Relation.
         * @memberof OSMPBF
         * @interface IRelation
         * @property {number|Long} id Relation id
         * @property {Array.<number>|null} [keys] Relation keys
         * @property {Array.<number>|null} [vals] Relation vals
         * @property {OSMPBF.IInfo|null} [info] Relation info
         * @property {Array.<number>|null} [rolesSid] Relation rolesSid
         * @property {Array.<number|Long>|null} [memids] Relation memids
         * @property {Array.<OSMPBF.Relation.MemberType>|null} [types] Relation types
         */

        /**
         * Constructs a new Relation.
         * @memberof OSMPBF
         * @classdesc Represents a Relation.
         * @implements IRelation
         * @constructor
         * @param {OSMPBF.IRelation=} [properties] Properties to set
         */
        function Relation(properties) {
            this.keys = [];
            this.vals = [];
            this.rolesSid = [];
            this.memids = [];
            this.types = [];
            if (properties)
                for (var keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Relation id.
         * @member {number|Long} id
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.id = $util.Long ? $util.Long.fromBits(0,0,false) : 0;

        /**
         * Relation keys.
         * @member {Array.<number>} keys
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.keys = $util.emptyArray;

        /**
         * Relation vals.
         * @member {Array.<number>} vals
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.vals = $util.emptyArray;

        /**
         * Relation info.
         * @member {OSMPBF.IInfo|null|undefined} info
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.info = null;

        /**
         * Relation rolesSid.
         * @member {Array.<number>} rolesSid
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.rolesSid = $util.emptyArray;

        /**
         * Relation memids.
         * @member {Array.<number|Long>} memids
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.memids = $util.emptyArray;

        /**
         * Relation types.
         * @member {Array.<OSMPBF.Relation.MemberType>} types
         * @memberof OSMPBF.Relation
         * @instance
         */
        Relation.prototype.types = $util.emptyArray;

        /**
         * Creates a new Relation instance using the specified properties.
         * @function create
         * @memberof OSMPBF.Relation
         * @static
         * @param {OSMPBF.IRelation=} [properties] Properties to set
         * @returns {OSMPBF.Relation} Relation instance
         */
        Relation.create = function create(properties) {
            return new Relation(properties);
        };

        /**
         * Encodes the specified Relation message. Does not implicitly {@link OSMPBF.Relation.verify|verify} messages.
         * @function encode
         * @memberof OSMPBF.Relation
         * @static
         * @param {OSMPBF.IRelation} message Relation message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Relation.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            writer.uint32(/* id 1, wireType 0 =*/8).int64(message.id);
            if (message.keys != null && message.keys.length) {
                writer.uint32(/* id 2, wireType 2 =*/18).fork();
                for (var i = 0; i < message.keys.length; ++i)
                    writer.uint32(message.keys[i]);
                writer.ldelim();
            }
            if (message.vals != null && message.vals.length) {
                writer.uint32(/* id 3, wireType 2 =*/26).fork();
                for (var i = 0; i < message.vals.length; ++i)
                    writer.uint32(message.vals[i]);
                writer.ldelim();
            }
            if (message.info != null && message.hasOwnProperty("info"))
                $root.OSMPBF.Info.encode(message.info, writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.rolesSid != null && message.rolesSid.length) {
                writer.uint32(/* id 8, wireType 2 =*/66).fork();
                for (var i = 0; i < message.rolesSid.length; ++i)
                    writer.int32(message.rolesSid[i]);
                writer.ldelim();
            }
            if (message.memids != null && message.memids.length) {
                writer.uint32(/* id 9, wireType 2 =*/74).fork();
                for (var i = 0; i < message.memids.length; ++i)
                    writer.sint64(message.memids[i]);
                writer.ldelim();
            }
            if (message.types != null && message.types.length) {
                writer.uint32(/* id 10, wireType 2 =*/82).fork();
                for (var i = 0; i < message.types.length; ++i)
                    writer.int32(message.types[i]);
                writer.ldelim();
            }
            return writer;
        };

        /**
         * Encodes the specified Relation message, length delimited. Does not implicitly {@link OSMPBF.Relation.verify|verify} messages.
         * @function encodeDelimited
         * @memberof OSMPBF.Relation
         * @static
         * @param {OSMPBF.IRelation} message Relation message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Relation.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Relation message from the specified reader or buffer.
         * @function decode
         * @memberof OSMPBF.Relation
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {OSMPBF.Relation} Relation
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Relation.decode = function decode(reader, length) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            var end = length === undefined ? reader.len : reader.pos + length, message = new $root.OSMPBF.Relation();
            while (reader.pos < end) {
                var tag = reader.uint32();
                switch (tag >>> 3) {
                case 1:
                    message.id = reader.int64();
                    break;
                case 2:
                    if (!(message.keys && message.keys.length))
                        message.keys = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.keys.push(reader.uint32());
                    } else
                        message.keys.push(reader.uint32());
                    break;
                case 3:
                    if (!(message.vals && message.vals.length))
                        message.vals = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.vals.push(reader.uint32());
                    } else
                        message.vals.push(reader.uint32());
                    break;
                case 4:
                    message.info = $root.OSMPBF.Info.decode(reader, reader.uint32());
                    break;
                case 8:
                    if (!(message.rolesSid && message.rolesSid.length))
                        message.rolesSid = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.rolesSid.push(reader.int32());
                    } else
                        message.rolesSid.push(reader.int32());
                    break;
                case 9:
                    if (!(message.memids && message.memids.length))
                        message.memids = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.memids.push(reader.sint64());
                    } else
                        message.memids.push(reader.sint64());
                    break;
                case 10:
                    if (!(message.types && message.types.length))
                        message.types = [];
                    if ((tag & 7) === 2) {
                        var end2 = reader.uint32() + reader.pos;
                        while (reader.pos < end2)
                            message.types.push(reader.int32());
                    } else
                        message.types.push(reader.int32());
                    break;
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            if (!message.hasOwnProperty("id"))
                throw $util.ProtocolError("missing required 'id'", { instance: message });
            return message;
        };

        /**
         * Decodes a Relation message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof OSMPBF.Relation
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {OSMPBF.Relation} Relation
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Relation.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Relation message.
         * @function verify
         * @memberof OSMPBF.Relation
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Relation.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (!$util.isInteger(message.id) && !(message.id && $util.isInteger(message.id.low) && $util.isInteger(message.id.high)))
                return "id: integer|Long expected";
            if (message.keys != null && message.hasOwnProperty("keys")) {
                if (!Array.isArray(message.keys))
                    return "keys: array expected";
                for (var i = 0; i < message.keys.length; ++i)
                    if (!$util.isInteger(message.keys[i]))
                        return "keys: integer[] expected";
            }
            if (message.vals != null && message.hasOwnProperty("vals")) {
                if (!Array.isArray(message.vals))
                    return "vals: array expected";
                for (var i = 0; i < message.vals.length; ++i)
                    if (!$util.isInteger(message.vals[i]))
                        return "vals: integer[] expected";
            }
            if (message.info != null && message.hasOwnProperty("info")) {
                var error = $root.OSMPBF.Info.verify(message.info);
                if (error)
                    return "info." + error;
            }
            if (message.rolesSid != null && message.hasOwnProperty("rolesSid")) {
                if (!Array.isArray(message.rolesSid))
                    return "rolesSid: array expected";
                for (var i = 0; i < message.rolesSid.length; ++i)
                    if (!$util.isInteger(message.rolesSid[i]))
                        return "rolesSid: integer[] expected";
            }
            if (message.memids != null && message.hasOwnProperty("memids")) {
                if (!Array.isArray(message.memids))
                    return "memids: array expected";
                for (var i = 0; i < message.memids.length; ++i)
                    if (!$util.isInteger(message.memids[i]) && !(message.memids[i] && $util.isInteger(message.memids[i].low) && $util.isInteger(message.memids[i].high)))
                        return "memids: integer|Long[] expected";
            }
            if (message.types != null && message.hasOwnProperty("types")) {
                if (!Array.isArray(message.types))
                    return "types: array expected";
                for (var i = 0; i < message.types.length; ++i)
                    switch (message.types[i]) {
                    default:
                        return "types: enum value[] expected";
                    case 0:
                    case 1:
                    case 2:
                        break;
                    }
            }
            return null;
        };

        /**
         * Creates a Relation message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof OSMPBF.Relation
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {OSMPBF.Relation} Relation
         */
        Relation.fromObject = function fromObject(object) {
            if (object instanceof $root.OSMPBF.Relation)
                return object;
            var message = new $root.OSMPBF.Relation();
            if (object.id != null)
                if ($util.Long)
                    (message.id = $util.Long.fromValue(object.id)).unsigned = false;
                else if (typeof object.id === "string")
                    message.id = parseInt(object.id, 10);
                else if (typeof object.id === "number")
                    message.id = object.id;
                else if (typeof object.id === "object")
                    message.id = new $util.LongBits(object.id.low >>> 0, object.id.high >>> 0).toNumber();
            if (object.keys) {
                if (!Array.isArray(object.keys))
                    throw TypeError(".OSMPBF.Relation.keys: array expected");
                message.keys = [];
                for (var i = 0; i < object.keys.length; ++i)
                    message.keys[i] = object.keys[i] >>> 0;
            }
            if (object.vals) {
                if (!Array.isArray(object.vals))
                    throw TypeError(".OSMPBF.Relation.vals: array expected");
                message.vals = [];
                for (var i = 0; i < object.vals.length; ++i)
                    message.vals[i] = object.vals[i] >>> 0;
            }
            if (object.info != null) {
                if (typeof object.info !== "object")
                    throw TypeError(".OSMPBF.Relation.info: object expected");
                message.info = $root.OSMPBF.Info.fromObject(object.info);
            }
            if (object.rolesSid) {
                if (!Array.isArray(object.rolesSid))
                    throw TypeError(".OSMPBF.Relation.rolesSid: array expected");
                message.rolesSid = [];
                for (var i = 0; i < object.rolesSid.length; ++i)
                    message.rolesSid[i] = object.rolesSid[i] | 0;
            }
            if (object.memids) {
                if (!Array.isArray(object.memids))
                    throw TypeError(".OSMPBF.Relation.memids: array expected");
                message.memids = [];
                for (var i = 0; i < object.memids.length; ++i)
                    if ($util.Long)
                        (message.memids[i] = $util.Long.fromValue(object.memids[i])).unsigned = false;
                    else if (typeof object.memids[i] === "string")
                        message.memids[i] = parseInt(object.memids[i], 10);
                    else if (typeof object.memids[i] === "number")
                        message.memids[i] = object.memids[i];
                    else if (typeof object.memids[i] === "object")
                        message.memids[i] = new $util.LongBits(object.memids[i].low >>> 0, object.memids[i].high >>> 0).toNumber();
            }
            if (object.types) {
                if (!Array.isArray(object.types))
                    throw TypeError(".OSMPBF.Relation.types: array expected");
                message.types = [];
                for (var i = 0; i < object.types.length; ++i)
                    switch (object.types[i]) {
                    default:
                    case "NODE":
                    case 0:
                        message.types[i] = 0;
                        break;
                    case "WAY":
                    case 1:
                        message.types[i] = 1;
                        break;
                    case "RELATION":
                    case 2:
                        message.types[i] = 2;
                        break;
                    }
            }
            return message;
        };

        /**
         * Creates a plain object from a Relation message. Also converts values to other types if specified.
         * @function toObject
         * @memberof OSMPBF.Relation
         * @static
         * @param {OSMPBF.Relation} message Relation
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Relation.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            var object = {};
            if (options.arrays || options.defaults) {
                object.keys = [];
                object.vals = [];
                object.rolesSid = [];
                object.memids = [];
                object.types = [];
            }
            if (options.defaults) {
                if ($util.Long) {
                    var long = new $util.Long(0, 0, false);
                    object.id = options.longs === String ? long.toString() : options.longs === Number ? long.toNumber() : long;
                } else
                    object.id = options.longs === String ? "0" : 0;
                object.info = null;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                if (typeof message.id === "number")
                    object.id = options.longs === String ? String(message.id) : message.id;
                else
                    object.id = options.longs === String ? $util.Long.prototype.toString.call(message.id) : options.longs === Number ? new $util.LongBits(message.id.low >>> 0, message.id.high >>> 0).toNumber() : message.id;
            if (message.keys && message.keys.length) {
                object.keys = [];
                for (var j = 0; j < message.keys.length; ++j)
                    object.keys[j] = message.keys[j];
            }
            if (message.vals && message.vals.length) {
                object.vals = [];
                for (var j = 0; j < message.vals.length; ++j)
                    object.vals[j] = message.vals[j];
            }
            if (message.info != null && message.hasOwnProperty("info"))
                object.info = $root.OSMPBF.Info.toObject(message.info, options);
            if (message.rolesSid && message.rolesSid.length) {
                object.rolesSid = [];
                for (var j = 0; j < message.rolesSid.length; ++j)
                    object.rolesSid[j] = message.rolesSid[j];
            }
            if (message.memids && message.memids.length) {
                object.memids = [];
                for (var j = 0; j < message.memids.length; ++j)
                    if (typeof message.memids[j] === "number")
                        object.memids[j] = options.longs === String ? String(message.memids[j]) : message.memids[j];
                    else
                        object.memids[j] = options.longs === String ? $util.Long.prototype.toString.call(message.memids[j]) : options.longs === Number ? new $util.LongBits(message.memids[j].low >>> 0, message.memids[j].high >>> 0).toNumber() : message.memids[j];
            }
            if (message.types && message.types.length) {
                object.types = [];
                for (var j = 0; j < message.types.length; ++j)
                    object.types[j] = options.enums === String ? $root.OSMPBF.Relation.MemberType[message.types[j]] : message.types[j];
            }
            return object;
        };

        /**
         * Converts this Relation to JSON.
         * @function toJSON
         * @memberof OSMPBF.Relation
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Relation.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * MemberType enum.
         * @name OSMPBF.Relation.MemberType
         * @enum {string}
         * @property {number} NODE=0 NODE value
         * @property {number} WAY=1 WAY value
         * @property {number} RELATION=2 RELATION value
         */
        Relation.MemberType = (function() {
            var valuesById = {}, values = Object.create(valuesById);
            values[valuesById[0] = "NODE"] = 0;
            values[valuesById[1] = "WAY"] = 1;
            values[valuesById[2] = "RELATION"] = 2;
            return values;
        })();

        return Relation;
    })();

    return OSMPBF;
})();

module.exports = $root;

},{"protobufjs/minimal":16}],9:[function(require,module,exports){
"use strict";
module.exports = asPromise;

/**
 * Callback as used by {@link util.asPromise}.
 * @typedef asPromiseCallback
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {...*} params Additional arguments
 * @returns {undefined}
 */

/**
 * Returns a promise from a node-style callback function.
 * @memberof util
 * @param {asPromiseCallback} fn Function to call
 * @param {*} ctx Function context
 * @param {...*} params Function arguments
 * @returns {Promise<*>} Promisified function
 */
function asPromise(fn, ctx/*, varargs */) {
    var params  = new Array(arguments.length - 1),
        offset  = 0,
        index   = 2,
        pending = true;
    while (index < arguments.length)
        params[offset++] = arguments[index++];
    return new Promise(function executor(resolve, reject) {
        params[offset] = function callback(err/*, varargs */) {
            if (pending) {
                pending = false;
                if (err)
                    reject(err);
                else {
                    var params = new Array(arguments.length - 1),
                        offset = 0;
                    while (offset < params.length)
                        params[offset++] = arguments[offset];
                    resolve.apply(null, params);
                }
            }
        };
        try {
            fn.apply(ctx || null, params);
        } catch (err) {
            if (pending) {
                pending = false;
                reject(err);
            }
        }
    });
}

},{}],10:[function(require,module,exports){
"use strict";

/**
 * A minimal base64 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var base64 = exports;

/**
 * Calculates the byte length of a base64 encoded string.
 * @param {string} string Base64 encoded string
 * @returns {number} Byte length
 */
base64.length = function length(string) {
    var p = string.length;
    if (!p)
        return 0;
    var n = 0;
    while (--p % 4 > 1 && string.charAt(p) === "=")
        ++n;
    return Math.ceil(string.length * 3) / 4 - n;
};

// Base64 encoding table
var b64 = new Array(64);

// Base64 decoding table
var s64 = new Array(123);

// 65..90, 97..122, 48..57, 43, 47
for (var i = 0; i < 64;)
    s64[b64[i] = i < 26 ? i + 65 : i < 52 ? i + 71 : i < 62 ? i - 4 : i - 59 | 43] = i++;

/**
 * Encodes a buffer to a base64 encoded string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} Base64 encoded string
 */
base64.encode = function encode(buffer, start, end) {
    var parts = null,
        chunk = [];
    var i = 0, // output index
        j = 0, // goto index
        t;     // temporary
    while (start < end) {
        var b = buffer[start++];
        switch (j) {
            case 0:
                chunk[i++] = b64[b >> 2];
                t = (b & 3) << 4;
                j = 1;
                break;
            case 1:
                chunk[i++] = b64[t | b >> 4];
                t = (b & 15) << 2;
                j = 2;
                break;
            case 2:
                chunk[i++] = b64[t | b >> 6];
                chunk[i++] = b64[b & 63];
                j = 0;
                break;
        }
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (j) {
        chunk[i++] = b64[t];
        chunk[i++] = 61;
        if (j === 1)
            chunk[i++] = 61;
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

var invalidEncoding = "invalid encoding";

/**
 * Decodes a base64 encoded string to a buffer.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Number of bytes written
 * @throws {Error} If encoding is invalid
 */
base64.decode = function decode(string, buffer, offset) {
    var start = offset;
    var j = 0, // goto index
        t;     // temporary
    for (var i = 0; i < string.length;) {
        var c = string.charCodeAt(i++);
        if (c === 61 && j > 1)
            break;
        if ((c = s64[c]) === undefined)
            throw Error(invalidEncoding);
        switch (j) {
            case 0:
                t = c;
                j = 1;
                break;
            case 1:
                buffer[offset++] = t << 2 | (c & 48) >> 4;
                t = c;
                j = 2;
                break;
            case 2:
                buffer[offset++] = (t & 15) << 4 | (c & 60) >> 2;
                t = c;
                j = 3;
                break;
            case 3:
                buffer[offset++] = (t & 3) << 6 | c;
                j = 0;
                break;
        }
    }
    if (j === 1)
        throw Error(invalidEncoding);
    return offset - start;
};

/**
 * Tests if the specified string appears to be base64 encoded.
 * @param {string} string String to test
 * @returns {boolean} `true` if probably base64 encoded, otherwise false
 */
base64.test = function test(string) {
    return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(string);
};

},{}],11:[function(require,module,exports){
"use strict";
module.exports = EventEmitter;

/**
 * Constructs a new event emitter instance.
 * @classdesc A minimal event emitter.
 * @memberof util
 * @constructor
 */
function EventEmitter() {

    /**
     * Registered listeners.
     * @type {Object.<string,*>}
     * @private
     */
    this._listeners = {};
}

/**
 * Registers an event listener.
 * @param {string} evt Event name
 * @param {function} fn Listener
 * @param {*} [ctx] Listener context
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.on = function on(evt, fn, ctx) {
    (this._listeners[evt] || (this._listeners[evt] = [])).push({
        fn  : fn,
        ctx : ctx || this
    });
    return this;
};

/**
 * Removes an event listener or any matching listeners if arguments are omitted.
 * @param {string} [evt] Event name. Removes all listeners if omitted.
 * @param {function} [fn] Listener to remove. Removes all listeners of `evt` if omitted.
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.off = function off(evt, fn) {
    if (evt === undefined)
        this._listeners = {};
    else {
        if (fn === undefined)
            this._listeners[evt] = [];
        else {
            var listeners = this._listeners[evt];
            for (var i = 0; i < listeners.length;)
                if (listeners[i].fn === fn)
                    listeners.splice(i, 1);
                else
                    ++i;
        }
    }
    return this;
};

/**
 * Emits an event by calling its listeners with the specified arguments.
 * @param {string} evt Event name
 * @param {...*} args Arguments
 * @returns {util.EventEmitter} `this`
 */
EventEmitter.prototype.emit = function emit(evt) {
    var listeners = this._listeners[evt];
    if (listeners) {
        var args = [],
            i = 1;
        for (; i < arguments.length;)
            args.push(arguments[i++]);
        for (i = 0; i < listeners.length;)
            listeners[i].fn.apply(listeners[i++].ctx, args);
    }
    return this;
};

},{}],12:[function(require,module,exports){
"use strict";

module.exports = factory(factory);

/**
 * Reads / writes floats / doubles from / to buffers.
 * @name util.float
 * @namespace
 */

/**
 * Writes a 32 bit float to a buffer using little endian byte order.
 * @name util.float.writeFloatLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 32 bit float to a buffer using big endian byte order.
 * @name util.float.writeFloatBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 32 bit float from a buffer using little endian byte order.
 * @name util.float.readFloatLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 32 bit float from a buffer using big endian byte order.
 * @name util.float.readFloatBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Writes a 64 bit double to a buffer using little endian byte order.
 * @name util.float.writeDoubleLE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Writes a 64 bit double to a buffer using big endian byte order.
 * @name util.float.writeDoubleBE
 * @function
 * @param {number} val Value to write
 * @param {Uint8Array} buf Target buffer
 * @param {number} pos Target buffer offset
 * @returns {undefined}
 */

/**
 * Reads a 64 bit double from a buffer using little endian byte order.
 * @name util.float.readDoubleLE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

/**
 * Reads a 64 bit double from a buffer using big endian byte order.
 * @name util.float.readDoubleBE
 * @function
 * @param {Uint8Array} buf Source buffer
 * @param {number} pos Source buffer offset
 * @returns {number} Value read
 */

// Factory function for the purpose of node-based testing in modified global environments
function factory(exports) {

    // float: typed array
    if (typeof Float32Array !== "undefined") (function() {

        var f32 = new Float32Array([ -0 ]),
            f8b = new Uint8Array(f32.buffer),
            le  = f8b[3] === 128;

        function writeFloat_f32_cpy(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
        }

        function writeFloat_f32_rev(val, buf, pos) {
            f32[0] = val;
            buf[pos    ] = f8b[3];
            buf[pos + 1] = f8b[2];
            buf[pos + 2] = f8b[1];
            buf[pos + 3] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeFloatLE = le ? writeFloat_f32_cpy : writeFloat_f32_rev;
        /* istanbul ignore next */
        exports.writeFloatBE = le ? writeFloat_f32_rev : writeFloat_f32_cpy;

        function readFloat_f32_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            return f32[0];
        }

        function readFloat_f32_rev(buf, pos) {
            f8b[3] = buf[pos    ];
            f8b[2] = buf[pos + 1];
            f8b[1] = buf[pos + 2];
            f8b[0] = buf[pos + 3];
            return f32[0];
        }

        /* istanbul ignore next */
        exports.readFloatLE = le ? readFloat_f32_cpy : readFloat_f32_rev;
        /* istanbul ignore next */
        exports.readFloatBE = le ? readFloat_f32_rev : readFloat_f32_cpy;

    // float: ieee754
    })(); else (function() {

        function writeFloat_ieee754(writeUint, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0)
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos);
            else if (isNaN(val))
                writeUint(2143289344, buf, pos);
            else if (val > 3.4028234663852886e+38) // +-Infinity
                writeUint((sign << 31 | 2139095040) >>> 0, buf, pos);
            else if (val < 1.1754943508222875e-38) // denormal
                writeUint((sign << 31 | Math.round(val / 1.401298464324817e-45)) >>> 0, buf, pos);
            else {
                var exponent = Math.floor(Math.log(val) / Math.LN2),
                    mantissa = Math.round(val * Math.pow(2, -exponent) * 8388608) & 8388607;
                writeUint((sign << 31 | exponent + 127 << 23 | mantissa) >>> 0, buf, pos);
            }
        }

        exports.writeFloatLE = writeFloat_ieee754.bind(null, writeUintLE);
        exports.writeFloatBE = writeFloat_ieee754.bind(null, writeUintBE);

        function readFloat_ieee754(readUint, buf, pos) {
            var uint = readUint(buf, pos),
                sign = (uint >> 31) * 2 + 1,
                exponent = uint >>> 23 & 255,
                mantissa = uint & 8388607;
            return exponent === 255
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 1.401298464324817e-45 * mantissa
                : sign * Math.pow(2, exponent - 150) * (mantissa + 8388608);
        }

        exports.readFloatLE = readFloat_ieee754.bind(null, readUintLE);
        exports.readFloatBE = readFloat_ieee754.bind(null, readUintBE);

    })();

    // double: typed array
    if (typeof Float64Array !== "undefined") (function() {

        var f64 = new Float64Array([-0]),
            f8b = new Uint8Array(f64.buffer),
            le  = f8b[7] === 128;

        function writeDouble_f64_cpy(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[0];
            buf[pos + 1] = f8b[1];
            buf[pos + 2] = f8b[2];
            buf[pos + 3] = f8b[3];
            buf[pos + 4] = f8b[4];
            buf[pos + 5] = f8b[5];
            buf[pos + 6] = f8b[6];
            buf[pos + 7] = f8b[7];
        }

        function writeDouble_f64_rev(val, buf, pos) {
            f64[0] = val;
            buf[pos    ] = f8b[7];
            buf[pos + 1] = f8b[6];
            buf[pos + 2] = f8b[5];
            buf[pos + 3] = f8b[4];
            buf[pos + 4] = f8b[3];
            buf[pos + 5] = f8b[2];
            buf[pos + 6] = f8b[1];
            buf[pos + 7] = f8b[0];
        }

        /* istanbul ignore next */
        exports.writeDoubleLE = le ? writeDouble_f64_cpy : writeDouble_f64_rev;
        /* istanbul ignore next */
        exports.writeDoubleBE = le ? writeDouble_f64_rev : writeDouble_f64_cpy;

        function readDouble_f64_cpy(buf, pos) {
            f8b[0] = buf[pos    ];
            f8b[1] = buf[pos + 1];
            f8b[2] = buf[pos + 2];
            f8b[3] = buf[pos + 3];
            f8b[4] = buf[pos + 4];
            f8b[5] = buf[pos + 5];
            f8b[6] = buf[pos + 6];
            f8b[7] = buf[pos + 7];
            return f64[0];
        }

        function readDouble_f64_rev(buf, pos) {
            f8b[7] = buf[pos    ];
            f8b[6] = buf[pos + 1];
            f8b[5] = buf[pos + 2];
            f8b[4] = buf[pos + 3];
            f8b[3] = buf[pos + 4];
            f8b[2] = buf[pos + 5];
            f8b[1] = buf[pos + 6];
            f8b[0] = buf[pos + 7];
            return f64[0];
        }

        /* istanbul ignore next */
        exports.readDoubleLE = le ? readDouble_f64_cpy : readDouble_f64_rev;
        /* istanbul ignore next */
        exports.readDoubleBE = le ? readDouble_f64_rev : readDouble_f64_cpy;

    // double: ieee754
    })(); else (function() {

        function writeDouble_ieee754(writeUint, off0, off1, val, buf, pos) {
            var sign = val < 0 ? 1 : 0;
            if (sign)
                val = -val;
            if (val === 0) {
                writeUint(0, buf, pos + off0);
                writeUint(1 / val > 0 ? /* positive */ 0 : /* negative 0 */ 2147483648, buf, pos + off1);
            } else if (isNaN(val)) {
                writeUint(0, buf, pos + off0);
                writeUint(2146959360, buf, pos + off1);
            } else if (val > 1.7976931348623157e+308) { // +-Infinity
                writeUint(0, buf, pos + off0);
                writeUint((sign << 31 | 2146435072) >>> 0, buf, pos + off1);
            } else {
                var mantissa;
                if (val < 2.2250738585072014e-308) { // denormal
                    mantissa = val / 5e-324;
                    writeUint(mantissa >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | mantissa / 4294967296) >>> 0, buf, pos + off1);
                } else {
                    var exponent = Math.floor(Math.log(val) / Math.LN2);
                    if (exponent === 1024)
                        exponent = 1023;
                    mantissa = val * Math.pow(2, -exponent);
                    writeUint(mantissa * 4503599627370496 >>> 0, buf, pos + off0);
                    writeUint((sign << 31 | exponent + 1023 << 20 | mantissa * 1048576 & 1048575) >>> 0, buf, pos + off1);
                }
            }
        }

        exports.writeDoubleLE = writeDouble_ieee754.bind(null, writeUintLE, 0, 4);
        exports.writeDoubleBE = writeDouble_ieee754.bind(null, writeUintBE, 4, 0);

        function readDouble_ieee754(readUint, off0, off1, buf, pos) {
            var lo = readUint(buf, pos + off0),
                hi = readUint(buf, pos + off1);
            var sign = (hi >> 31) * 2 + 1,
                exponent = hi >>> 20 & 2047,
                mantissa = 4294967296 * (hi & 1048575) + lo;
            return exponent === 2047
                ? mantissa
                ? NaN
                : sign * Infinity
                : exponent === 0 // denormal
                ? sign * 5e-324 * mantissa
                : sign * Math.pow(2, exponent - 1075) * (mantissa + 4503599627370496);
        }

        exports.readDoubleLE = readDouble_ieee754.bind(null, readUintLE, 0, 4);
        exports.readDoubleBE = readDouble_ieee754.bind(null, readUintBE, 4, 0);

    })();

    return exports;
}

// uint helpers

function writeUintLE(val, buf, pos) {
    buf[pos    ] =  val        & 255;
    buf[pos + 1] =  val >>> 8  & 255;
    buf[pos + 2] =  val >>> 16 & 255;
    buf[pos + 3] =  val >>> 24;
}

function writeUintBE(val, buf, pos) {
    buf[pos    ] =  val >>> 24;
    buf[pos + 1] =  val >>> 16 & 255;
    buf[pos + 2] =  val >>> 8  & 255;
    buf[pos + 3] =  val        & 255;
}

function readUintLE(buf, pos) {
    return (buf[pos    ]
          | buf[pos + 1] << 8
          | buf[pos + 2] << 16
          | buf[pos + 3] << 24) >>> 0;
}

function readUintBE(buf, pos) {
    return (buf[pos    ] << 24
          | buf[pos + 1] << 16
          | buf[pos + 2] << 8
          | buf[pos + 3]) >>> 0;
}

},{}],13:[function(require,module,exports){
"use strict";
module.exports = inquire;

/**
 * Requires a module only if available.
 * @memberof util
 * @param {string} moduleName Module to require
 * @returns {?Object} Required module if available and not empty, otherwise `null`
 */
function inquire(moduleName) {
    try {
        var mod = eval("quire".replace(/^/,"re"))(moduleName); // eslint-disable-line no-eval
        if (mod && (mod.length || Object.keys(mod).length))
            return mod;
    } catch (e) {} // eslint-disable-line no-empty
    return null;
}

},{}],14:[function(require,module,exports){
"use strict";
module.exports = pool;

/**
 * An allocator as used by {@link util.pool}.
 * @typedef PoolAllocator
 * @type {function}
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */

/**
 * A slicer as used by {@link util.pool}.
 * @typedef PoolSlicer
 * @type {function}
 * @param {number} start Start offset
 * @param {number} end End offset
 * @returns {Uint8Array} Buffer slice
 * @this {Uint8Array}
 */

/**
 * A general purpose buffer pool.
 * @memberof util
 * @function
 * @param {PoolAllocator} alloc Allocator
 * @param {PoolSlicer} slice Slicer
 * @param {number} [size=8192] Slab size
 * @returns {PoolAllocator} Pooled allocator
 */
function pool(alloc, slice, size) {
    var SIZE   = size || 8192;
    var MAX    = SIZE >>> 1;
    var slab   = null;
    var offset = SIZE;
    return function pool_alloc(size) {
        if (size < 1 || size > MAX)
            return alloc(size);
        if (offset + size > SIZE) {
            slab = alloc(SIZE);
            offset = 0;
        }
        var buf = slice.call(slab, offset, offset += size);
        if (offset & 7) // align to 32 bit
            offset = (offset | 7) + 1;
        return buf;
    };
}

},{}],15:[function(require,module,exports){
"use strict";

/**
 * A minimal UTF8 implementation for number arrays.
 * @memberof util
 * @namespace
 */
var utf8 = exports;

/**
 * Calculates the UTF8 byte length of a string.
 * @param {string} string String
 * @returns {number} Byte length
 */
utf8.length = function utf8_length(string) {
    var len = 0,
        c = 0;
    for (var i = 0; i < string.length; ++i) {
        c = string.charCodeAt(i);
        if (c < 128)
            len += 1;
        else if (c < 2048)
            len += 2;
        else if ((c & 0xFC00) === 0xD800 && (string.charCodeAt(i + 1) & 0xFC00) === 0xDC00) {
            ++i;
            len += 4;
        } else
            len += 3;
    }
    return len;
};

/**
 * Reads UTF8 bytes as a string.
 * @param {Uint8Array} buffer Source buffer
 * @param {number} start Source start
 * @param {number} end Source end
 * @returns {string} String read
 */
utf8.read = function utf8_read(buffer, start, end) {
    var len = end - start;
    if (len < 1)
        return "";
    var parts = null,
        chunk = [],
        i = 0, // char offset
        t;     // temporary
    while (start < end) {
        t = buffer[start++];
        if (t < 128)
            chunk[i++] = t;
        else if (t > 191 && t < 224)
            chunk[i++] = (t & 31) << 6 | buffer[start++] & 63;
        else if (t > 239 && t < 365) {
            t = ((t & 7) << 18 | (buffer[start++] & 63) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63) - 0x10000;
            chunk[i++] = 0xD800 + (t >> 10);
            chunk[i++] = 0xDC00 + (t & 1023);
        } else
            chunk[i++] = (t & 15) << 12 | (buffer[start++] & 63) << 6 | buffer[start++] & 63;
        if (i > 8191) {
            (parts || (parts = [])).push(String.fromCharCode.apply(String, chunk));
            i = 0;
        }
    }
    if (parts) {
        if (i)
            parts.push(String.fromCharCode.apply(String, chunk.slice(0, i)));
        return parts.join("");
    }
    return String.fromCharCode.apply(String, chunk.slice(0, i));
};

/**
 * Writes a string as UTF8 bytes.
 * @param {string} string Source string
 * @param {Uint8Array} buffer Destination buffer
 * @param {number} offset Destination offset
 * @returns {number} Bytes written
 */
utf8.write = function utf8_write(string, buffer, offset) {
    var start = offset,
        c1, // character 1
        c2; // character 2
    for (var i = 0; i < string.length; ++i) {
        c1 = string.charCodeAt(i);
        if (c1 < 128) {
            buffer[offset++] = c1;
        } else if (c1 < 2048) {
            buffer[offset++] = c1 >> 6       | 192;
            buffer[offset++] = c1       & 63 | 128;
        } else if ((c1 & 0xFC00) === 0xD800 && ((c2 = string.charCodeAt(i + 1)) & 0xFC00) === 0xDC00) {
            c1 = 0x10000 + ((c1 & 0x03FF) << 10) + (c2 & 0x03FF);
            ++i;
            buffer[offset++] = c1 >> 18      | 240;
            buffer[offset++] = c1 >> 12 & 63 | 128;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        } else {
            buffer[offset++] = c1 >> 12      | 224;
            buffer[offset++] = c1 >> 6  & 63 | 128;
            buffer[offset++] = c1       & 63 | 128;
        }
    }
    return offset - start;
};

},{}],16:[function(require,module,exports){
// minimal library entry point.

"use strict";
module.exports = require("./src/index-minimal");

},{"./src/index-minimal":17}],17:[function(require,module,exports){
"use strict";
var protobuf = exports;

/**
 * Build type, one of `"full"`, `"light"` or `"minimal"`.
 * @name build
 * @type {string}
 * @const
 */
protobuf.build = "minimal";

// Serialization
protobuf.Writer       = require("./writer");
protobuf.BufferWriter = require("./writer_buffer");
protobuf.Reader       = require("./reader");
protobuf.BufferReader = require("./reader_buffer");

// Utility
protobuf.util         = require("./util/minimal");
protobuf.rpc          = require("./rpc");
protobuf.roots        = require("./roots");
protobuf.configure    = configure;

/* istanbul ignore next */
/**
 * Reconfigures the library according to the environment.
 * @returns {undefined}
 */
function configure() {
    protobuf.Reader._configure(protobuf.BufferReader);
    protobuf.util._configure();
}

// Set up buffer utility according to the environment
protobuf.Writer._configure(protobuf.BufferWriter);
configure();

},{"./reader":18,"./reader_buffer":19,"./roots":20,"./rpc":21,"./util/minimal":24,"./writer":25,"./writer_buffer":26}],18:[function(require,module,exports){
"use strict";
module.exports = Reader;

var util      = require("./util/minimal");

var BufferReader; // cyclic

var LongBits  = util.LongBits,
    utf8      = util.utf8;

/* istanbul ignore next */
function indexOutOfRange(reader, writeLength) {
    return RangeError("index out of range: " + reader.pos + " + " + (writeLength || 1) + " > " + reader.len);
}

/**
 * Constructs a new reader instance using the specified buffer.
 * @classdesc Wire format reader using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 * @param {Uint8Array} buffer Buffer to read from
 */
function Reader(buffer) {

    /**
     * Read buffer.
     * @type {Uint8Array}
     */
    this.buf = buffer;

    /**
     * Read buffer position.
     * @type {number}
     */
    this.pos = 0;

    /**
     * Read buffer length.
     * @type {number}
     */
    this.len = buffer.length;
}

var create_array = typeof Uint8Array !== "undefined"
    ? function create_typed_array(buffer) {
        if (buffer instanceof Uint8Array || Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    }
    /* istanbul ignore next */
    : function create_array(buffer) {
        if (Array.isArray(buffer))
            return new Reader(buffer);
        throw Error("illegal buffer");
    };

/**
 * Creates a new reader using the specified buffer.
 * @function
 * @param {Uint8Array|Buffer} buffer Buffer to read from
 * @returns {Reader|BufferReader} A {@link BufferReader} if `buffer` is a Buffer, otherwise a {@link Reader}
 * @throws {Error} If `buffer` is not a valid buffer
 */
Reader.create = util.Buffer
    ? function create_buffer_setup(buffer) {
        return (Reader.create = function create_buffer(buffer) {
            return util.Buffer.isBuffer(buffer)
                ? new BufferReader(buffer)
                /* istanbul ignore next */
                : create_array(buffer);
        })(buffer);
    }
    /* istanbul ignore next */
    : create_array;

Reader.prototype._slice = util.Array.prototype.subarray || /* istanbul ignore next */ util.Array.prototype.slice;

/**
 * Reads a varint as an unsigned 32 bit value.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.uint32 = (function read_uint32_setup() {
    var value = 4294967295; // optimizer type-hint, tends to deopt otherwise (?!)
    return function read_uint32() {
        value = (         this.buf[this.pos] & 127       ) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) <<  7) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 14) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] & 127) << 21) >>> 0; if (this.buf[this.pos++] < 128) return value;
        value = (value | (this.buf[this.pos] &  15) << 28) >>> 0; if (this.buf[this.pos++] < 128) return value;

        /* istanbul ignore if */
        if ((this.pos += 5) > this.len) {
            this.pos = this.len;
            throw indexOutOfRange(this, 10);
        }
        return value;
    };
})();

/**
 * Reads a varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.int32 = function read_int32() {
    return this.uint32() | 0;
};

/**
 * Reads a zig-zag encoded varint as a signed 32 bit value.
 * @returns {number} Value read
 */
Reader.prototype.sint32 = function read_sint32() {
    var value = this.uint32();
    return value >>> 1 ^ -(value & 1) | 0;
};

/* eslint-disable no-invalid-this */

function readLongVarint() {
    // tends to deopt with local vars for octet etc.
    var bits = new LongBits(0, 0);
    var i = 0;
    if (this.len - this.pos > 4) { // fast route (lo)
        for (; i < 4; ++i) {
            // 1st..4th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 5th
        bits.lo = (bits.lo | (this.buf[this.pos] & 127) << 28) >>> 0;
        bits.hi = (bits.hi | (this.buf[this.pos] & 127) >>  4) >>> 0;
        if (this.buf[this.pos++] < 128)
            return bits;
        i = 0;
    } else {
        for (; i < 3; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 1st..3th
            bits.lo = (bits.lo | (this.buf[this.pos] & 127) << i * 7) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
        // 4th
        bits.lo = (bits.lo | (this.buf[this.pos++] & 127) << i * 7) >>> 0;
        return bits;
    }
    if (this.len - this.pos > 4) { // fast route (hi)
        for (; i < 5; ++i) {
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    } else {
        for (; i < 5; ++i) {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
            // 6th..10th
            bits.hi = (bits.hi | (this.buf[this.pos] & 127) << i * 7 + 3) >>> 0;
            if (this.buf[this.pos++] < 128)
                return bits;
        }
    }
    /* istanbul ignore next */
    throw Error("invalid varint encoding");
}

/* eslint-enable no-invalid-this */

/**
 * Reads a varint as a signed 64 bit value.
 * @name Reader#int64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as an unsigned 64 bit value.
 * @name Reader#uint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a zig-zag encoded varint as a signed 64 bit value.
 * @name Reader#sint64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a varint as a boolean.
 * @returns {boolean} Value read
 */
Reader.prototype.bool = function read_bool() {
    return this.uint32() !== 0;
};

function readFixed32_end(buf, end) { // note that this uses `end`, not `pos`
    return (buf[end - 4]
          | buf[end - 3] << 8
          | buf[end - 2] << 16
          | buf[end - 1] << 24) >>> 0;
}

/**
 * Reads fixed 32 bits as an unsigned 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.fixed32 = function read_fixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4);
};

/**
 * Reads fixed 32 bits as a signed 32 bit integer.
 * @returns {number} Value read
 */
Reader.prototype.sfixed32 = function read_sfixed32() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    return readFixed32_end(this.buf, this.pos += 4) | 0;
};

/* eslint-disable no-invalid-this */

function readFixed64(/* this: Reader */) {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 8);

    return new LongBits(readFixed32_end(this.buf, this.pos += 4), readFixed32_end(this.buf, this.pos += 4));
}

/* eslint-enable no-invalid-this */

/**
 * Reads fixed 64 bits.
 * @name Reader#fixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads zig-zag encoded fixed 64 bits.
 * @name Reader#sfixed64
 * @function
 * @returns {Long} Value read
 */

/**
 * Reads a float (32 bit) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.float = function read_float() {

    /* istanbul ignore if */
    if (this.pos + 4 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readFloatLE(this.buf, this.pos);
    this.pos += 4;
    return value;
};

/**
 * Reads a double (64 bit float) as a number.
 * @function
 * @returns {number} Value read
 */
Reader.prototype.double = function read_double() {

    /* istanbul ignore if */
    if (this.pos + 8 > this.len)
        throw indexOutOfRange(this, 4);

    var value = util.float.readDoubleLE(this.buf, this.pos);
    this.pos += 8;
    return value;
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @returns {Uint8Array} Value read
 */
Reader.prototype.bytes = function read_bytes() {
    var length = this.uint32(),
        start  = this.pos,
        end    = this.pos + length;

    /* istanbul ignore if */
    if (end > this.len)
        throw indexOutOfRange(this, length);

    this.pos += length;
    if (Array.isArray(this.buf)) // plain array
        return this.buf.slice(start, end);
    return start === end // fix for IE 10/Win8 and others' subarray returning array of size 1
        ? new this.buf.constructor(0)
        : this._slice.call(this.buf, start, end);
};

/**
 * Reads a string preceeded by its byte length as a varint.
 * @returns {string} Value read
 */
Reader.prototype.string = function read_string() {
    var bytes = this.bytes();
    return utf8.read(bytes, 0, bytes.length);
};

/**
 * Skips the specified number of bytes if specified, otherwise skips a varint.
 * @param {number} [length] Length if known, otherwise a varint is assumed
 * @returns {Reader} `this`
 */
Reader.prototype.skip = function skip(length) {
    if (typeof length === "number") {
        /* istanbul ignore if */
        if (this.pos + length > this.len)
            throw indexOutOfRange(this, length);
        this.pos += length;
    } else {
        do {
            /* istanbul ignore if */
            if (this.pos >= this.len)
                throw indexOutOfRange(this);
        } while (this.buf[this.pos++] & 128);
    }
    return this;
};

/**
 * Skips the next element of the specified wire type.
 * @param {number} wireType Wire type received
 * @returns {Reader} `this`
 */
Reader.prototype.skipType = function(wireType) {
    switch (wireType) {
        case 0:
            this.skip();
            break;
        case 1:
            this.skip(8);
            break;
        case 2:
            this.skip(this.uint32());
            break;
        case 3:
            while ((wireType = this.uint32() & 7) !== 4) {
                this.skipType(wireType);
            }
            break;
        case 5:
            this.skip(4);
            break;

        /* istanbul ignore next */
        default:
            throw Error("invalid wire type " + wireType + " at offset " + this.pos);
    }
    return this;
};

Reader._configure = function(BufferReader_) {
    BufferReader = BufferReader_;

    var fn = util.Long ? "toLong" : /* istanbul ignore next */ "toNumber";
    util.merge(Reader.prototype, {

        int64: function read_int64() {
            return readLongVarint.call(this)[fn](false);
        },

        uint64: function read_uint64() {
            return readLongVarint.call(this)[fn](true);
        },

        sint64: function read_sint64() {
            return readLongVarint.call(this).zzDecode()[fn](false);
        },

        fixed64: function read_fixed64() {
            return readFixed64.call(this)[fn](true);
        },

        sfixed64: function read_sfixed64() {
            return readFixed64.call(this)[fn](false);
        }

    });
};

},{"./util/minimal":24}],19:[function(require,module,exports){
"use strict";
module.exports = BufferReader;

// extends Reader
var Reader = require("./reader");
(BufferReader.prototype = Object.create(Reader.prototype)).constructor = BufferReader;

var util = require("./util/minimal");

/**
 * Constructs a new buffer reader instance.
 * @classdesc Wire format reader using node buffers.
 * @extends Reader
 * @constructor
 * @param {Buffer} buffer Buffer to read from
 */
function BufferReader(buffer) {
    Reader.call(this, buffer);

    /**
     * Read buffer.
     * @name BufferReader#buf
     * @type {Buffer}
     */
}

/* istanbul ignore else */
if (util.Buffer)
    BufferReader.prototype._slice = util.Buffer.prototype.slice;

/**
 * @override
 */
BufferReader.prototype.string = function read_string_buffer() {
    var len = this.uint32(); // modifies pos
    return this.buf.utf8Slice(this.pos, this.pos = Math.min(this.pos + len, this.len));
};

/**
 * Reads a sequence of bytes preceeded by its length as a varint.
 * @name BufferReader#bytes
 * @function
 * @returns {Buffer} Value read
 */

},{"./reader":18,"./util/minimal":24}],20:[function(require,module,exports){
"use strict";
module.exports = {};

/**
 * Named roots.
 * This is where pbjs stores generated structures (the option `-r, --root` specifies a name).
 * Can also be used manually to make roots available accross modules.
 * @name roots
 * @type {Object.<string,Root>}
 * @example
 * // pbjs -r myroot -o compiled.js ...
 *
 * // in another module:
 * require("./compiled.js");
 *
 * // in any subsequent module:
 * var root = protobuf.roots["myroot"];
 */

},{}],21:[function(require,module,exports){
"use strict";

/**
 * Streaming RPC helpers.
 * @namespace
 */
var rpc = exports;

/**
 * RPC implementation passed to {@link Service#create} performing a service request on network level, i.e. by utilizing http requests or websockets.
 * @typedef RPCImpl
 * @type {function}
 * @param {Method|rpc.ServiceMethod<Message<{}>,Message<{}>>} method Reflected or static method being called
 * @param {Uint8Array} requestData Request data
 * @param {RPCImplCallback} callback Callback function
 * @returns {undefined}
 * @example
 * function rpcImpl(method, requestData, callback) {
 *     if (protobuf.util.lcFirst(method.name) !== "myMethod") // compatible with static code
 *         throw Error("no such method");
 *     asynchronouslyObtainAResponse(requestData, function(err, responseData) {
 *         callback(err, responseData);
 *     });
 * }
 */

/**
 * Node-style callback as used by {@link RPCImpl}.
 * @typedef RPCImplCallback
 * @type {function}
 * @param {Error|null} error Error, if any, otherwise `null`
 * @param {Uint8Array|null} [response] Response data or `null` to signal end of stream, if there hasn't been an error
 * @returns {undefined}
 */

rpc.Service = require("./rpc/service");

},{"./rpc/service":22}],22:[function(require,module,exports){
"use strict";
module.exports = Service;

var util = require("../util/minimal");

// Extends EventEmitter
(Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;

/**
 * A service method callback as used by {@link rpc.ServiceMethod|ServiceMethod}.
 *
 * Differs from {@link RPCImplCallback} in that it is an actual callback of a service method which may not return `response = null`.
 * @typedef rpc.ServiceMethodCallback
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {Error|null} error Error, if any
 * @param {TRes} [response] Response message
 * @returns {undefined}
 */

/**
 * A service method part of a {@link rpc.Service} as created by {@link Service.create}.
 * @typedef rpc.ServiceMethod
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 * @type {function}
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} [callback] Node-style callback called with the error, if any, and the response message
 * @returns {Promise<Message<TRes>>} Promise if `callback` has been omitted, otherwise `undefined`
 */

/**
 * Constructs a new RPC service instance.
 * @classdesc An RPC service as returned by {@link Service#create}.
 * @exports rpc.Service
 * @extends util.EventEmitter
 * @constructor
 * @param {RPCImpl} rpcImpl RPC implementation
 * @param {boolean} [requestDelimited=false] Whether requests are length-delimited
 * @param {boolean} [responseDelimited=false] Whether responses are length-delimited
 */
function Service(rpcImpl, requestDelimited, responseDelimited) {

    if (typeof rpcImpl !== "function")
        throw TypeError("rpcImpl must be a function");

    util.EventEmitter.call(this);

    /**
     * RPC implementation. Becomes `null` once the service is ended.
     * @type {RPCImpl|null}
     */
    this.rpcImpl = rpcImpl;

    /**
     * Whether requests are length-delimited.
     * @type {boolean}
     */
    this.requestDelimited = Boolean(requestDelimited);

    /**
     * Whether responses are length-delimited.
     * @type {boolean}
     */
    this.responseDelimited = Boolean(responseDelimited);
}

/**
 * Calls a service method through {@link rpc.Service#rpcImpl|rpcImpl}.
 * @param {Method|rpc.ServiceMethod<TReq,TRes>} method Reflected or static method
 * @param {Constructor<TReq>} requestCtor Request constructor
 * @param {Constructor<TRes>} responseCtor Response constructor
 * @param {TReq|Properties<TReq>} request Request message or plain object
 * @param {rpc.ServiceMethodCallback<TRes>} callback Service callback
 * @returns {undefined}
 * @template TReq extends Message<TReq>
 * @template TRes extends Message<TRes>
 */
Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {

    if (!request)
        throw TypeError("request must be specified");

    var self = this;
    if (!callback)
        return util.asPromise(rpcCall, self, method, requestCtor, responseCtor, request);

    if (!self.rpcImpl) {
        setTimeout(function() { callback(Error("already ended")); }, 0);
        return undefined;
    }

    try {
        return self.rpcImpl(
            method,
            requestCtor[self.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
            function rpcCallback(err, response) {

                if (err) {
                    self.emit("error", err, method);
                    return callback(err);
                }

                if (response === null) {
                    self.end(/* endedByRPC */ true);
                    return undefined;
                }

                if (!(response instanceof responseCtor)) {
                    try {
                        response = responseCtor[self.responseDelimited ? "decodeDelimited" : "decode"](response);
                    } catch (err) {
                        self.emit("error", err, method);
                        return callback(err);
                    }
                }

                self.emit("data", response, method);
                return callback(null, response);
            }
        );
    } catch (err) {
        self.emit("error", err, method);
        setTimeout(function() { callback(err); }, 0);
        return undefined;
    }
};

/**
 * Ends this service and emits the `end` event.
 * @param {boolean} [endedByRPC=false] Whether the service has been ended by the RPC implementation.
 * @returns {rpc.Service} `this`
 */
Service.prototype.end = function end(endedByRPC) {
    if (this.rpcImpl) {
        if (!endedByRPC) // signal end to rpcImpl
            this.rpcImpl(null, null, null);
        this.rpcImpl = null;
        this.emit("end").off();
    }
    return this;
};

},{"../util/minimal":24}],23:[function(require,module,exports){
"use strict";
module.exports = LongBits;

var util = require("../util/minimal");

/**
 * Constructs new long bits.
 * @classdesc Helper class for working with the low and high bits of a 64 bit value.
 * @memberof util
 * @constructor
 * @param {number} lo Low 32 bits, unsigned
 * @param {number} hi High 32 bits, unsigned
 */
function LongBits(lo, hi) {

    // note that the casts below are theoretically unnecessary as of today, but older statically
    // generated converter code might still call the ctor with signed 32bits. kept for compat.

    /**
     * Low bits.
     * @type {number}
     */
    this.lo = lo >>> 0;

    /**
     * High bits.
     * @type {number}
     */
    this.hi = hi >>> 0;
}

/**
 * Zero bits.
 * @memberof util.LongBits
 * @type {util.LongBits}
 */
var zero = LongBits.zero = new LongBits(0, 0);

zero.toNumber = function() { return 0; };
zero.zzEncode = zero.zzDecode = function() { return this; };
zero.length = function() { return 1; };

/**
 * Zero hash.
 * @memberof util.LongBits
 * @type {string}
 */
var zeroHash = LongBits.zeroHash = "\0\0\0\0\0\0\0\0";

/**
 * Constructs new long bits from the specified number.
 * @param {number} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.fromNumber = function fromNumber(value) {
    if (value === 0)
        return zero;
    var sign = value < 0;
    if (sign)
        value = -value;
    var lo = value >>> 0,
        hi = (value - lo) / 4294967296 >>> 0;
    if (sign) {
        hi = ~hi >>> 0;
        lo = ~lo >>> 0;
        if (++lo > 4294967295) {
            lo = 0;
            if (++hi > 4294967295)
                hi = 0;
        }
    }
    return new LongBits(lo, hi);
};

/**
 * Constructs new long bits from a number, long or string.
 * @param {Long|number|string} value Value
 * @returns {util.LongBits} Instance
 */
LongBits.from = function from(value) {
    if (typeof value === "number")
        return LongBits.fromNumber(value);
    if (util.isString(value)) {
        /* istanbul ignore else */
        if (util.Long)
            value = util.Long.fromString(value);
        else
            return LongBits.fromNumber(parseInt(value, 10));
    }
    return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : zero;
};

/**
 * Converts this long bits to a possibly unsafe JavaScript number.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {number} Possibly unsafe number
 */
LongBits.prototype.toNumber = function toNumber(unsigned) {
    if (!unsigned && this.hi >>> 31) {
        var lo = ~this.lo + 1 >>> 0,
            hi = ~this.hi     >>> 0;
        if (!lo)
            hi = hi + 1 >>> 0;
        return -(lo + hi * 4294967296);
    }
    return this.lo + this.hi * 4294967296;
};

/**
 * Converts this long bits to a long.
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long} Long
 */
LongBits.prototype.toLong = function toLong(unsigned) {
    return util.Long
        ? new util.Long(this.lo | 0, this.hi | 0, Boolean(unsigned))
        /* istanbul ignore next */
        : { low: this.lo | 0, high: this.hi | 0, unsigned: Boolean(unsigned) };
};

var charCodeAt = String.prototype.charCodeAt;

/**
 * Constructs new long bits from the specified 8 characters long hash.
 * @param {string} hash Hash
 * @returns {util.LongBits} Bits
 */
LongBits.fromHash = function fromHash(hash) {
    if (hash === zeroHash)
        return zero;
    return new LongBits(
        ( charCodeAt.call(hash, 0)
        | charCodeAt.call(hash, 1) << 8
        | charCodeAt.call(hash, 2) << 16
        | charCodeAt.call(hash, 3) << 24) >>> 0
    ,
        ( charCodeAt.call(hash, 4)
        | charCodeAt.call(hash, 5) << 8
        | charCodeAt.call(hash, 6) << 16
        | charCodeAt.call(hash, 7) << 24) >>> 0
    );
};

/**
 * Converts this long bits to a 8 characters long hash.
 * @returns {string} Hash
 */
LongBits.prototype.toHash = function toHash() {
    return String.fromCharCode(
        this.lo        & 255,
        this.lo >>> 8  & 255,
        this.lo >>> 16 & 255,
        this.lo >>> 24      ,
        this.hi        & 255,
        this.hi >>> 8  & 255,
        this.hi >>> 16 & 255,
        this.hi >>> 24
    );
};

/**
 * Zig-zag encodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzEncode = function zzEncode() {
    var mask =   this.hi >> 31;
    this.hi  = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
    this.lo  = ( this.lo << 1                   ^ mask) >>> 0;
    return this;
};

/**
 * Zig-zag decodes this long bits.
 * @returns {util.LongBits} `this`
 */
LongBits.prototype.zzDecode = function zzDecode() {
    var mask = -(this.lo & 1);
    this.lo  = ((this.lo >>> 1 | this.hi << 31) ^ mask) >>> 0;
    this.hi  = ( this.hi >>> 1                  ^ mask) >>> 0;
    return this;
};

/**
 * Calculates the length of this longbits when encoded as a varint.
 * @returns {number} Length
 */
LongBits.prototype.length = function length() {
    var part0 =  this.lo,
        part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
        part2 =  this.hi >>> 24;
    return part2 === 0
         ? part1 === 0
           ? part0 < 16384
             ? part0 < 128 ? 1 : 2
             : part0 < 2097152 ? 3 : 4
           : part1 < 16384
             ? part1 < 128 ? 5 : 6
             : part1 < 2097152 ? 7 : 8
         : part2 < 128 ? 9 : 10;
};

},{"../util/minimal":24}],24:[function(require,module,exports){
"use strict";
var util = exports;

// used to return a Promise where callback is omitted
util.asPromise = require("@protobufjs/aspromise");

// converts to / from base64 encoded strings
util.base64 = require("@protobufjs/base64");

// base class of rpc.Service
util.EventEmitter = require("@protobufjs/eventemitter");

// float handling accross browsers
util.float = require("@protobufjs/float");

// requires modules optionally and hides the call from bundlers
util.inquire = require("@protobufjs/inquire");

// converts to / from utf8 encoded strings
util.utf8 = require("@protobufjs/utf8");

// provides a node-like buffer pool in the browser
util.pool = require("@protobufjs/pool");

// utility to work with the low and high bits of a 64 bit value
util.LongBits = require("./longbits");

// global object reference
util.global = typeof window !== "undefined" && window
           || typeof global !== "undefined" && global
           || typeof self   !== "undefined" && self
           || this; // eslint-disable-line no-invalid-this

/**
 * An immuable empty array.
 * @memberof util
 * @type {Array.<*>}
 * @const
 */
util.emptyArray = Object.freeze ? Object.freeze([]) : /* istanbul ignore next */ []; // used on prototypes

/**
 * An immutable empty object.
 * @type {Object}
 * @const
 */
util.emptyObject = Object.freeze ? Object.freeze({}) : /* istanbul ignore next */ {}; // used on prototypes

/**
 * Whether running within node or not.
 * @memberof util
 * @type {boolean}
 * @const
 */
util.isNode = Boolean(util.global.process && util.global.process.versions && util.global.process.versions.node);

/**
 * Tests if the specified value is an integer.
 * @function
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is an integer
 */
util.isInteger = Number.isInteger || /* istanbul ignore next */ function isInteger(value) {
    return typeof value === "number" && isFinite(value) && Math.floor(value) === value;
};

/**
 * Tests if the specified value is a string.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a string
 */
util.isString = function isString(value) {
    return typeof value === "string" || value instanceof String;
};

/**
 * Tests if the specified value is a non-null object.
 * @param {*} value Value to test
 * @returns {boolean} `true` if the value is a non-null object
 */
util.isObject = function isObject(value) {
    return value && typeof value === "object";
};

/**
 * Checks if a property on a message is considered to be present.
 * This is an alias of {@link util.isSet}.
 * @function
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isset =

/**
 * Checks if a property on a message is considered to be present.
 * @param {Object} obj Plain object or message instance
 * @param {string} prop Property name
 * @returns {boolean} `true` if considered to be present, otherwise `false`
 */
util.isSet = function isSet(obj, prop) {
    var value = obj[prop];
    if (value != null && obj.hasOwnProperty(prop)) // eslint-disable-line eqeqeq, no-prototype-builtins
        return typeof value !== "object" || (Array.isArray(value) ? value.length : Object.keys(value).length) > 0;
    return false;
};

/**
 * Any compatible Buffer instance.
 * This is a minimal stand-alone definition of a Buffer instance. The actual type is that exported by node's typings.
 * @interface Buffer
 * @extends Uint8Array
 */

/**
 * Node's Buffer class if available.
 * @type {Constructor<Buffer>}
 */
util.Buffer = (function() {
    try {
        var Buffer = util.inquire("buffer").Buffer;
        // refuse to use non-node buffers if not explicitly assigned (perf reasons):
        return Buffer.prototype.utf8Write ? Buffer : /* istanbul ignore next */ null;
    } catch (e) {
        /* istanbul ignore next */
        return null;
    }
})();

// Internal alias of or polyfull for Buffer.from.
util._Buffer_from = null;

// Internal alias of or polyfill for Buffer.allocUnsafe.
util._Buffer_allocUnsafe = null;

/**
 * Creates a new buffer of whatever type supported by the environment.
 * @param {number|number[]} [sizeOrArray=0] Buffer size or number array
 * @returns {Uint8Array|Buffer} Buffer
 */
util.newBuffer = function newBuffer(sizeOrArray) {
    /* istanbul ignore next */
    return typeof sizeOrArray === "number"
        ? util.Buffer
            ? util._Buffer_allocUnsafe(sizeOrArray)
            : new util.Array(sizeOrArray)
        : util.Buffer
            ? util._Buffer_from(sizeOrArray)
            : typeof Uint8Array === "undefined"
                ? sizeOrArray
                : new Uint8Array(sizeOrArray);
};

/**
 * Array implementation used in the browser. `Uint8Array` if supported, otherwise `Array`.
 * @type {Constructor<Uint8Array>}
 */
util.Array = typeof Uint8Array !== "undefined" ? Uint8Array /* istanbul ignore next */ : Array;

/**
 * Any compatible Long instance.
 * This is a minimal stand-alone definition of a Long instance. The actual type is that exported by long.js.
 * @interface Long
 * @property {number} low Low bits
 * @property {number} high High bits
 * @property {boolean} unsigned Whether unsigned or not
 */

/**
 * Long.js's Long class if available.
 * @type {Constructor<Long>}
 */
util.Long = /* istanbul ignore next */ util.global.dcodeIO && /* istanbul ignore next */ util.global.dcodeIO.Long
         || /* istanbul ignore next */ util.global.Long
         || util.inquire("long");

/**
 * Regular expression used to verify 2 bit (`bool`) map keys.
 * @type {RegExp}
 * @const
 */
util.key2Re = /^true|false|0|1$/;

/**
 * Regular expression used to verify 32 bit (`int32` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key32Re = /^-?(?:0|[1-9][0-9]*)$/;

/**
 * Regular expression used to verify 64 bit (`int64` etc.) map keys.
 * @type {RegExp}
 * @const
 */
util.key64Re = /^(?:[\\x00-\\xff]{8}|-?(?:0|[1-9][0-9]*))$/;

/**
 * Converts a number or long to an 8 characters long hash string.
 * @param {Long|number} value Value to convert
 * @returns {string} Hash
 */
util.longToHash = function longToHash(value) {
    return value
        ? util.LongBits.from(value).toHash()
        : util.LongBits.zeroHash;
};

/**
 * Converts an 8 characters long hash string to a long or number.
 * @param {string} hash Hash
 * @param {boolean} [unsigned=false] Whether unsigned or not
 * @returns {Long|number} Original value
 */
util.longFromHash = function longFromHash(hash, unsigned) {
    var bits = util.LongBits.fromHash(hash);
    if (util.Long)
        return util.Long.fromBits(bits.lo, bits.hi, unsigned);
    return bits.toNumber(Boolean(unsigned));
};

/**
 * Merges the properties of the source object into the destination object.
 * @memberof util
 * @param {Object.<string,*>} dst Destination object
 * @param {Object.<string,*>} src Source object
 * @param {boolean} [ifNotSet=false] Merges only if the key is not already set
 * @returns {Object.<string,*>} Destination object
 */
function merge(dst, src, ifNotSet) { // used by converters
    for (var keys = Object.keys(src), i = 0; i < keys.length; ++i)
        if (dst[keys[i]] === undefined || !ifNotSet)
            dst[keys[i]] = src[keys[i]];
    return dst;
}

util.merge = merge;

/**
 * Converts the first character of a string to lower case.
 * @param {string} str String to convert
 * @returns {string} Converted string
 */
util.lcFirst = function lcFirst(str) {
    return str.charAt(0).toLowerCase() + str.substring(1);
};

/**
 * Creates a custom error constructor.
 * @memberof util
 * @param {string} name Error name
 * @returns {Constructor<Error>} Custom error constructor
 */
function newError(name) {

    function CustomError(message, properties) {

        if (!(this instanceof CustomError))
            return new CustomError(message, properties);

        // Error.call(this, message);
        // ^ just returns a new error instance because the ctor can be called as a function

        Object.defineProperty(this, "message", { get: function() { return message; } });

        /* istanbul ignore next */
        if (Error.captureStackTrace) // node
            Error.captureStackTrace(this, CustomError);
        else
            Object.defineProperty(this, "stack", { value: (new Error()).stack || "" });

        if (properties)
            merge(this, properties);
    }

    (CustomError.prototype = Object.create(Error.prototype)).constructor = CustomError;

    Object.defineProperty(CustomError.prototype, "name", { get: function() { return name; } });

    CustomError.prototype.toString = function toString() {
        return this.name + ": " + this.message;
    };

    return CustomError;
}

util.newError = newError;

/**
 * Constructs a new protocol error.
 * @classdesc Error subclass indicating a protocol specifc error.
 * @memberof util
 * @extends Error
 * @template T extends Message<T>
 * @constructor
 * @param {string} message Error message
 * @param {Object.<string,*>} [properties] Additional properties
 * @example
 * try {
 *     MyMessage.decode(someBuffer); // throws if required fields are missing
 * } catch (e) {
 *     if (e instanceof ProtocolError && e.instance)
 *         console.log("decoded so far: " + JSON.stringify(e.instance));
 * }
 */
util.ProtocolError = newError("ProtocolError");

/**
 * So far decoded message instance.
 * @name util.ProtocolError#instance
 * @type {Message<T>}
 */

/**
 * A OneOf getter as returned by {@link util.oneOfGetter}.
 * @typedef OneOfGetter
 * @type {function}
 * @returns {string|undefined} Set field name, if any
 */

/**
 * Builds a getter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfGetter} Unbound getter
 */
util.oneOfGetter = function getOneOf(fieldNames) {
    var fieldMap = {};
    for (var i = 0; i < fieldNames.length; ++i)
        fieldMap[fieldNames[i]] = 1;

    /**
     * @returns {string|undefined} Set field name, if any
     * @this Object
     * @ignore
     */
    return function() { // eslint-disable-line consistent-return
        for (var keys = Object.keys(this), i = keys.length - 1; i > -1; --i)
            if (fieldMap[keys[i]] === 1 && this[keys[i]] !== undefined && this[keys[i]] !== null)
                return keys[i];
    };
};

/**
 * A OneOf setter as returned by {@link util.oneOfSetter}.
 * @typedef OneOfSetter
 * @type {function}
 * @param {string|undefined} value Field name
 * @returns {undefined}
 */

/**
 * Builds a setter for a oneof's present field name.
 * @param {string[]} fieldNames Field names
 * @returns {OneOfSetter} Unbound setter
 */
util.oneOfSetter = function setOneOf(fieldNames) {

    /**
     * @param {string} name Field name
     * @returns {undefined}
     * @this Object
     * @ignore
     */
    return function(name) {
        for (var i = 0; i < fieldNames.length; ++i)
            if (fieldNames[i] !== name)
                delete this[fieldNames[i]];
    };
};

/**
 * Default conversion options used for {@link Message#toJSON} implementations.
 *
 * These options are close to proto3's JSON mapping with the exception that internal types like Any are handled just like messages. More precisely:
 *
 * - Longs become strings
 * - Enums become string keys
 * - Bytes become base64 encoded strings
 * - (Sub-)Messages become plain objects
 * - Maps become plain objects with all string keys
 * - Repeated fields become arrays
 * - NaN and Infinity for float and double fields become strings
 *
 * @type {IConversionOptions}
 * @see https://developers.google.com/protocol-buffers/docs/proto3?hl=en#json
 */
util.toJSONOptions = {
    longs: String,
    enums: String,
    bytes: String,
    json: true
};

// Sets up buffer utility according to the environment (called in index-minimal)
util._configure = function() {
    var Buffer = util.Buffer;
    /* istanbul ignore if */
    if (!Buffer) {
        util._Buffer_from = util._Buffer_allocUnsafe = null;
        return;
    }
    // because node 4.x buffers are incompatible & immutable
    // see: https://github.com/dcodeIO/protobuf.js/pull/665
    util._Buffer_from = Buffer.from !== Uint8Array.from && Buffer.from ||
        /* istanbul ignore next */
        function Buffer_from(value, encoding) {
            return new Buffer(value, encoding);
        };
    util._Buffer_allocUnsafe = Buffer.allocUnsafe ||
        /* istanbul ignore next */
        function Buffer_allocUnsafe(size) {
            return new Buffer(size);
        };
};

},{"./longbits":23,"@protobufjs/aspromise":9,"@protobufjs/base64":10,"@protobufjs/eventemitter":11,"@protobufjs/float":12,"@protobufjs/inquire":13,"@protobufjs/pool":14,"@protobufjs/utf8":15}],25:[function(require,module,exports){
"use strict";
module.exports = Writer;

var util      = require("./util/minimal");

var BufferWriter; // cyclic

var LongBits  = util.LongBits,
    base64    = util.base64,
    utf8      = util.utf8;

/**
 * Constructs a new writer operation instance.
 * @classdesc Scheduled writer operation.
 * @constructor
 * @param {function(*, Uint8Array, number)} fn Function to call
 * @param {number} len Value byte length
 * @param {*} val Value to write
 * @ignore
 */
function Op(fn, len, val) {

    /**
     * Function to call.
     * @type {function(Uint8Array, number, *)}
     */
    this.fn = fn;

    /**
     * Value byte length.
     * @type {number}
     */
    this.len = len;

    /**
     * Next operation.
     * @type {Writer.Op|undefined}
     */
    this.next = undefined;

    /**
     * Value to write.
     * @type {*}
     */
    this.val = val; // type varies
}

/* istanbul ignore next */
function noop() {} // eslint-disable-line no-empty-function

/**
 * Constructs a new writer state instance.
 * @classdesc Copied writer state.
 * @memberof Writer
 * @constructor
 * @param {Writer} writer Writer to copy state from
 * @ignore
 */
function State(writer) {

    /**
     * Current head.
     * @type {Writer.Op}
     */
    this.head = writer.head;

    /**
     * Current tail.
     * @type {Writer.Op}
     */
    this.tail = writer.tail;

    /**
     * Current buffer length.
     * @type {number}
     */
    this.len = writer.len;

    /**
     * Next state.
     * @type {State|null}
     */
    this.next = writer.states;
}

/**
 * Constructs a new writer instance.
 * @classdesc Wire format writer using `Uint8Array` if available, otherwise `Array`.
 * @constructor
 */
function Writer() {

    /**
     * Current length.
     * @type {number}
     */
    this.len = 0;

    /**
     * Operations head.
     * @type {Object}
     */
    this.head = new Op(noop, 0, 0);

    /**
     * Operations tail
     * @type {Object}
     */
    this.tail = this.head;

    /**
     * Linked forked states.
     * @type {Object|null}
     */
    this.states = null;

    // When a value is written, the writer calculates its byte length and puts it into a linked
    // list of operations to perform when finish() is called. This both allows us to allocate
    // buffers of the exact required size and reduces the amount of work we have to do compared
    // to first calculating over objects and then encoding over objects. In our case, the encoding
    // part is just a linked list walk calling operations with already prepared values.
}

/**
 * Creates a new writer.
 * @function
 * @returns {BufferWriter|Writer} A {@link BufferWriter} when Buffers are supported, otherwise a {@link Writer}
 */
Writer.create = util.Buffer
    ? function create_buffer_setup() {
        return (Writer.create = function create_buffer() {
            return new BufferWriter();
        })();
    }
    /* istanbul ignore next */
    : function create_array() {
        return new Writer();
    };

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Uint8Array} Buffer
 */
Writer.alloc = function alloc(size) {
    return new util.Array(size);
};

// Use Uint8Array buffer pool in the browser, just like node does with buffers
/* istanbul ignore else */
if (util.Array !== Array)
    Writer.alloc = util.pool(Writer.alloc, util.Array.prototype.subarray);

/**
 * Pushes a new operation to the queue.
 * @param {function(Uint8Array, number, *)} fn Function to call
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @returns {Writer} `this`
 * @private
 */
Writer.prototype._push = function push(fn, len, val) {
    this.tail = this.tail.next = new Op(fn, len, val);
    this.len += len;
    return this;
};

function writeByte(val, buf, pos) {
    buf[pos] = val & 255;
}

function writeVarint32(val, buf, pos) {
    while (val > 127) {
        buf[pos++] = val & 127 | 128;
        val >>>= 7;
    }
    buf[pos] = val;
}

/**
 * Constructs a new varint writer operation instance.
 * @classdesc Scheduled varint writer operation.
 * @extends Op
 * @constructor
 * @param {number} len Value byte length
 * @param {number} val Value to write
 * @ignore
 */
function VarintOp(len, val) {
    this.len = len;
    this.next = undefined;
    this.val = val;
}

VarintOp.prototype = Object.create(Op.prototype);
VarintOp.prototype.fn = writeVarint32;

/**
 * Writes an unsigned 32 bit value as a varint.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.uint32 = function write_uint32(value) {
    // here, the call to this.push has been inlined and a varint specific Op subclass is used.
    // uint32 is by far the most frequently used operation and benefits significantly from this.
    this.len += (this.tail = this.tail.next = new VarintOp(
        (value = value >>> 0)
                < 128       ? 1
        : value < 16384     ? 2
        : value < 2097152   ? 3
        : value < 268435456 ? 4
        :                     5,
    value)).len;
    return this;
};

/**
 * Writes a signed 32 bit value as a varint.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.int32 = function write_int32(value) {
    return value < 0
        ? this._push(writeVarint64, 10, LongBits.fromNumber(value)) // 10 bytes per spec
        : this.uint32(value);
};

/**
 * Writes a 32 bit value as a varint, zig-zag encoded.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sint32 = function write_sint32(value) {
    return this.uint32((value << 1 ^ value >> 31) >>> 0);
};

function writeVarint64(val, buf, pos) {
    while (val.hi) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
        val.hi >>>= 7;
    }
    while (val.lo > 127) {
        buf[pos++] = val.lo & 127 | 128;
        val.lo = val.lo >>> 7;
    }
    buf[pos++] = val.lo;
}

/**
 * Writes an unsigned 64 bit value as a varint.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.uint64 = function write_uint64(value) {
    var bits = LongBits.from(value);
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a signed 64 bit value as a varint.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.int64 = Writer.prototype.uint64;

/**
 * Writes a signed 64 bit value as a varint, zig-zag encoded.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sint64 = function write_sint64(value) {
    var bits = LongBits.from(value).zzEncode();
    return this._push(writeVarint64, bits.length(), bits);
};

/**
 * Writes a boolish value as a varint.
 * @param {boolean} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.bool = function write_bool(value) {
    return this._push(writeByte, 1, value ? 1 : 0);
};

function writeFixed32(val, buf, pos) {
    buf[pos    ] =  val         & 255;
    buf[pos + 1] =  val >>> 8   & 255;
    buf[pos + 2] =  val >>> 16  & 255;
    buf[pos + 3] =  val >>> 24;
}

/**
 * Writes an unsigned 32 bit value as fixed 32 bits.
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.fixed32 = function write_fixed32(value) {
    return this._push(writeFixed32, 4, value >>> 0);
};

/**
 * Writes a signed 32 bit value as fixed 32 bits.
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.sfixed32 = Writer.prototype.fixed32;

/**
 * Writes an unsigned 64 bit value as fixed 64 bits.
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.fixed64 = function write_fixed64(value) {
    var bits = LongBits.from(value);
    return this._push(writeFixed32, 4, bits.lo)._push(writeFixed32, 4, bits.hi);
};

/**
 * Writes a signed 64 bit value as fixed 64 bits.
 * @function
 * @param {Long|number|string} value Value to write
 * @returns {Writer} `this`
 * @throws {TypeError} If `value` is a string and no long library is present.
 */
Writer.prototype.sfixed64 = Writer.prototype.fixed64;

/**
 * Writes a float (32 bit).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.float = function write_float(value) {
    return this._push(util.float.writeFloatLE, 4, value);
};

/**
 * Writes a double (64 bit float).
 * @function
 * @param {number} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.double = function write_double(value) {
    return this._push(util.float.writeDoubleLE, 8, value);
};

var writeBytes = util.Array.prototype.set
    ? function writeBytes_set(val, buf, pos) {
        buf.set(val, pos); // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytes_for(val, buf, pos) {
        for (var i = 0; i < val.length; ++i)
            buf[pos + i] = val[i];
    };

/**
 * Writes a sequence of bytes.
 * @param {Uint8Array|string} value Buffer or base64 encoded string to write
 * @returns {Writer} `this`
 */
Writer.prototype.bytes = function write_bytes(value) {
    var len = value.length >>> 0;
    if (!len)
        return this._push(writeByte, 1, 0);
    if (util.isString(value)) {
        var buf = Writer.alloc(len = base64.length(value));
        base64.decode(value, buf, 0);
        value = buf;
    }
    return this.uint32(len)._push(writeBytes, len, value);
};

/**
 * Writes a string.
 * @param {string} value Value to write
 * @returns {Writer} `this`
 */
Writer.prototype.string = function write_string(value) {
    var len = utf8.length(value);
    return len
        ? this.uint32(len)._push(utf8.write, len, value)
        : this._push(writeByte, 1, 0);
};

/**
 * Forks this writer's state by pushing it to a stack.
 * Calling {@link Writer#reset|reset} or {@link Writer#ldelim|ldelim} resets the writer to the previous state.
 * @returns {Writer} `this`
 */
Writer.prototype.fork = function fork() {
    this.states = new State(this);
    this.head = this.tail = new Op(noop, 0, 0);
    this.len = 0;
    return this;
};

/**
 * Resets this instance to the last state.
 * @returns {Writer} `this`
 */
Writer.prototype.reset = function reset() {
    if (this.states) {
        this.head   = this.states.head;
        this.tail   = this.states.tail;
        this.len    = this.states.len;
        this.states = this.states.next;
    } else {
        this.head = this.tail = new Op(noop, 0, 0);
        this.len  = 0;
    }
    return this;
};

/**
 * Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
 * @returns {Writer} `this`
 */
Writer.prototype.ldelim = function ldelim() {
    var head = this.head,
        tail = this.tail,
        len  = this.len;
    this.reset().uint32(len);
    if (len) {
        this.tail.next = head.next; // skip noop
        this.tail = tail;
        this.len += len;
    }
    return this;
};

/**
 * Finishes the write operation.
 * @returns {Uint8Array} Finished buffer
 */
Writer.prototype.finish = function finish() {
    var head = this.head.next, // skip noop
        buf  = this.constructor.alloc(this.len),
        pos  = 0;
    while (head) {
        head.fn(head.val, buf, pos);
        pos += head.len;
        head = head.next;
    }
    // this.head = this.tail = null;
    return buf;
};

Writer._configure = function(BufferWriter_) {
    BufferWriter = BufferWriter_;
};

},{"./util/minimal":24}],26:[function(require,module,exports){
"use strict";
module.exports = BufferWriter;

// extends Writer
var Writer = require("./writer");
(BufferWriter.prototype = Object.create(Writer.prototype)).constructor = BufferWriter;

var util = require("./util/minimal");

var Buffer = util.Buffer;

/**
 * Constructs a new buffer writer instance.
 * @classdesc Wire format writer using node buffers.
 * @extends Writer
 * @constructor
 */
function BufferWriter() {
    Writer.call(this);
}

/**
 * Allocates a buffer of the specified size.
 * @param {number} size Buffer size
 * @returns {Buffer} Buffer
 */
BufferWriter.alloc = function alloc_buffer(size) {
    return (BufferWriter.alloc = util._Buffer_allocUnsafe)(size);
};

var writeBytesBuffer = Buffer && Buffer.prototype instanceof Uint8Array && Buffer.prototype.set.name === "set"
    ? function writeBytesBuffer_set(val, buf, pos) {
        buf.set(val, pos); // faster than copy (requires node >= 4 where Buffers extend Uint8Array and set is properly inherited)
                           // also works for plain array values
    }
    /* istanbul ignore next */
    : function writeBytesBuffer_copy(val, buf, pos) {
        if (val.copy) // Buffer values
            val.copy(buf, pos, 0, val.length);
        else for (var i = 0; i < val.length;) // plain array values
            buf[pos++] = val[i++];
    };

/**
 * @override
 */
BufferWriter.prototype.bytes = function write_bytes_buffer(value) {
    if (util.isString(value))
        value = util._Buffer_from(value, "base64");
    var len = value.length >>> 0;
    this.uint32(len);
    if (len)
        this._push(writeBytesBuffer, len, value);
    return this;
};

function writeStringBuffer(val, buf, pos) {
    if (val.length < 40) // plain js is faster for short strings (probably due to redundant assertions)
        util.utf8.write(val, buf, pos);
    else
        buf.utf8Write(val, pos);
}

/**
 * @override
 */
BufferWriter.prototype.string = function write_string_buffer(value) {
    var len = Buffer.byteLength(value);
    this.uint32(len);
    if (len)
        this._push(writeStringBuffer, len, value);
    return this;
};


/**
 * Finishes the write operation.
 * @name BufferWriter#finish
 * @function
 * @returns {Buffer} Finished buffer
 */

},{"./util/minimal":24,"./writer":25}],27:[function(require,module,exports){
(function (global, undefined) {
    "use strict";

    if (global.setImmediate) {
        return;
    }

    var nextHandle = 1; // Spec says greater than zero
    var tasksByHandle = {};
    var currentlyRunningATask = false;
    var doc = global.document;
    var setImmediate;

    function addFromSetImmediateArguments(args) {
        tasksByHandle[nextHandle] = partiallyApplied.apply(undefined, args);
        return nextHandle++;
    }

    // This function accepts the same arguments as setImmediate, but
    // returns a function that requires no arguments.
    function partiallyApplied(handler) {
        var args = [].slice.call(arguments, 1);
        return function() {
            if (typeof handler === "function") {
                handler.apply(undefined, args);
            } else {
                (new Function("" + handler))();
            }
        };
    }

    function runIfPresent(handle) {
        // From the spec: "Wait until any invocations of this algorithm started before this one have completed."
        // So if we're currently running a task, we'll need to delay this invocation.
        if (currentlyRunningATask) {
            // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
            // "too much recursion" error.
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
        } else {
            var task = tasksByHandle[handle];
            if (task) {
                currentlyRunningATask = true;
                try {
                    task();
                } finally {
                    clearImmediate(handle);
                    currentlyRunningATask = false;
                }
            }
        }
    }

    function clearImmediate(handle) {
        delete tasksByHandle[handle];
    }

    function installNextTickImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            process.nextTick(partiallyApplied(runIfPresent, handle));
            return handle;
        };
    }

    function canUsePostMessage() {
        // The test against `importScripts` prevents this implementation from being installed inside a web worker,
        // where `global.postMessage` means something completely different and can't be used for this purpose.
        if (global.postMessage && !global.importScripts) {
            var postMessageIsAsynchronous = true;
            var oldOnMessage = global.onmessage;
            global.onmessage = function() {
                postMessageIsAsynchronous = false;
            };
            global.postMessage("", "*");
            global.onmessage = oldOnMessage;
            return postMessageIsAsynchronous;
        }
    }

    function installPostMessageImplementation() {
        // Installs an event handler on `global` for the `message` event: see
        // * https://developer.mozilla.org/en/DOM/window.postMessage
        // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages

        var messagePrefix = "setImmediate$" + Math.random() + "$";
        var onGlobalMessage = function(event) {
            if (event.source === global &&
                typeof event.data === "string" &&
                event.data.indexOf(messagePrefix) === 0) {
                runIfPresent(+event.data.slice(messagePrefix.length));
            }
        };

        if (global.addEventListener) {
            global.addEventListener("message", onGlobalMessage, false);
        } else {
            global.attachEvent("onmessage", onGlobalMessage);
        }

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            global.postMessage(messagePrefix + handle, "*");
            return handle;
        };
    }

    function installMessageChannelImplementation() {
        var channel = new MessageChannel();
        channel.port1.onmessage = function(event) {
            var handle = event.data;
            runIfPresent(handle);
        };

        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            channel.port2.postMessage(handle);
            return handle;
        };
    }

    function installReadyStateChangeImplementation() {
        var html = doc.documentElement;
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
            // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
            var script = doc.createElement("script");
            script.onreadystatechange = function () {
                runIfPresent(handle);
                script.onreadystatechange = null;
                html.removeChild(script);
                script = null;
            };
            html.appendChild(script);
            return handle;
        };
    }

    function installSetTimeoutImplementation() {
        setImmediate = function() {
            var handle = addFromSetImmediateArguments(arguments);
            setTimeout(partiallyApplied(runIfPresent, handle), 0);
            return handle;
        };
    }

    // If supported, we should attach to the prototype of global, since that is where setTimeout et al. live.
    var attachTo = Object.getPrototypeOf && Object.getPrototypeOf(global);
    attachTo = attachTo && attachTo.setTimeout ? attachTo : global;

    // Don't get fooled by e.g. browserify environments.
    if ({}.toString.call(global.process) === "[object process]") {
        // For Node.js before 0.9
        installNextTickImplementation();

    } else if (canUsePostMessage()) {
        // For non-IE10 modern browsers
        installPostMessageImplementation();

    } else if (global.MessageChannel) {
        // For web workers, where supported
        installMessageChannelImplementation();

    } else if (doc && "onreadystatechange" in doc.createElement("script")) {
        // For IE 6–8
        installReadyStateChangeImplementation();

    } else {
        // For older browsers
        installSetTimeoutImplementation();
    }

    attachTo.setImmediate = setImmediate;
    attachTo.clearImmediate = clearImmediate;
}(new Function("return this")()));

},{}],28:[function(require,module,exports){
/** @license zlib.js 2012 - imaya [ https://github.com/imaya/zlib.js ] The MIT License */(function() {'use strict';var m=this;function q(c,d){var a=c.split("."),b=m;!(a[0]in b)&&b.execScript&&b.execScript("var "+a[0]);for(var e;a.length&&(e=a.shift());)!a.length&&void 0!==d?b[e]=d:b=b[e]?b[e]:b[e]={}};var s="undefined"!==typeof Uint8Array&&"undefined"!==typeof Uint16Array&&"undefined"!==typeof Uint32Array&&"undefined"!==typeof DataView;function t(c){var d=c.length,a=0,b=Number.POSITIVE_INFINITY,e,f,g,h,k,l,p,n,r,K;for(n=0;n<d;++n)c[n]>a&&(a=c[n]),c[n]<b&&(b=c[n]);e=1<<a;f=new (s?Uint32Array:Array)(e);g=1;h=0;for(k=2;g<=a;){for(n=0;n<d;++n)if(c[n]===g){l=0;p=h;for(r=0;r<g;++r)l=l<<1|p&1,p>>=1;K=g<<16|n;for(r=l;r<e;r+=k)f[r]=K;++h}++g;h<<=1;k<<=1}return[f,a,b]};function u(c,d){this.g=[];this.h=32768;this.d=this.f=this.a=this.l=0;this.input=s?new Uint8Array(c):c;this.m=!1;this.i=v;this.s=!1;if(d||!(d={}))d.index&&(this.a=d.index),d.bufferSize&&(this.h=d.bufferSize),d.bufferType&&(this.i=d.bufferType),d.resize&&(this.s=d.resize);switch(this.i){case w:this.b=32768;this.c=new (s?Uint8Array:Array)(32768+this.h+258);break;case v:this.b=0;this.c=new (s?Uint8Array:Array)(this.h);this.e=this.A;this.n=this.w;this.j=this.z;break;default:throw Error("invalid inflate mode");
}}var w=0,v=1,x={u:w,t:v};
u.prototype.k=function(){for(;!this.m;){var c=y(this,3);c&1&&(this.m=!0);c>>>=1;switch(c){case 0:var d=this.input,a=this.a,b=this.c,e=this.b,f=d.length,g=void 0,h=void 0,k=b.length,l=void 0;this.d=this.f=0;if(a+1>=f)throw Error("invalid uncompressed block header: LEN");g=d[a++]|d[a++]<<8;if(a+1>=f)throw Error("invalid uncompressed block header: NLEN");h=d[a++]|d[a++]<<8;if(g===~h)throw Error("invalid uncompressed block header: length verify");if(a+g>d.length)throw Error("input buffer is broken");switch(this.i){case w:for(;e+
g>b.length;){l=k-e;g-=l;if(s)b.set(d.subarray(a,a+l),e),e+=l,a+=l;else for(;l--;)b[e++]=d[a++];this.b=e;b=this.e();e=this.b}break;case v:for(;e+g>b.length;)b=this.e({p:2});break;default:throw Error("invalid inflate mode");}if(s)b.set(d.subarray(a,a+g),e),e+=g,a+=g;else for(;g--;)b[e++]=d[a++];this.a=a;this.b=e;this.c=b;break;case 1:this.j(z,A);break;case 2:B(this);break;default:throw Error("unknown BTYPE: "+c);}}return this.n()};
var C=[16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15],D=s?new Uint16Array(C):C,E=[3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258,258,258],F=s?new Uint16Array(E):E,G=[0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0,0,0],H=s?new Uint8Array(G):G,I=[1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577],J=s?new Uint16Array(I):I,L=[0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,
13],M=s?new Uint8Array(L):L,N=new (s?Uint8Array:Array)(288),O,P;O=0;for(P=N.length;O<P;++O)N[O]=143>=O?8:255>=O?9:279>=O?7:8;var z=t(N),Q=new (s?Uint8Array:Array)(30),R,S;R=0;for(S=Q.length;R<S;++R)Q[R]=5;var A=t(Q);function y(c,d){for(var a=c.f,b=c.d,e=c.input,f=c.a,g=e.length,h;b<d;){if(f>=g)throw Error("input buffer is broken");a|=e[f++]<<b;b+=8}h=a&(1<<d)-1;c.f=a>>>d;c.d=b-d;c.a=f;return h}
function T(c,d){for(var a=c.f,b=c.d,e=c.input,f=c.a,g=e.length,h=d[0],k=d[1],l,p;b<k&&!(f>=g);)a|=e[f++]<<b,b+=8;l=h[a&(1<<k)-1];p=l>>>16;c.f=a>>p;c.d=b-p;c.a=f;return l&65535}
function B(c){function d(a,c,b){var d,e=this.q,f,g;for(g=0;g<a;)switch(d=T(this,c),d){case 16:for(f=3+y(this,2);f--;)b[g++]=e;break;case 17:for(f=3+y(this,3);f--;)b[g++]=0;e=0;break;case 18:for(f=11+y(this,7);f--;)b[g++]=0;e=0;break;default:e=b[g++]=d}this.q=e;return b}var a=y(c,5)+257,b=y(c,5)+1,e=y(c,4)+4,f=new (s?Uint8Array:Array)(D.length),g,h,k,l;for(l=0;l<e;++l)f[D[l]]=y(c,3);if(!s){l=e;for(e=f.length;l<e;++l)f[D[l]]=0}g=t(f);h=new (s?Uint8Array:Array)(a);k=new (s?Uint8Array:Array)(b);c.q=0;
c.j(t(d.call(c,a,g,h)),t(d.call(c,b,g,k)))}u.prototype.j=function(c,d){var a=this.c,b=this.b;this.o=c;for(var e=a.length-258,f,g,h,k;256!==(f=T(this,c));)if(256>f)b>=e&&(this.b=b,a=this.e(),b=this.b),a[b++]=f;else{g=f-257;k=F[g];0<H[g]&&(k+=y(this,H[g]));f=T(this,d);h=J[f];0<M[f]&&(h+=y(this,M[f]));b>=e&&(this.b=b,a=this.e(),b=this.b);for(;k--;)a[b]=a[b++-h]}for(;8<=this.d;)this.d-=8,this.a--;this.b=b};
u.prototype.z=function(c,d){var a=this.c,b=this.b;this.o=c;for(var e=a.length,f,g,h,k;256!==(f=T(this,c));)if(256>f)b>=e&&(a=this.e(),e=a.length),a[b++]=f;else{g=f-257;k=F[g];0<H[g]&&(k+=y(this,H[g]));f=T(this,d);h=J[f];0<M[f]&&(h+=y(this,M[f]));b+k>e&&(a=this.e(),e=a.length);for(;k--;)a[b]=a[b++-h]}for(;8<=this.d;)this.d-=8,this.a--;this.b=b};
u.prototype.e=function(){var c=new (s?Uint8Array:Array)(this.b-32768),d=this.b-32768,a,b,e=this.c;if(s)c.set(e.subarray(32768,c.length));else{a=0;for(b=c.length;a<b;++a)c[a]=e[a+32768]}this.g.push(c);this.l+=c.length;if(s)e.set(e.subarray(d,d+32768));else for(a=0;32768>a;++a)e[a]=e[d+a];this.b=32768;return e};
u.prototype.A=function(c){var d,a=this.input.length/this.a+1|0,b,e,f,g=this.input,h=this.c;c&&("number"===typeof c.p&&(a=c.p),"number"===typeof c.v&&(a+=c.v));2>a?(b=(g.length-this.a)/this.o[2],f=258*(b/2)|0,e=f<h.length?h.length+f:h.length<<1):e=h.length*a;s?(d=new Uint8Array(e),d.set(h)):d=h;return this.c=d};
u.prototype.n=function(){var c=0,d=this.c,a=this.g,b,e=new (s?Uint8Array:Array)(this.l+(this.b-32768)),f,g,h,k;if(0===a.length)return s?this.c.subarray(32768,this.b):this.c.slice(32768,this.b);f=0;for(g=a.length;f<g;++f){b=a[f];h=0;for(k=b.length;h<k;++h)e[c++]=b[h]}f=32768;for(g=this.b;f<g;++f)e[c++]=d[f];this.g=[];return this.buffer=e};
u.prototype.w=function(){var c,d=this.b;s?this.s?(c=new Uint8Array(d),c.set(this.c.subarray(0,d))):c=this.c.subarray(0,d):(this.c.length>d&&(this.c.length=d),c=this.c);return this.buffer=c};function U(c,d){var a,b;this.input=c;this.a=0;if(d||!(d={}))d.index&&(this.a=d.index),d.verify&&(this.B=d.verify);a=c[this.a++];b=c[this.a++];switch(a&15){case V:this.method=V;break;default:throw Error("unsupported compression method");}if(0!==((a<<8)+b)%31)throw Error("invalid fcheck flag:"+((a<<8)+b)%31);if(b&32)throw Error("fdict flag is not supported");this.r=new u(c,{index:this.a,bufferSize:d.bufferSize,bufferType:d.bufferType,resize:d.resize})}
U.prototype.k=function(){var c=this.input,d,a;d=this.r.k();this.a=this.r.a;if(this.B){a=(c[this.a++]<<24|c[this.a++]<<16|c[this.a++]<<8|c[this.a++])>>>0;var b=d;if("string"===typeof b){var e=b.split(""),f,g;f=0;for(g=e.length;f<g;f++)e[f]=(e[f].charCodeAt(0)&255)>>>0;b=e}for(var h=1,k=0,l=b.length,p,n=0;0<l;){p=1024<l?1024:l;l-=p;do h+=b[n++],k+=h;while(--p);h%=65521;k%=65521}if(a!==(k<<16|h)>>>0)throw Error("invalid adler-32 checksum");}return d};var V=8;q("Zlib.Inflate",U);q("Zlib.Inflate.prototype.decompress",U.prototype.k);var W={ADAPTIVE:x.t,BLOCK:x.u},X,Y,Z,$;if(Object.keys)X=Object.keys(W);else for(Y in X=[],Z=0,W)X[Z++]=Y;Z=0;for($=X.length;Z<$;++Z)Y=X[Z],q("Zlib.Inflate.BufferType."+Y,W[Y]);}).call(this); 

},{}]},{},[7])(7)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJsaWIvYnJvd3Nlci9hcnJheUJ1ZmZlclJlYWRlci5qcyIsImxpYi9icm93c2VyL2ZpbGVSZWFkZXIuanMiLCJsaWIvYnJvd3Nlci96bGliLmpzIiwibGliL2J1ZmZlci5qcyIsImxpYi9ub2RlanMvZnNSZWFkZXIuanMiLCJsaWIvbm9kZWpzL3psaWIuanMiLCJsaWIvcGJmUGFyc2VyLmpzIiwibGliL3Byb3RvL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2FzcHJvbWlzZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy9iYXNlNjQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvZXZlbnRlbWl0dGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2Zsb2F0L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL0Bwcm90b2J1ZmpzL2lucXVpcmUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvQHByb3RvYnVmanMvcG9vbC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9AcHJvdG9idWZqcy91dGY4L2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvbWluaW1hbC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9pbmRleC1taW5pbWFsLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JlYWRlci5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9yZWFkZXJfYnVmZmVyLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3Jvb3RzLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3JwYy5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy9ycGMvc2VydmljZS5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy91dGlsL2xvbmdiaXRzLmpzIiwibm9kZV9tb2R1bGVzL3Byb3RvYnVmanMvc3JjL3V0aWwvbWluaW1hbC5qcyIsIm5vZGVfbW9kdWxlcy9wcm90b2J1ZmpzL3NyYy93cml0ZXIuanMiLCJub2RlX21vZHVsZXMvcHJvdG9idWZqcy9zcmMvd3JpdGVyX2J1ZmZlci5qcyIsIm5vZGVfbW9kdWxlcy9zZXRpbW1lZGlhdGUvc2V0SW1tZWRpYXRlLmpzIiwibm9kZV9tb2R1bGVzL3psaWJqcy9iaW4vaW5mbGF0ZS5taW4uanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25FQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNSQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZuQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2eUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvVUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5WkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM2NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsInZhciBidWYgPSByZXF1aXJlKCcuLi9idWZmZXIuanMnKTtcbnJlcXVpcmUoXCJzZXRpbW1lZGlhdGVcIik7XG5cbmZ1bmN0aW9uIHJlYWRCbG9iSGVhZGVyU2l6ZShmZCwgcG9zaXRpb24sIHNpemUsIGNhbGxiYWNrKXtcbiAgICB2YXIgaGVhZGVyU2l6ZSA9IG5ldyBEYXRhVmlldyhmZCkuZ2V0SW50MzIocG9zaXRpb24sIGZhbHNlKTtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgaGVhZGVyU2l6ZSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRQQkZFbGVtZW50KGZkLCBwb3NpdGlvbiwgc2l6ZSwgcGJmRGVjb2RlLCBjYWxsYmFjayl7XG4gICAgLy92YXIgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoZmQsIHBvc2l0aW9uLCBzaXplKTtcbiAgICB2YXIgYnVmZmVyID0gbmV3IFVpbnQ4QXJyYXkoc2l6ZSk7XG4gICAgYnVmZmVyLnNldChuZXcgVWludDhBcnJheShmZCwgcG9zaXRpb24sIHNpemUpKTtcblxuICAgIC8vIGFzeW5jIGNhbGwgdG8gYXZvaWQgZmxvb2RpbmcgdGhlIGNhbGwgc3RhY2sgd2hlbiByZWFkaW5nIGFuIGFscmVhZHlcbiAgICAvLyBsb2FkZWQgQXJyYXlCdWZmZXIgaW4gdGhlIEJyb3dzZXIgKCMzMClcbiAgICBzZXRJbW1lZGlhdGUoZnVuY3Rpb24oKXtcbiAgICAgICAgYnVmLnJlYWRQQkZFbGVtZW50RnJvbUJ1ZmZlcihidWZmZXIsIHBiZkRlY29kZSwgY2FsbGJhY2spO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRGaWxlU2l6ZShmZCwgY2FsbGJhY2spe1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBmZC5ieXRlTGVuZ3RoKTtcbn1cblxuZnVuY3Rpb24gZ2V0KHVybCwgY2FsbGJhY2spIHtcbiAgICB2YXIgeGhyID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgeGhyLm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgeGhyLnJlc3BvbnNlVHlwZSA9ICdhcnJheWJ1ZmZlcic7XG4gICAgeGhyLm9uZXJyb3IgPSBmdW5jdGlvbihldnQpIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKHRoaXMuc3RhdHVzICsgJzogJyArIHRoaXMuc3RhdHVzVGV4dCkpO1xuICAgIH07XG4gICAgeGhyLm9ubG9hZCA9IGZ1bmN0aW9uKGV2dCkge1xuICAgICAgICBjYWxsYmFjayhudWxsLCB0aGlzLnJlc3BvbnNlKTtcbiAgICB9O1xuICAgIHhoci5zZW5kKCk7XG59XG5cbmZ1bmN0aW9uIG9wZW4ob3B0cywgY2FsbGJhY2spe1xuICAgIGlmIChvcHRzLmZpbGVQYXRoKSB7XG4gICAgICAgIGdldChvcHRzLmZpbGVQYXRoLCBjYWxsYmFjayk7XG4gICAgfSBlbHNlIGlmIChvcHRzLmJ1ZmZlcikge1xuICAgICAgICBjYWxsYmFjayhudWxsLCBvcHRzLmJ1ZmZlcik7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKCdVc2UgZWl0aGVyIHRoZSBcImZpbGVQYXRoXCIgb3B0aW9uIHRvIHBhc3MgYW4gVVJMJ1xuICAgICAgICAgICAgKyAnIG9yIHRoZSBcImJ1ZmZlclwiIG9wdGlvbiB0byBwYXNzIGFuIEFycmF5QnVmZmVyLicpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGNsb3NlKGZkLCBjYWxsYmFjayl7XG4gICAgaWYgKGNhbGxiYWNrKSB7XG4gICAgICAgIGNhbGxiYWNrKG51bGwpO1xuICAgIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcmVhZEJsb2JIZWFkZXJTaXplOiByZWFkQmxvYkhlYWRlclNpemUsXG4gICAgcmVhZFBCRkVsZW1lbnQ6IHJlYWRQQkZFbGVtZW50LFxuICAgIGdldEZpbGVTaXplOiBnZXRGaWxlU2l6ZSxcbiAgICBvcGVuOiBvcGVuLFxuICAgIGNsb3NlOiBjbG9zZVxufTtcbiIsInZhciBidWYgPSByZXF1aXJlKCcuLi9idWZmZXIuanMnKTtcblxuZnVuY3Rpb24gcmVhZEJsb2JIZWFkZXJTaXplKGZpbGUsIHBvc2l0aW9uLCBzaXplLCBjYWxsYmFjayl7XG4gICAgcmVhZChmaWxlLCBwb3NpdGlvbiwgc2l6ZSwgZnVuY3Rpb24oZXJyLCBidWZmZXIpe1xuICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBoZWFkZXJTaXplID0gbmV3IERhdGFWaWV3KGJ1ZmZlcikuZ2V0SW50MzIoMCwgZmFsc2UpO1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgaGVhZGVyU2l6ZSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRQQkZFbGVtZW50KGZpbGUsIHBvc2l0aW9uLCBzaXplLCBwYmZEZWNvZGUsIGNhbGxiYWNrKXtcbiAgICByZWFkKGZpbGUsIHBvc2l0aW9uLCBzaXplLCBmdW5jdGlvbihlcnIsIGJ1ZmZlcil7XG4gICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGJ1Zi5yZWFkUEJGRWxlbWVudEZyb21CdWZmZXIoYnVmZmVyLCBwYmZEZWNvZGUsIGNhbGxiYWNrKTtcbiAgICB9KTsgICAgXG59XG5cbmZ1bmN0aW9uIGdldEZpbGVTaXplKGZpbGUsIGNhbGxiYWNrKXtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmlsZS5zaXplKTtcbn1cblxuZnVuY3Rpb24gcmVhZChmaWxlLCBwb3NpdGlvbiwgc2l6ZSwgY2FsbGJhY2spe1xuICAgIHZhciByZWFkZXIsIHNsaWNlO1xuICAgIFxuICAgIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cbiAgICByZWFkZXIub25lcnJvciA9IGZ1bmN0aW9uKGUpe1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdFcnJvciByZWFkaW5nIGZpbGUgKCcgKyByZWFkZXIuZXJyb3IuY29kZSArICcpJykpO1xuICAgIH07XG4gICAgcmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKGUpe1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVhZGVyLnJlc3VsdCk7XG4gICAgfTtcblxuICAgIC8vIFNhZmFyaSBzdGlsbCBwcmVmaXhlZCBhY2NvcmRpbmcgdG8gTUROIChhcyBvZiAxMS8yMDE0KVxuICAgIC8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0FQSS9CbG9iLnNsaWNlI0Jyb3dzZXJfY29tcGF0aWJpbGl0eVxuICAgIGlmKGZpbGUud2Via2l0U2xpY2Upe1xuICAgICAgICBzbGljZSA9IGZpbGUud2Via2l0U2xpY2UocG9zaXRpb24sIHBvc2l0aW9uICsgc2l6ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgc2xpY2UgPSBmaWxlLnNsaWNlKHBvc2l0aW9uLCBwb3NpdGlvbiArIHNpemUpO1xuICAgIH1cblxuICAgIHJlYWRlci5yZWFkQXNBcnJheUJ1ZmZlcihzbGljZSk7XG59XG5cbmZ1bmN0aW9uIG9wZW4ob3B0cywgY2FsbGJhY2spe1xuICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBvcHRzLmZpbGUpO1xufVxuXG5mdW5jdGlvbiBjbG9zZShmaWxlLCBjYWxsYmFjayl7XG4gICAgaWYoY2FsbGJhY2spe1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCk7XG4gICAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZWFkQmxvYkhlYWRlclNpemU6IHJlYWRCbG9iSGVhZGVyU2l6ZSxcbiAgICByZWFkUEJGRWxlbWVudDogcmVhZFBCRkVsZW1lbnQsXG4gICAgZ2V0RmlsZVNpemU6IGdldEZpbGVTaXplLFxuICAgIG9wZW46IG9wZW4sXG4gICAgY2xvc2U6IGNsb3NlXG59O1xuIiwiLy8gZG9uJ3QgdXNlIG5wbSAnemxpYmpzJyBtb2R1bGUsIHdvdWxkIHJlcXVpcmUgc2hpbXMgZm9yIHRoZSBOb2RlLmpzIHdyYXBwZXJzXG52YXIgWmxpYiA9IHJlcXVpcmUoJy4uLy4uL25vZGVfbW9kdWxlcy96bGlianMvYmluL2luZmxhdGUubWluLmpzJykuWmxpYjtcblxuZnVuY3Rpb24gaW5mbGF0ZUJsb2IoYmxvYiwgY2FsbGJhY2spe1xuICAgIHZhciBpbmZsID0gbmV3IFpsaWIuSW5mbGF0ZShuZXcgVWludDhBcnJheShibG9iLnpsaWJEYXRhKSwge1xuICAgICAgICBidWZmZXJTaXplOiBibG9iLnJhd1NpemVcbiAgICB9KTtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgaW5mbC5kZWNvbXByZXNzKCkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbmZsYXRlQmxvYjogaW5mbGF0ZUJsb2Jcbn07XG4iLCJmdW5jdGlvbiByZWFkUEJGRWxlbWVudEZyb21CdWZmZXIoYnVmZmVyLCBwYmZEZWNvZGUsIGNhbGxiYWNrKXtcbiAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcGJmRGVjb2RlKGJ1ZmZlcikpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZWFkUEJGRWxlbWVudEZyb21CdWZmZXI6IHJlYWRQQkZFbGVtZW50RnJvbUJ1ZmZlclxufTtcbiIsInZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgYnVmID0gcmVxdWlyZSgnLi4vYnVmZmVyLmpzJyk7XG5cbmZ1bmN0aW9uIGJ5dGVzUmVhZEZhaWwoY2FsbGJhY2ssIGV4cGVjdGVkQnl0ZXMsIHJlYWRCeXRlcyl7XG4gICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignRXhwZWN0ZWQgJyArIGV4cGVjdGVkQnl0ZXMgKyAnIGJ5dGVzIGJ1dCBnb3QgJyArIHJlYWRCeXRlcykpO1xufVxuXG5mdW5jdGlvbiByZWFkQmxvYkhlYWRlclNpemUoZmQsIHBvc2l0aW9uLCBzaXplLCBjYWxsYmFjayl7XG4gICAgdmFyIGJ1ZmZlcjtcblxuICAgIGJ1ZmZlciA9IG5ldyBCdWZmZXIoc2l6ZSk7XG5cbiAgICBmcy5yZWFkKGZkLCBidWZmZXIsIDAsIHNpemUsIHBvc2l0aW9uLCBmdW5jdGlvbihlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKXtcbiAgICAgICAgaWYoYnl0ZXNSZWFkICE9PSBzaXplKXtcbiAgICAgICAgICAgIHJldHVybiBieXRlc1JlYWRGYWlsKGNhbGxiYWNrLCBzaXplLCBieXRlc1JlYWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGJ1ZmZlci5yZWFkSW50MzJCRSgwKSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRQQkZFbGVtZW50KGZkLCBwb3NpdGlvbiwgc2l6ZSwgcGJmRGVjb2RlLCBjYWxsYmFjayl7XG4gICAgdmFyIGJ1ZmZlcjtcblxuICAgIGlmKHNpemUgPiAzMiAqIDEwMjQgKiAxMDI0KXtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG5ldyBFcnJvcignUEJGIGVsZW1lbnQgdG9vIGJpZzogJyArIHNpemUgKyAnIGJ5dGVzJykpO1xuICAgIH1cblxuICAgIGJ1ZmZlciA9IG5ldyBCdWZmZXIoc2l6ZSk7XG5cbiAgICBmcy5yZWFkKGZkLCBidWZmZXIsIDAsIHNpemUsIHBvc2l0aW9uLCBmdW5jdGlvbihlcnIsIGJ5dGVzUmVhZCwgYnVmZmVyKXtcbiAgICAgICAgaWYoYnl0ZXNSZWFkICE9PSBzaXplKXtcbiAgICAgICAgICAgIHJldHVybiBieXRlc1JlYWRGYWlsKGNhbGxiYWNrLCBzaXplLCBieXRlc1JlYWQpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGJ1Zi5yZWFkUEJGRWxlbWVudEZyb21CdWZmZXIoYnVmZmVyLCBwYmZEZWNvZGUsIGNhbGxiYWNrKTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0RmlsZVNpemUoZmQsIGNhbGxiYWNrKXtcbiAgICBmcy5mc3RhdChmZCwgZnVuY3Rpb24oZXJyLCBmZFN0YXR1cyl7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIsIGZkU3RhdHVzLnNpemUpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBvcGVuKG9wdHMsIGNhbGxiYWNrKXtcbiAgICBmcy5vcGVuKG9wdHMuZmlsZVBhdGgsICdyJywgY2FsbGJhY2spO1xufVxuXG5mdW5jdGlvbiBjbG9zZShmZCwgY2FsbGJhY2spe1xuICAgIHJldHVybiBmcy5jbG9zZShmZCwgY2FsbGJhY2spO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICByZWFkQmxvYkhlYWRlclNpemU6IHJlYWRCbG9iSGVhZGVyU2l6ZSxcbiAgICByZWFkUEJGRWxlbWVudDogcmVhZFBCRkVsZW1lbnQsXG4gICAgZ2V0RmlsZVNpemU6IGdldEZpbGVTaXplLFxuICAgIG9wZW46IG9wZW4sXG4gICAgY2xvc2U6IGNsb3NlXG59O1xuIiwidmFyIHpsaWIgPSByZXF1aXJlKCd6bGliJyk7XG5cbmZ1bmN0aW9uIGluZmxhdGVCbG9iKGJsb2IsIGNhbGxiYWNrKXtcbiAgICB6bGliLmluZmxhdGUoYmxvYi56bGliRGF0YSwgY2FsbGJhY2spO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBpbmZsYXRlQmxvYjogaW5mbGF0ZUJsb2Jcbn07IiwiLypcbiAqIFRoZSBmb2xsb3dpbmcgbGl0dGxlIG92ZXJ2aWV3IGV4dGVuZHMgdGhlIG9zbSBwYmYgZmlsZSBzdHJ1Y3R1cmUgZGVzY3JpcHRpb25cbiAqIGZyb20gaHR0cDovL3dpa2kub3BlbnN0cmVldG1hcC5vcmcvd2lraS9QQkZfRm9ybWF0OlxuICpcbiAqIC0gWzFdIGZpbGVcbiAqICAgLSBbbl0gZmlsZSBibG9ja3NcbiAqICAgICAtIFsxXSBibG9iIGhlYWRlclxuICogICAgIC0gWzFdIGJsb2JcbiAqL1xuXG52YXIgcHJvdG8gPSByZXF1aXJlKCcuL3Byb3RvJyk7XG52YXIgYnVmID0gcmVxdWlyZSgnLi9idWZmZXIuanMnKTtcblxudmFyIHpsaWIsIHJlYWRlciwgYXJyYXlCdWZmZXJSZWFkZXIsIGZpbGVSZWFkZXI7XG5cbi8vIGNoZWNrIGlmIHJ1bm5pbmcgaW4gQnJvd3NlciBvciBOb2RlLmpzICh1c2Ugc2VsZiBub3Qgd2luZG93IGJlY2F1c2Ugb2YgV2ViIFdvcmtlcnMpXG5pZiAodHlwZW9mIHNlbGYgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgemxpYiA9IHJlcXVpcmUoJy4vYnJvd3Nlci96bGliLmpzJyk7XG4gICAgYXJyYXlCdWZmZXJSZWFkZXIgPSByZXF1aXJlKCcuL2Jyb3dzZXIvYXJyYXlCdWZmZXJSZWFkZXIuanMnKTtcbiAgICBmaWxlUmVhZGVyID0gcmVxdWlyZSgnLi9icm93c2VyL2ZpbGVSZWFkZXIuanMnKTtcbn0gZWxzZSB7XG4gICAgemxpYiA9IHJlcXVpcmUoJy4vbm9kZWpzL3psaWIuanMnKTtcbiAgICByZWFkZXIgPSByZXF1aXJlKCcuL25vZGVqcy9mc1JlYWRlci5qcycpO1xufVxuXG5mdW5jdGlvbiBwYXJzZShvcHRzKXtcbiAgICB2YXIgcGF1c2VkLCByZXN1bWVDYWxsYmFjaywgZG9jdW1lbnRFbmRSZWFjaGVkO1xuXG4gICAgZG9jdW1lbnRFbmRSZWFjaGVkID0gZmFsc2U7XG4gICAgcGF1c2VkID0gZmFsc2U7XG4gICAgcmVzdW1lQ2FsbGJhY2sgPSBudWxsO1xuXG4gICAgY3JlYXRlUGF0aFBhcnNlcih7XG4gICAgICAgIGZpbGVQYXRoOiBvcHRzLmZpbGVQYXRoLFxuICAgICAgICBidWZmZXI6IG9wdHMuYnVmZmVyLFxuICAgICAgICBmaWxlOiBvcHRzLmZpbGUsXG4gICAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihlcnIsIHBhcnNlcil7XG4gICAgICAgICAgICB2YXIgbmV4dEZpbGVCbG9ja0luZGV4O1xuXG4gICAgICAgICAgICBmdW5jdGlvbiBmYWlsKGVycil7XG4gICAgICAgICAgICAgICAgaWYoIHBhcnNlciApe1xuICAgICAgICAgICAgICAgICAgICBwYXJzZXIuY2xvc2UoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gb3B0cy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWlsKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIG5leHRGaWxlQmxvY2tJbmRleCA9IDA7XG5cbiAgICAgICAgICAgIGZ1bmN0aW9uIHZpc2l0TmV4dEJsb2NrKCl7XG4gICAgICAgICAgICAgICAgdmFyIGZpbGVCbG9jaztcblxuICAgICAgICAgICAgICAgIGlmKGRvY3VtZW50RW5kUmVhY2hlZCB8fCBwYXVzZWQpe1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYobmV4dEZpbGVCbG9ja0luZGV4ID49IHBhcnNlci5maWxlQmxvY2tzLmxlbmd0aCl7XG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50RW5kUmVhY2hlZCA9IHRydWU7XG5cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VyLmNsb3NlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgb3B0cy5lbmREb2N1bWVudCgpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBmaWxlQmxvY2sgPSBwYXJzZXIuZmlsZUJsb2Nrc1tuZXh0RmlsZUJsb2NrSW5kZXhdO1xuXG4gICAgICAgICAgICAgICAgcGFyc2VyLnJlYWRCbG9jayhmaWxlQmxvY2ssIGZ1bmN0aW9uKGVyciwgYmxvY2spe1xuICAgICAgICAgICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhaWwoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHZpc2l0QmxvY2soZmlsZUJsb2NrLCBibG9jaywgb3B0cyk7XG5cbiAgICAgICAgICAgICAgICAgICAgbmV4dEZpbGVCbG9ja0luZGV4ICs9IDE7XG5cbiAgICAgICAgICAgICAgICAgICAgdmlzaXROZXh0QmxvY2soKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmVzdW1lQ2FsbGJhY2sgPSB2aXNpdE5leHRCbG9jaztcblxuICAgICAgICAgICAgdmlzaXROZXh0QmxvY2soKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgZnVuY3Rpb24gcGF1c2UoKXtcbiAgICAgICAgcGF1c2VkID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiByZXN1bWUoKXtcbiAgICAgICAgcGF1c2VkID0gZmFsc2U7XG5cbiAgICAgICAgaWYocmVzdW1lQ2FsbGJhY2spe1xuICAgICAgICAgICAgcmVzdW1lQ2FsbGJhY2soKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICAgIHBhdXNlOiBwYXVzZSxcblxuICAgICAgICByZXN1bWU6IHJlc3VtZVxuICAgIH07XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhdGhQYXJzZXIob3B0cyl7XG4gICAgcmVhZGVyID0gZ2V0UmVhZGVyKG9wdHMpO1xuICAgIHJlYWRlci5vcGVuKG9wdHMsIGZ1bmN0aW9uKGVyciwgZmQpe1xuICAgICAgICBjcmVhdGVGaWxlUGFyc2VyKGZkLCBmdW5jdGlvbihlcnIsIHBhcnNlcil7XG4gICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgIHJldHVybiBvcHRzLmNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHBhcnNlci5jbG9zZSA9IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhZGVyLmNsb3NlKGZkLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICByZXR1cm4gb3B0cy5jYWxsYmFjayhudWxsLCBwYXJzZXIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxuZnVuY3Rpb24gZ2V0UmVhZGVyKG9wdHMpe1xuICAgIGlmKCFhcnJheUJ1ZmZlclJlYWRlcil7XG4gICAgICAgIC8vIE5vZGUuanNcbiAgICAgICAgcmV0dXJuIHJlYWRlcjtcbiAgICB9XG4gICAgXG4gICAgaWYob3B0cy5maWxlKXtcbiAgICAgICAgcmV0dXJuIGZpbGVSZWFkZXI7XG4gICAgfVxuICAgIHJldHVybiBhcnJheUJ1ZmZlclJlYWRlcjtcbn1cblxuZnVuY3Rpb24gdmlzaXRCbG9jayhmaWxlQmxvY2ssIGJsb2NrLCBvcHRzKXtcbiAgICBCTE9DS19WSVNJVE9SU19CWV9UWVBFW2ZpbGVCbG9jay5ibG9iSGVhZGVyLnR5cGVdKGJsb2NrLCBvcHRzKTtcbn1cblxuZnVuY3Rpb24gdmlzaXRPU01IZWFkZXJCbG9jayhibG9jaywgb3B0cyl7XG4gICAgLy8gVE9ET1xufVxuXG5mdW5jdGlvbiB2aXNpdE9TTURhdGFCbG9jayhibG9jaywgb3B0cyl7XG4gICAgdmFyIGk7XG5cbiAgICBmb3IoaSA9IDA7IGkgPCBibG9jay5wcmltaXRpdmVncm91cC5sZW5ndGg7ICsraSl7XG4gICAgICAgIHZpc2l0UHJpbWl0aXZlR3JvdXAoYmxvY2sucHJpbWl0aXZlZ3JvdXBbaV0sIG9wdHMpO1xuICAgIH1cbn1cblxuZnVuY3Rpb24gdmlzaXRQcmltaXRpdmVHcm91cChwZywgb3B0cyl7XG4gICAgdmFyIGk7XG5cbiAgICAvLyB2aXNpdCBub2Rlc1xuICAgIGlmKG9wdHMubm9kZSl7XG4gICAgICAgIGZvcihpID0gMDsgaSA8IHBnLm5vZGVzVmlldy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICBvcHRzLm5vZGUocGcubm9kZXNWaWV3LmdldChpKSk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyB2aXNpdCB3YXlzXG4gICAgaWYob3B0cy53YXkpe1xuICAgICAgICBmb3IoaSA9IDA7IGkgPCBwZy53YXlzVmlldy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICBvcHRzLndheShwZy53YXlzVmlldy5nZXQoaSkpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gdmlzaXQgcmVsYXRpb25zXG4gICAgaWYob3B0cy5yZWxhdGlvbil7XG4gICAgICAgIGZvcihpID0gMDsgaSA8IHBnLnJlbGF0aW9uc1ZpZXcubGVuZ3RoOyArK2kpe1xuICAgICAgICAgICAgb3B0cy5yZWxhdGlvbihwZy5yZWxhdGlvbnNWaWV3LmdldChpKSk7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbnZhciBCTE9DS19WSVNJVE9SU19CWV9UWVBFID0ge1xuICAgIE9TTUhlYWRlcjogdmlzaXRPU01IZWFkZXJCbG9jayxcbiAgICBPU01EYXRhOiB2aXNpdE9TTURhdGFCbG9ja1xufTtcblxudmFyIEJMT0JfSEVBREVSX1NJWkVfU0laRSA9IDQ7XG5cbmZ1bmN0aW9uIHJlYWRCbG9iSGVhZGVyQ29udGVudChmZCwgcG9zaXRpb24sIHNpemUsIGNhbGxiYWNrKXtcbiAgICByZXR1cm4gcmVhZGVyLnJlYWRQQkZFbGVtZW50KGZkLCBwb3NpdGlvbiwgc2l6ZSwgcHJvdG8uT1NNUEJGLkJsb2JIZWFkZXIuZGVjb2RlLCBjYWxsYmFjayk7XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlQmxvY2soZmQsIHBvc2l0aW9uLCBjYWxsYmFjayl7XG4gICAgcmVhZGVyLnJlYWRCbG9iSGVhZGVyU2l6ZShmZCwgcG9zaXRpb24sIEJMT0JfSEVBREVSX1NJWkVfU0laRSwgZnVuY3Rpb24oZXJyLCBibG9iSGVhZGVyU2l6ZSl7XG4gICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZWFkQmxvYkhlYWRlckNvbnRlbnQoZmQsIHBvc2l0aW9uICsgQkxPQl9IRUFERVJfU0laRV9TSVpFLCBibG9iSGVhZGVyU2l6ZSwgZnVuY3Rpb24oZXJyLCBibG9iSGVhZGVyKXtcbiAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGJsb2JIZWFkZXIucG9zaXRpb24gPSBwb3NpdGlvbiArIEJMT0JfSEVBREVSX1NJWkVfU0laRSArIGJsb2JIZWFkZXJTaXplO1xuXG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyLCB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb246IHBvc2l0aW9uLFxuICAgICAgICAgICAgICAgIHNpemU6IEJMT0JfSEVBREVSX1NJWkVfU0laRSArIGJsb2JIZWFkZXJTaXplICsgYmxvYkhlYWRlci5kYXRhc2l6ZSxcbiAgICAgICAgICAgICAgICBibG9iSGVhZGVyOiBibG9iSGVhZGVyXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIHJlYWRGaWxlQmxvY2tzKGZkLCBjYWxsYmFjayl7XG4gICAgcmVhZGVyLmdldEZpbGVTaXplKGZkLCBmdW5jdGlvbihlcnIsIGZpbGVTaXplKXtcbiAgICAgICAgdmFyIHBvc2l0aW9uLCBmaWxlQmxvY2tzO1xuXG4gICAgICAgIHBvc2l0aW9uID0gMDtcbiAgICAgICAgZmlsZUJsb2NrcyA9IFtdO1xuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWROZXh0RmlsZUJsb2NrKCl7XG4gICAgICAgICAgICByZWFkRmlsZUJsb2NrKGZkLCBwb3NpdGlvbiwgZnVuY3Rpb24oZXJyLCBmaWxlQmxvY2spe1xuICAgICAgICAgICAgICAgIGlmKGVycil7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGZpbGVCbG9ja3MucHVzaChmaWxlQmxvY2spO1xuXG4gICAgICAgICAgICAgICAgcG9zaXRpb24gPSBmaWxlQmxvY2sucG9zaXRpb24gKyBmaWxlQmxvY2suc2l6ZTtcblxuICAgICAgICAgICAgICAgIGlmKHBvc2l0aW9uIDwgZmlsZVNpemUpe1xuICAgICAgICAgICAgICAgICAgICByZWFkTmV4dEZpbGVCbG9jaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBlbHNle1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmlsZUJsb2Nrcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZWFkTmV4dEZpbGVCbG9jaygpO1xuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBnZXRTdHJpbmdUYWJsZUVudHJ5KGkpe1xuICAgIHZhciBzLCBzdHI7XG5cbiAgICAvLyBkZWNvZGUgU3RyaW5nVGFibGUgZW50cnkgb25seSBvbmNlIGFuZCBjYWNoZVxuICAgIGlmIChpIGluIHRoaXMuY2FjaGUpIHtcbiAgICAgICAgc3RyID0gdGhpcy5jYWNoZVtpXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBzID0gdGhpcy5zW2ldO1xuXG4gICAgICAgIHN0ciA9IHMudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgICAgIHRoaXMuY2FjaGVbaV0gPSBzdHI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gZXh0ZW5kU3RyaW5nVGFibGUoc3Qpe1xuICAgIHN0LmNhY2hlID0ge307XG4gICAgc3QuZ2V0RW50cnkgPSBnZXRTdHJpbmdUYWJsZUVudHJ5O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb2Rlc1ZpZXcocGIsIHBnKXtcbiAgICB2YXIgbGVuZ3RoLCB0YWdzTGlzdCwgZGVsdGFEYXRhO1xuXG4gICAgaWYocGcubm9kZXMubGVuZ3RoICE9PSAwKXtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdwcmltaXRpdmVncm91cC5ub2Rlcy5sZW5ndGggIT09IDAgbm90IHN1cHBvcnRlZCB5ZXQnKTtcbiAgICB9XG5cbiAgICBsZW5ndGggPSAwO1xuXG4gICAgaWYocGcuZGVuc2Upe1xuICAgICAgICBsZW5ndGggPSBwZy5kZW5zZS5pZC5sZW5ndGg7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY3JlYXRlVGFnc0xpc3QoKXtcbiAgICAgICAgdmFyIHRhZ3NMaXN0LCBpLCB0YWdzTGlzdEksIHRhZ3MsIGtleUlkLCBrZXlzVmFscywgdmFsSWQsIGtleSwgdmFsO1xuXG4gICAgICAgIGlmKCFwZy5kZW5zZSl7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGtleXNWYWxzID0gcGcuZGVuc2Uua2V5c1ZhbHM7XG4gICAgICAgIHRhZ3MgPSB7fTtcbiAgICAgICAgdGFnc0xpc3QgPSBbXTtcblxuICAgICAgICBmb3IoaSA9IDA7IGkgPCBrZXlzVmFscy5sZW5ndGg7KXtcbiAgICAgICAgICAgIGtleUlkID0ga2V5c1ZhbHNbaSsrXTtcblxuICAgICAgICAgICAgaWYoa2V5SWQgPT09IDApe1xuICAgICAgICAgICAgICAgIHRhZ3NMaXN0LnB1c2godGFncyk7XG5cbiAgICAgICAgICAgICAgICB0YWdzID0ge307XG5cbiAgICAgICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdmFsSWQgPSBrZXlzVmFsc1tpKytdO1xuXG4gICAgICAgICAgICBrZXkgPSBwYi5zdHJpbmd0YWJsZS5nZXRFbnRyeShrZXlJZCk7XG4gICAgICAgICAgICB2YWwgPSBwYi5zdHJpbmd0YWJsZS5nZXRFbnRyeSh2YWxJZCk7XG5cbiAgICAgICAgICAgIHRhZ3Nba2V5XSA9IHZhbDtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB0YWdzTGlzdDtcbiAgICB9XG5cbiAgICB0YWdzTGlzdCA9IGNyZWF0ZVRhZ3NMaXN0KCk7XG5cbiAgICBmdW5jdGlvbiBjb2xsZWN0RGVsdGFEYXRhKCl7XG4gICAgICAgIHZhciBpLCBpZCwgdGltZXN0YW1wLCBjaGFuZ2VzZXQsIHVpZCwgdXNlckluZGV4LCBkZWx0YURhdGFMaXN0LCBkZWx0YURhdGEsIGxhdCwgbG9uO1xuXG4gICAgICAgIGlmKCFwZy5kZW5zZSl7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfVxuXG4gICAgICAgIGlkID0gMDtcbiAgICAgICAgbGF0ID0gMDtcbiAgICAgICAgbG9uID0gMDtcblxuICAgICAgICBpZihwZy5kZW5zZS5kZW5zZWluZm8pe1xuICAgICAgICAgICAgdGltZXN0YW1wID0gMDtcbiAgICAgICAgICAgIGNoYW5nZXNldCA9IDA7XG4gICAgICAgICAgICB1aWQgPSAwO1xuICAgICAgICAgICAgdXNlckluZGV4ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgIGRlbHRhRGF0YUxpc3QgPSBbXTtcblxuICAgICAgICBmb3IoaSA9IDA7IGkgPCBsZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAvLyBUT0RPIHdlIHNob3VsZCB0ZXN0IHdoZWF0aGVyIGFkZGluZyA2NGJpdCBudW1iZXJzIHdvcmtzIGZpbmUgd2l0aCBoaWdoIHZhbHVlc1xuICAgICAgICAgICAgaWQgKz0gdG9OdW1iZXIocGcuZGVuc2UuaWRbaV0pO1xuXG4gICAgICAgICAgICBsYXQgKz0gdG9OdW1iZXIocGcuZGVuc2UubGF0W2ldKTtcbiAgICAgICAgICAgIGxvbiArPSB0b051bWJlcihwZy5kZW5zZS5sb25baV0pO1xuXG4gICAgICAgICAgICBkZWx0YURhdGEgPSB7XG4gICAgICAgICAgICAgICAgaWQ6IGlkLFxuICAgICAgICAgICAgICAgIGxhdDogbGF0LFxuICAgICAgICAgICAgICAgIGxvbjogbG9uXG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICBpZihwZy5kZW5zZS5kZW5zZWluZm8pe1xuICAgICAgICAgICAgICAgIC8vIFRPRE8gd2Ugc2hvdWxkIHRlc3Qgd2hlYXRoZXIgYWRkaW5nIDY0Yml0IG51bWJlcnMgd29ya3MgZmluZSB3aXRoIGhpZ2ggdmFsdWVzXG4gICAgICAgICAgICAgICAgdGltZXN0YW1wICs9IHRvTnVtYmVyKHBnLmRlbnNlLmRlbnNlaW5mby50aW1lc3RhbXBbaV0pO1xuICAgICAgICAgICAgICAgIGNoYW5nZXNldCArPSB0b051bWJlcihwZy5kZW5zZS5kZW5zZWluZm8uY2hhbmdlc2V0W2ldKTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE8gd2Ugc2hvdWxkIHRlc3Qgd2hlYXRoZXIgYWRkaW5nIDY0Yml0IG51bWJlcnMgd29ya3MgZmluZSB3aXRoIGhpZ2ggdmFsdWVzXG4gICAgICAgICAgICAgICAgdWlkICs9IHBnLmRlbnNlLmRlbnNlaW5mby51aWRbaV07XG5cbiAgICAgICAgICAgICAgICB1c2VySW5kZXggKz0gcGcuZGVuc2UuZGVuc2VpbmZvLnVzZXJTaWRbaV07XG5cbiAgICAgICAgICAgICAgICBkZWx0YURhdGEudGltZXN0YW1wID0gdGltZXN0YW1wICogcGIuZGF0ZUdyYW51bGFyaXR5O1xuICAgICAgICAgICAgICAgIGRlbHRhRGF0YS5jaGFuZ2VzZXQgPSBjaGFuZ2VzZXQ7XG4gICAgICAgICAgICAgICAgZGVsdGFEYXRhLnVpZCA9IHVpZDtcbiAgICAgICAgICAgICAgICBkZWx0YURhdGEudXNlckluZGV4ID0gdXNlckluZGV4O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBkZWx0YURhdGFMaXN0LnB1c2goZGVsdGFEYXRhKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBkZWx0YURhdGFMaXN0O1xuICAgIH1cblxuICAgIGRlbHRhRGF0YSA9IGNvbGxlY3REZWx0YURhdGEoKTtcblxuICAgIGZ1bmN0aW9uIGdldChpKXtcbiAgICAgICAgdmFyIG5vZGUsIG5vZGVEZWx0YURhdGE7XG5cbiAgICAgICAgbm9kZURlbHRhRGF0YSA9IGRlbHRhRGF0YVtpXTtcblxuICAgICAgICBub2RlID0ge1xuICAgICAgICAgICAgaWQ6ICcnICsgbm9kZURlbHRhRGF0YS5pZCxcbiAgICAgICAgICAgIGxhdDogKHRvTnVtYmVyKHBiLmxhdE9mZnNldCkgKyAocGIuZ3JhbnVsYXJpdHkgKiBub2RlRGVsdGFEYXRhLmxhdCkpIC8gMTAwMDAwMDAwMCxcbiAgICAgICAgICAgIGxvbjogKHRvTnVtYmVyKHBiLmxvbk9mZnNldCkgKyAocGIuZ3JhbnVsYXJpdHkgKiBub2RlRGVsdGFEYXRhLmxvbikpIC8gMTAwMDAwMDAwMCxcbiAgICAgICAgICAgIHRhZ3M6IHRhZ3NMaXN0W2ldXG4gICAgICAgIH07XG5cbiAgICAgICAgaWYocGcuZGVuc2UuZGVuc2VpbmZvKXtcbiAgICAgICAgICAgIG5vZGUudmVyc2lvbiA9IHBnLmRlbnNlLmRlbnNlaW5mby52ZXJzaW9uW2ldO1xuICAgICAgICAgICAgbm9kZS50aW1lc3RhbXAgPSBub2RlRGVsdGFEYXRhLnRpbWVzdGFtcDtcbiAgICAgICAgICAgIG5vZGUuY2hhbmdlc2V0ID0gbm9kZURlbHRhRGF0YS5jaGFuZ2VzZXQ7XG4gICAgICAgICAgICBub2RlLnVpZCA9ICcnICsgbm9kZURlbHRhRGF0YS51aWQ7XG4gICAgICAgICAgICBub2RlLnVzZXIgPSBwYi5zdHJpbmd0YWJsZS5nZXRFbnRyeShub2RlRGVsdGFEYXRhLnVzZXJJbmRleCk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbm9kZTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgICAgZ2V0OiBnZXRcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVUYWdzT2JqZWN0KHBiLCBlbnRpdHkpe1xuICAgIHZhciB0YWdzLCBpLCBsZW4sIGtleUksIHZhbEksIGtleSwgdmFsO1xuXG4gICAgdGFncyA9IHt9O1xuXG4gICAgZm9yKGkgPSAwLCBsZW4gPSBlbnRpdHkua2V5cy5sZW5ndGg7IGkgPCBsZW47ICsraSl7XG4gICAgICAgIGtleUkgPSBlbnRpdHkua2V5c1tpXTtcbiAgICAgICAgdmFsSSA9IGVudGl0eS52YWxzW2ldO1xuXG4gICAgICAgIGtleSA9IHBiLnN0cmluZ3RhYmxlLmdldEVudHJ5KGtleUkpO1xuICAgICAgICB2YWwgPSBwYi5zdHJpbmd0YWJsZS5nZXRFbnRyeSh2YWxJKTtcblxuICAgICAgICB0YWdzW2tleV0gPSB2YWw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhZ3M7XG59XG5cbmZ1bmN0aW9uIGFkZEluZm8ocGIsIHJlc3VsdCwgaW5mbyl7XG4gICAgaWYgKGluZm8pIHtcbiAgICAgICAgaWYgKGluZm8udmVyc2lvbikge1xuICAgICAgICAgICAgcmVzdWx0LnZlcnNpb24gPSBpbmZvLnZlcnNpb247XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZm8udGltZXN0YW1wKSB7XG4gICAgICAgICAgICByZXN1bHQudGltZXN0YW1wID0gdG9OdW1iZXIoaW5mby50aW1lc3RhbXApICogcGIuZGF0ZUdyYW51bGFyaXR5O1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmZvLmNoYW5nZXNldCkge1xuICAgICAgICAgICAgcmVzdWx0LmNoYW5nZXNldCA9IHRvTnVtYmVyKGluZm8uY2hhbmdlc2V0KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5mby51aWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC51aWQgPSAnJyArIGluZm8udWlkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmZvLnVzZXJTaWQpIHtcbiAgICAgICAgICAgIHJlc3VsdC51c2VyID0gcGIuc3RyaW5ndGFibGUuZ2V0RW50cnkoaW5mby51c2VyU2lkKTtcbiAgICAgICAgfVxuICAgIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlV2F5c1ZpZXcocGIsIHBnKXtcbiAgICB2YXIgbGVuZ3RoO1xuXG4gICAgbGVuZ3RoID0gcGcud2F5cy5sZW5ndGg7XG5cbiAgICBmdW5jdGlvbiBnZXQoaSl7XG4gICAgICAgIHZhciB3YXksIHJlc3VsdCwgaW5mbztcblxuICAgICAgICB3YXkgPSBwZy53YXlzW2ldO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZU5vZGVSZWZJZHMoKXtcbiAgICAgICAgICAgIHZhciBub2RlSWRzLCBsYXN0UmVmSWQsIGk7XG5cbiAgICAgICAgICAgIG5vZGVJZHMgPSBbXTtcbiAgICAgICAgICAgIGxhc3RSZWZJZCA9IDA7XG5cbiAgICAgICAgICAgIGZvcihpID0gMDsgaSA8IHdheS5yZWZzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICAvLyBUT0RPIHdlIHNob3VsZCB0ZXN0IHdoZWF0aGVyIGFkZGluZyA2NGJpdCBudW1iZXJzIHdvcmtzIGZpbmUgd2l0aCBoaWdoIHZhbHVlc1xuICAgICAgICAgICAgICAgIGxhc3RSZWZJZCArPSB0b051bWJlcih3YXkucmVmc1tpXSk7XG5cbiAgICAgICAgICAgICAgICBub2RlSWRzLnB1c2goJycgKyBsYXN0UmVmSWQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gbm9kZUlkcztcbiAgICAgICAgfVxuXG4gICAgICAgIHJlc3VsdCA9IHtcbiAgICAgICAgICAgIGlkOiB3YXkuaWQudG9TdHJpbmcoKSxcbiAgICAgICAgICAgIHRhZ3M6IGNyZWF0ZVRhZ3NPYmplY3QocGIsIHdheSksXG4gICAgICAgICAgICBub2RlUmVmczogY3JlYXRlTm9kZVJlZklkcygpXG4gICAgICAgIH07XG5cbiAgICAgICAgYWRkSW5mbyhwYiwgcmVzdWx0LCB3YXkuaW5mbyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgICBsZW5ndGg6IGxlbmd0aCxcbiAgICAgICAgZ2V0OiBnZXRcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVSZWxhdGlvbnNWaWV3KHBiLCBwZyl7XG4gICAgdmFyIGxlbmd0aDtcblxuICAgIGxlbmd0aCA9IHBnLnJlbGF0aW9ucy5sZW5ndGg7XG5cbiAgICBmdW5jdGlvbiBnZXQoaSl7XG4gICAgICAgIHZhciByZWxhdGlvbiwgcmVzdWx0LCBpbmZvO1xuXG4gICAgICAgIHJlbGF0aW9uID0gcGcucmVsYXRpb25zW2ldO1xuXG4gICAgICAgIGZ1bmN0aW9uIGNyZWF0ZU1lbWJlcnMoKXtcbiAgICAgICAgICAgIHZhciBtZW1iZXJzLCBtZW1iZXJPYmosIGxhc3RSZWZJZCwgaSwgTWVtYmVyVHlwZSwgdHlwZTtcblxuICAgICAgICAgICAgTWVtYmVyVHlwZSA9IHByb3RvLk9TTVBCRi5SZWxhdGlvbi5NZW1iZXJUeXBlO1xuICAgICAgICAgICAgbWVtYmVycyA9IFtdO1xuICAgICAgICAgICAgbGFzdFJlZklkID0gMDtcblxuICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgcmVsYXRpb24ubWVtaWRzLmxlbmd0aDsgKytpKXtcbiAgICAgICAgICAgICAgICBtZW1iZXJPYmogPSB7fTtcblxuICAgICAgICAgICAgICAgIC8vIFRPRE8gd2Ugc2hvdWxkIHRlc3Qgd2hlYXRoZXIgYWRkaW5nIDY0Yml0IG51bWJlcnMgd29ya3MgZmluZSB3aXRoIGhpZ2ggdmFsdWVzXG4gICAgICAgICAgICAgICAgbGFzdFJlZklkICs9IHRvTnVtYmVyKHJlbGF0aW9uLm1lbWlkc1tpXSk7XG4gICAgICAgICAgICAgICAgbWVtYmVyT2JqLnJlZiA9ICcnICsgbGFzdFJlZklkO1xuXG4gICAgICAgICAgICAgICAgbWVtYmVyT2JqLnJvbGUgPSBwYi5zdHJpbmd0YWJsZS5nZXRFbnRyeShyZWxhdGlvbi5yb2xlc1NpZFtpXSk7XG5cbiAgICAgICAgICAgICAgICB0eXBlID0gcmVsYXRpb24udHlwZXNbaV07XG4gICAgICAgICAgICAgICAgaWYgKE1lbWJlclR5cGUuTk9ERSA9PT0gdHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBtZW1iZXJPYmoudHlwZSA9ICdub2RlJztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoTWVtYmVyVHlwZS5XQVkgPT09IHR5cGUpIHtcbiAgICAgICAgICAgICAgICAgICAgbWVtYmVyT2JqLnR5cGUgPSAnd2F5JztcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYoTWVtYmVyVHlwZS5SRUxBVElPTiA9PT0gdHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBtZW1iZXJPYmoudHlwZSA9ICdyZWxhdGlvbic7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgbWVtYmVycy5wdXNoKG1lbWJlck9iaik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBtZW1iZXJzO1xuICAgICAgICB9XG5cbiAgICAgICAgcmVzdWx0ID0ge1xuICAgICAgICAgICAgaWQ6IHJlbGF0aW9uLmlkLnRvU3RyaW5nKCksXG4gICAgICAgICAgICB0YWdzOiBjcmVhdGVUYWdzT2JqZWN0KHBiLCByZWxhdGlvbiksXG4gICAgICAgICAgICBtZW1iZXJzOiBjcmVhdGVNZW1iZXJzKClcbiAgICAgICAgfTtcblxuICAgICAgICBhZGRJbmZvKHBiLCByZXN1bHQsIHJlbGF0aW9uLmluZm8pO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgICAgbGVuZ3RoOiBsZW5ndGgsXG4gICAgICAgIGdldDogZ2V0XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gdG9OdW1iZXIoeCl7XG4gICAgcmV0dXJuIHR5cGVvZih4KSA9PT0gJ251bWJlcicgPyB4IDogeC50b051bWJlcigpO1xufVxuXG5mdW5jdGlvbiBleHRlbmRQcmltaXRpdmVHcm91cChwYiwgcGcpe1xuICAgIHBnLm5vZGVzVmlldyA9IGNyZWF0ZU5vZGVzVmlldyhwYiwgcGcpO1xuICAgIHBnLndheXNWaWV3ID0gY3JlYXRlV2F5c1ZpZXcocGIsIHBnKTtcbiAgICBwZy5yZWxhdGlvbnNWaWV3ID0gY3JlYXRlUmVsYXRpb25zVmlldyhwYiwgcGcpO1xufVxuXG5mdW5jdGlvbiBkZWNvZGVQcmltaXRpdmVCbG9jayhidWZmZXIpe1xuICAgIHZhciBkYXRhLCBpO1xuXG4gICAgZGF0YSA9IHByb3RvLk9TTVBCRi5QcmltaXRpdmVCbG9jay5kZWNvZGUoYnVmZmVyKTtcblxuICAgIC8vIGV4dGVuZCBzdHJpbmd0YWJsZVxuICAgIGV4dGVuZFN0cmluZ1RhYmxlKGRhdGEuc3RyaW5ndGFibGUpO1xuXG4gICAgLy8gZXh0ZW5kIHByaW1pdGl2ZWdyb3VwXG4gICAgZm9yKGkgPSAwOyBpIDwgZGF0YS5wcmltaXRpdmVncm91cC5sZW5ndGg7ICsraSl7XG4gICAgICAgIGV4dGVuZFByaW1pdGl2ZUdyb3VwKGRhdGEsIGRhdGEucHJpbWl0aXZlZ3JvdXBbaV0pO1xuICAgIH1cblxuICAgIHJldHVybiBkYXRhO1xufVxuXG52YXIgT1NNX0JMT0JfREVDT0RFUl9CWV9UWVBFID0ge1xuICAgICdPU01IZWFkZXInOiBwcm90by5PU01QQkYuSGVhZGVyQmxvY2suZGVjb2RlLFxuICAgICdPU01EYXRhJzogZGVjb2RlUHJpbWl0aXZlQmxvY2tcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZUZpbGVQYXJzZXIoZmQsIGNhbGxiYWNrKXtcbiAgICByZWFkRmlsZUJsb2NrcyhmZCwgZnVuY3Rpb24oZXJyLCBmaWxlQmxvY2tzKXtcbiAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjayhlcnIpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gZmluZEZpbGVCbG9ja3NCeUJsb2JUeXBlKGJsb2JUeXBlKXtcbiAgICAgICAgICAgIHZhciBibG9ja3MsIGksIGJsb2NrO1xuXG4gICAgICAgICAgICBibG9ja3MgPSBbXTtcblxuICAgICAgICAgICAgZm9yKGkgPSAwOyBpIDwgZmlsZUJsb2Nrcy5sZW5ndGg7ICsraSl7XG4gICAgICAgICAgICAgICAgYmxvY2sgPSBmaWxlQmxvY2tzW2ldO1xuXG4gICAgICAgICAgICAgICAgaWYoYmxvY2suYmxvYkhlYWRlci50eXBlICE9PSBibG9iVHlwZSl7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGJsb2Nrcy5wdXNoKGJsb2NrKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGJsb2NrcztcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRCbG9iKGZpbGVCbG9jaywgY2FsbGJhY2spe1xuICAgICAgICAgICAgcmV0dXJuIHJlYWRlci5yZWFkUEJGRWxlbWVudChmZCwgZmlsZUJsb2NrLmJsb2JIZWFkZXIucG9zaXRpb24sIGZpbGVCbG9jay5ibG9iSGVhZGVyLmRhdGFzaXplLCBwcm90by5PU01QQkYuQmxvYi5kZWNvZGUsIGNhbGxiYWNrKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRCbG9jayhmaWxlQmxvY2ssIGNhbGxiYWNrKXtcbiAgICAgICAgICAgIHJldHVybiByZWFkQmxvYihmaWxlQmxvY2ssIGZ1bmN0aW9uKGVyciwgYmxvYil7XG4gICAgICAgICAgICAgICAgaWYoZXJyKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYoYmxvYi5yYXdTaXplID09PSAwKXtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKCdVbmNvbXByZXNzZWQgcGJmcyBhcmUgY3VycmVudGx5IG5vdCBzdXBwb3J0ZWQuJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgemxpYi5pbmZsYXRlQmxvYihibG9iLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuICAgICAgICAgICAgICAgICAgICBpZihlcnIpe1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYnVmLnJlYWRQQkZFbGVtZW50RnJvbUJ1ZmZlcihkYXRhLCBPU01fQkxPQl9ERUNPREVSX0JZX1RZUEVbZmlsZUJsb2NrLmJsb2JIZWFkZXIudHlwZV0sIGNhbGxiYWNrKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIHtcbiAgICAgICAgICAgIGZpbGVCbG9ja3M6IGZpbGVCbG9ja3MsXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGZpbmRGaWxlQmxvY2tzQnlCbG9iVHlwZTogZmluZEZpbGVCbG9ja3NCeUJsb2JUeXBlLFxuXG4gICAgICAgICAgICByZWFkQmxvY2s6IHJlYWRCbG9ja1xuICAgICAgICB9KTtcbiAgICB9KTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcGFyc2U6IHBhcnNlLFxuXG4gICAgY3JlYXRlUGFyc2VyOiBjcmVhdGVQYXRoUGFyc2VyXG59O1xuIiwiLyplc2xpbnQtZGlzYWJsZSBibG9jay1zY29wZWQtdmFyLCBpZC1sZW5ndGgsIG5vLWNvbnRyb2wtcmVnZXgsIG5vLW1hZ2ljLW51bWJlcnMsIG5vLXByb3RvdHlwZS1idWlsdGlucywgbm8tcmVkZWNsYXJlLCBuby1zaGFkb3csIG5vLXZhciwgc29ydC12YXJzKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgJHByb3RvYnVmID0gcmVxdWlyZShcInByb3RvYnVmanMvbWluaW1hbFwiKTtcblxuLy8gQ29tbW9uIGFsaWFzZXNcbnZhciAkUmVhZGVyID0gJHByb3RvYnVmLlJlYWRlciwgJFdyaXRlciA9ICRwcm90b2J1Zi5Xcml0ZXIsICR1dGlsID0gJHByb3RvYnVmLnV0aWw7XG5cbi8vIEV4cG9ydGVkIHJvb3QgbmFtZXNwYWNlXG52YXIgJHJvb3QgPSAkcHJvdG9idWYucm9vdHNbXCJkZWZhdWx0XCJdIHx8ICgkcHJvdG9idWYucm9vdHNbXCJkZWZhdWx0XCJdID0ge30pO1xuXG4kcm9vdC5PU01QQkYgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAvKipcbiAgICAgKiBOYW1lc3BhY2UgT1NNUEJGLlxuICAgICAqIEBleHBvcnRzIE9TTVBCRlxuICAgICAqIEBuYW1lc3BhY2VcbiAgICAgKi9cbiAgICB2YXIgT1NNUEJGID0ge307XG5cbiAgICBPU01QQkYuQmxvYiA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvcGVydGllcyBvZiBhIEJsb2IuXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkZcbiAgICAgICAgICogQGludGVyZmFjZSBJQmxvYlxuICAgICAgICAgKiBAcHJvcGVydHkge1VpbnQ4QXJyYXl8bnVsbH0gW3Jhd10gQmxvYiByYXdcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8bnVsbH0gW3Jhd1NpemVdIEJsb2IgcmF3U2l6ZVxuICAgICAgICAgKiBAcHJvcGVydHkge1VpbnQ4QXJyYXl8bnVsbH0gW3psaWJEYXRhXSBCbG9iIHpsaWJEYXRhXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7VWludDhBcnJheXxudWxsfSBbbHptYURhdGFdIEJsb2IgbHptYURhdGFcbiAgICAgICAgICogQHByb3BlcnR5IHtVaW50OEFycmF5fG51bGx9IFtPQlNPTEVURUJ6aXAyRGF0YV0gQmxvYiBPQlNPTEVURUJ6aXAyRGF0YVxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBCbG9iLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyBhIEJsb2IuXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElCbG9iXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JQmxvYj19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gQmxvYihwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJsb2IgcmF3LlxuICAgICAgICAgKiBAbWVtYmVyIHtVaW50OEFycmF5fSByYXdcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYi5wcm90b3R5cGUucmF3ID0gJHV0aWwubmV3QnVmZmVyKFtdKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmxvYiByYXdTaXplLlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ9IHJhd1NpemVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYi5wcm90b3R5cGUucmF3U2l6ZSA9IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJsb2IgemxpYkRhdGEuXG4gICAgICAgICAqIEBtZW1iZXIge1VpbnQ4QXJyYXl9IHpsaWJEYXRhXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYlxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEJsb2IucHJvdG90eXBlLnpsaWJEYXRhID0gJHV0aWwubmV3QnVmZmVyKFtdKTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQmxvYiBsem1hRGF0YS5cbiAgICAgICAgICogQG1lbWJlciB7VWludDhBcnJheX0gbHptYURhdGFcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYi5wcm90b3R5cGUubHptYURhdGEgPSAkdXRpbC5uZXdCdWZmZXIoW10pO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCbG9iIE9CU09MRVRFQnppcDJEYXRhLlxuICAgICAgICAgKiBAbWVtYmVyIHtVaW50OEFycmF5fSBPQlNPTEVURUJ6aXAyRGF0YVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkJsb2JcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBCbG9iLnByb3RvdHlwZS5PQlNPTEVURUJ6aXAyRGF0YSA9ICR1dGlsLm5ld0J1ZmZlcihbXSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgQmxvYiBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBjcmVhdGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSUJsb2I9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5CbG9ifSBCbG9iIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBCbG9iLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEJsb2IocHJvcGVydGllcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBCbG9iIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIE9TTVBCRi5CbG9iLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYlxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklCbG9ifSBtZXNzYWdlIEJsb2IgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBCbG9iLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yYXcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwicmF3XCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMiA9Ki8xMCkuYnl0ZXMobWVzc2FnZS5yYXcpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucmF3U2l6ZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJyYXdTaXplXCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgMCA9Ki8xNikuaW50MzIobWVzc2FnZS5yYXdTaXplKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnpsaWJEYXRhICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInpsaWJEYXRhXCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMywgd2lyZVR5cGUgMiA9Ki8yNikuYnl0ZXMobWVzc2FnZS56bGliRGF0YSk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sem1hRGF0YSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsem1hRGF0YVwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDIgPSovMzQpLmJ5dGVzKG1lc3NhZ2UubHptYURhdGEpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuT0JTT0xFVEVCemlwMkRhdGEgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiT0JTT0xFVEVCemlwMkRhdGFcIikpXG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCA1LCB3aXJlVHlwZSAyID0qLzQyKS5ieXRlcyhtZXNzYWdlLk9CU09MRVRFQnppcDJEYXRhKTtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBCbG9iIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIE9TTVBCRi5CbG9iLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYlxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklCbG9ifSBtZXNzYWdlIEJsb2IgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBCbG9iLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgQmxvYiBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYlxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkJsb2J9IEJsb2JcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBCbG9iLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5CbG9iKCk7XG4gICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucmF3ID0gcmVhZGVyLmJ5dGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yYXdTaXplID0gcmVhZGVyLmludDMyKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS56bGliRGF0YSA9IHJlYWRlci5ieXRlcygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubHptYURhdGEgPSByZWFkZXIuYnl0ZXMoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLk9CU09MRVRFQnppcDJEYXRhID0gcmVhZGVyLmJ5dGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBCbG9iIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuQmxvYn0gQmxvYlxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIEJsb2IuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gbmV3ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgQmxvYiBtZXNzYWdlLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdmVyaWZ5XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYlxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYi52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yYXcgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwicmF3XCIpKVxuICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UucmF3ICYmIHR5cGVvZiBtZXNzYWdlLnJhdy5sZW5ndGggPT09IFwibnVtYmVyXCIgfHwgJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5yYXcpKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicmF3OiBidWZmZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJhd1NpemUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwicmF3U2l6ZVwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnJhd1NpemUpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyYXdTaXplOiBpbnRlZ2VyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS56bGliRGF0YSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ6bGliRGF0YVwiKSlcbiAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLnpsaWJEYXRhICYmIHR5cGVvZiBtZXNzYWdlLnpsaWJEYXRhLmxlbmd0aCA9PT0gXCJudW1iZXJcIiB8fCAkdXRpbC5pc1N0cmluZyhtZXNzYWdlLnpsaWJEYXRhKSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInpsaWJEYXRhOiBidWZmZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmx6bWFEYXRhICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImx6bWFEYXRhXCIpKVxuICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UubHptYURhdGEgJiYgdHlwZW9mIG1lc3NhZ2UubHptYURhdGEubGVuZ3RoID09PSBcIm51bWJlclwiIHx8ICR1dGlsLmlzU3RyaW5nKG1lc3NhZ2UubHptYURhdGEpKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwibHptYURhdGE6IGJ1ZmZlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuT0JTT0xFVEVCemlwMkRhdGEgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiT0JTT0xFVEVCemlwMkRhdGFcIikpXG4gICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5PQlNPTEVURUJ6aXAyRGF0YSAmJiB0eXBlb2YgbWVzc2FnZS5PQlNPTEVURUJ6aXAyRGF0YS5sZW5ndGggPT09IFwibnVtYmVyXCIgfHwgJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5PQlNPTEVURUJ6aXAyRGF0YSkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJPQlNPTEVURUJ6aXAyRGF0YTogYnVmZmVyIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIEJsb2IgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkJsb2JcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuQmxvYn0gQmxvYlxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYi5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5PU01QQkYuQmxvYilcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3QuT1NNUEJGLkJsb2IoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QucmF3ICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QucmF3ID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAkdXRpbC5iYXNlNjQuZGVjb2RlKG9iamVjdC5yYXcsIG1lc3NhZ2UucmF3ID0gJHV0aWwubmV3QnVmZmVyKCR1dGlsLmJhc2U2NC5sZW5ndGgob2JqZWN0LnJhdykpLCAwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QucmF3Lmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yYXcgPSBvYmplY3QucmF3O1xuICAgICAgICAgICAgaWYgKG9iamVjdC5yYXdTaXplICE9IG51bGwpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yYXdTaXplID0gb2JqZWN0LnJhd1NpemUgfCAwO1xuICAgICAgICAgICAgaWYgKG9iamVjdC56bGliRGF0YSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LnpsaWJEYXRhID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAkdXRpbC5iYXNlNjQuZGVjb2RlKG9iamVjdC56bGliRGF0YSwgbWVzc2FnZS56bGliRGF0YSA9ICR1dGlsLm5ld0J1ZmZlcigkdXRpbC5iYXNlNjQubGVuZ3RoKG9iamVjdC56bGliRGF0YSkpLCAwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QuemxpYkRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnpsaWJEYXRhID0gb2JqZWN0LnpsaWJEYXRhO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5sem1hRGF0YSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0Lmx6bWFEYXRhID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAkdXRpbC5iYXNlNjQuZGVjb2RlKG9iamVjdC5sem1hRGF0YSwgbWVzc2FnZS5sem1hRGF0YSA9ICR1dGlsLm5ld0J1ZmZlcigkdXRpbC5iYXNlNjQubGVuZ3RoKG9iamVjdC5sem1hRGF0YSkpLCAwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QubHptYURhdGEubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmx6bWFEYXRhID0gb2JqZWN0Lmx6bWFEYXRhO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5PQlNPTEVURUJ6aXAyRGF0YSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0Lk9CU09MRVRFQnppcDJEYXRhID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAkdXRpbC5iYXNlNjQuZGVjb2RlKG9iamVjdC5PQlNPTEVURUJ6aXAyRGF0YSwgbWVzc2FnZS5PQlNPTEVURUJ6aXAyRGF0YSA9ICR1dGlsLm5ld0J1ZmZlcigkdXRpbC5iYXNlNjQubGVuZ3RoKG9iamVjdC5PQlNPTEVURUJ6aXAyRGF0YSkpLCAwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QuT0JTT0xFVEVCemlwMkRhdGEubGVuZ3RoKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLk9CU09MRVRFQnppcDJEYXRhID0gb2JqZWN0Lk9CU09MRVRFQnppcDJEYXRhO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIEJsb2IgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9PYmplY3RcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuQmxvYn0gbWVzc2FnZSBCbG9iXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLklDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYi50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmJ5dGVzID09PSBTdHJpbmcpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5yYXcgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QucmF3ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmJ5dGVzICE9PSBBcnJheSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5yYXcgPSAkdXRpbC5uZXdCdWZmZXIob2JqZWN0LnJhdyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIG9iamVjdC5yYXdTaXplID0gMDtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5ieXRlcyA9PT0gU3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuemxpYkRhdGEgPSBcIlwiO1xuICAgICAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QuemxpYkRhdGEgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYnl0ZXMgIT09IEFycmF5KVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnpsaWJEYXRhID0gJHV0aWwubmV3QnVmZmVyKG9iamVjdC56bGliRGF0YSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmJ5dGVzID09PSBTdHJpbmcpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sem1hRGF0YSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sem1hRGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5ieXRlcyAhPT0gQXJyYXkpXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QubHptYURhdGEgPSAkdXRpbC5uZXdCdWZmZXIob2JqZWN0Lmx6bWFEYXRhKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKG9wdGlvbnMuYnl0ZXMgPT09IFN0cmluZylcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lk9CU09MRVRFQnppcDJEYXRhID0gXCJcIjtcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lk9CU09MRVRFQnppcDJEYXRhID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmIChvcHRpb25zLmJ5dGVzICE9PSBBcnJheSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5PQlNPTEVURUJ6aXAyRGF0YSA9ICR1dGlsLm5ld0J1ZmZlcihvYmplY3QuT0JTT0xFVEVCemlwMkRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJhdyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJyYXdcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LnJhdyA9IG9wdGlvbnMuYnl0ZXMgPT09IFN0cmluZyA/ICR1dGlsLmJhc2U2NC5lbmNvZGUobWVzc2FnZS5yYXcsIDAsIG1lc3NhZ2UucmF3Lmxlbmd0aCkgOiBvcHRpb25zLmJ5dGVzID09PSBBcnJheSA/IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG1lc3NhZ2UucmF3KSA6IG1lc3NhZ2UucmF3O1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucmF3U2l6ZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJyYXdTaXplXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5yYXdTaXplID0gbWVzc2FnZS5yYXdTaXplO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuemxpYkRhdGEgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiemxpYkRhdGFcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LnpsaWJEYXRhID0gb3B0aW9ucy5ieXRlcyA9PT0gU3RyaW5nID8gJHV0aWwuYmFzZTY0LmVuY29kZShtZXNzYWdlLnpsaWJEYXRhLCAwLCBtZXNzYWdlLnpsaWJEYXRhLmxlbmd0aCkgOiBvcHRpb25zLmJ5dGVzID09PSBBcnJheSA/IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG1lc3NhZ2UuemxpYkRhdGEpIDogbWVzc2FnZS56bGliRGF0YTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmx6bWFEYXRhICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImx6bWFEYXRhXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5sem1hRGF0YSA9IG9wdGlvbnMuYnl0ZXMgPT09IFN0cmluZyA/ICR1dGlsLmJhc2U2NC5lbmNvZGUobWVzc2FnZS5sem1hRGF0YSwgMCwgbWVzc2FnZS5sem1hRGF0YS5sZW5ndGgpIDogb3B0aW9ucy5ieXRlcyA9PT0gQXJyYXkgPyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChtZXNzYWdlLmx6bWFEYXRhKSA6IG1lc3NhZ2UubHptYURhdGE7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5PQlNPTEVURUJ6aXAyRGF0YSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJPQlNPTEVURUJ6aXAyRGF0YVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuT0JTT0xFVEVCemlwMkRhdGEgPSBvcHRpb25zLmJ5dGVzID09PSBTdHJpbmcgPyAkdXRpbC5iYXNlNjQuZW5jb2RlKG1lc3NhZ2UuT0JTT0xFVEVCemlwMkRhdGEsIDAsIG1lc3NhZ2UuT0JTT0xFVEVCemlwMkRhdGEubGVuZ3RoKSA6IG9wdGlvbnMuYnl0ZXMgPT09IEFycmF5ID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobWVzc2FnZS5PQlNPTEVURUJ6aXAyRGF0YSkgOiBtZXNzYWdlLk9CU09MRVRFQnppcDJEYXRhO1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBCbG9iIHRvIEpTT04uXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b0pTT05cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBCbG9iLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gQmxvYjtcbiAgICB9KSgpO1xuXG4gICAgT1NNUEJGLkJsb2JIZWFkZXIgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBCbG9iSGVhZGVyLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBpbnRlcmZhY2UgSUJsb2JIZWFkZXJcbiAgICAgICAgICogQHByb3BlcnR5IHtzdHJpbmd9IHR5cGUgQmxvYkhlYWRlciB0eXBlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7VWludDhBcnJheXxudWxsfSBbaW5kZXhkYXRhXSBCbG9iSGVhZGVyIGluZGV4ZGF0YVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gZGF0YXNpemUgQmxvYkhlYWRlciBkYXRhc2l6ZVxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBCbG9iSGVhZGVyLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyBhIEJsb2JIZWFkZXIuXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElCbG9iSGVhZGVyXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JQmxvYkhlYWRlcj19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gQmxvYkhlYWRlcihwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJsb2JIZWFkZXIgdHlwZS5cbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSB0eXBlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYkhlYWRlclxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEJsb2JIZWFkZXIucHJvdG90eXBlLnR5cGUgPSBcIlwiO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBCbG9iSGVhZGVyIGluZGV4ZGF0YS5cbiAgICAgICAgICogQG1lbWJlciB7VWludDhBcnJheX0gaW5kZXhkYXRhXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYkhlYWRlclxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEJsb2JIZWFkZXIucHJvdG90eXBlLmluZGV4ZGF0YSA9ICR1dGlsLm5ld0J1ZmZlcihbXSk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEJsb2JIZWFkZXIgZGF0YXNpemUuXG4gICAgICAgICAqIEBtZW1iZXIge251bWJlcn0gZGF0YXNpemVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iSGVhZGVyXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYkhlYWRlci5wcm90b3R5cGUuZGF0YXNpemUgPSAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IEJsb2JIZWFkZXIgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gY3JlYXRlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYkhlYWRlclxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklCbG9iSGVhZGVyPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuQmxvYkhlYWRlcn0gQmxvYkhlYWRlciBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYkhlYWRlci5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBCbG9iSGVhZGVyKHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgQmxvYkhlYWRlciBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuQmxvYkhlYWRlci52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkJsb2JIZWFkZXJcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JQmxvYkhlYWRlcn0gbWVzc2FnZSBCbG9iSGVhZGVyIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYkhlYWRlci5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAyID0qLzEwKS5zdHJpbmcobWVzc2FnZS50eXBlKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZGV4ZGF0YSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpbmRleGRhdGFcIikpXG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAyLCB3aXJlVHlwZSAyID0qLzE4KS5ieXRlcyhtZXNzYWdlLmluZGV4ZGF0YSk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDMsIHdpcmVUeXBlIDAgPSovMjQpLmludDMyKG1lc3NhZ2UuZGF0YXNpemUpO1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIEJsb2JIZWFkZXIgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkJsb2JIZWFkZXIudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iSGVhZGVyXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSUJsb2JIZWFkZXJ9IG1lc3NhZ2UgQmxvYkhlYWRlciBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIEJsb2JIZWFkZXIuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBCbG9iSGVhZGVyIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iSGVhZGVyXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbbGVuZ3RoXSBNZXNzYWdlIGxlbmd0aCBpZiBrbm93biBiZWZvcmVoYW5kXG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuQmxvYkhlYWRlcn0gQmxvYkhlYWRlclxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIEJsb2JIZWFkZXIuZGVjb2RlID0gZnVuY3Rpb24gZGVjb2RlKHJlYWRlciwgbGVuZ3RoKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSAkUmVhZGVyLmNyZWF0ZShyZWFkZXIpO1xuICAgICAgICAgICAgdmFyIGVuZCA9IGxlbmd0aCA9PT0gdW5kZWZpbmVkID8gcmVhZGVyLmxlbiA6IHJlYWRlci5wb3MgKyBsZW5ndGgsIG1lc3NhZ2UgPSBuZXcgJHJvb3QuT1NNUEJGLkJsb2JIZWFkZXIoKTtcbiAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50eXBlID0gcmVhZGVyLnN0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaW5kZXhkYXRhID0gcmVhZGVyLmJ5dGVzKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5kYXRhc2l6ZSA9IHJlYWRlci5pbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInR5cGVcIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgJHV0aWwuUHJvdG9jb2xFcnJvcihcIm1pc3NpbmcgcmVxdWlyZWQgJ3R5cGUnXCIsIHsgaW5zdGFuY2U6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJkYXRhc2l6ZVwiKSlcbiAgICAgICAgICAgICAgICB0aHJvdyAkdXRpbC5Qcm90b2NvbEVycm9yKFwibWlzc2luZyByZXF1aXJlZCAnZGF0YXNpemUnXCIsIHsgaW5zdGFuY2U6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIEJsb2JIZWFkZXIgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkJsb2JIZWFkZXJcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5CbG9iSGVhZGVyfSBCbG9iSGVhZGVyXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgQmxvYkhlYWRlci5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSBuZXcgJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmVyaWZpZXMgYSBCbG9iSGVhZGVyIG1lc3NhZ2UuXG4gICAgICAgICAqIEBmdW5jdGlvbiB2ZXJpZnlcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iSGVhZGVyXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAqL1xuICAgICAgICBCbG9iSGVhZGVyLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS50eXBlKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0eXBlOiBzdHJpbmcgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZGV4ZGF0YSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpbmRleGRhdGFcIikpXG4gICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5pbmRleGRhdGEgJiYgdHlwZW9mIG1lc3NhZ2UuaW5kZXhkYXRhLmxlbmd0aCA9PT0gXCJudW1iZXJcIiB8fCAkdXRpbC5pc1N0cmluZyhtZXNzYWdlLmluZGV4ZGF0YSkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJpbmRleGRhdGE6IGJ1ZmZlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5kYXRhc2l6ZSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiZGF0YXNpemU6IGludGVnZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgQmxvYkhlYWRlciBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBmcm9tT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQmxvYkhlYWRlclxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5CbG9iSGVhZGVyfSBCbG9iSGVhZGVyXG4gICAgICAgICAqL1xuICAgICAgICBCbG9iSGVhZGVyLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lk9TTVBCRi5CbG9iSGVhZGVyKVxuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuQmxvYkhlYWRlcigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC50eXBlICE9IG51bGwpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS50eXBlID0gU3RyaW5nKG9iamVjdC50eXBlKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QuaW5kZXhkYXRhICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3QuaW5kZXhkYXRhID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAkdXRpbC5iYXNlNjQuZGVjb2RlKG9iamVjdC5pbmRleGRhdGEsIG1lc3NhZ2UuaW5kZXhkYXRhID0gJHV0aWwubmV3QnVmZmVyKCR1dGlsLmJhc2U2NC5sZW5ndGgob2JqZWN0LmluZGV4ZGF0YSkpLCAwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3QuaW5kZXhkYXRhLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pbmRleGRhdGEgPSBvYmplY3QuaW5kZXhkYXRhO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5kYXRhc2l6ZSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UuZGF0YXNpemUgPSBvYmplY3QuZGF0YXNpemUgfCAwO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIEJsb2JIZWFkZXIgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9PYmplY3RcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iSGVhZGVyXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuQmxvYkhlYWRlcn0gbWVzc2FnZSBCbG9iSGVhZGVyXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLklDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgQmxvYkhlYWRlci50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgIG9iamVjdC50eXBlID0gXCJcIjtcbiAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5ieXRlcyA9PT0gU3RyaW5nKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuaW5kZXhkYXRhID0gXCJcIjtcbiAgICAgICAgICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmluZGV4ZGF0YSA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0aW9ucy5ieXRlcyAhPT0gQXJyYXkpXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmplY3QuaW5kZXhkYXRhID0gJHV0aWwubmV3QnVmZmVyKG9iamVjdC5pbmRleGRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBvYmplY3QuZGF0YXNpemUgPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ0eXBlXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC50eXBlID0gbWVzc2FnZS50eXBlO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaW5kZXhkYXRhICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImluZGV4ZGF0YVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuaW5kZXhkYXRhID0gb3B0aW9ucy5ieXRlcyA9PT0gU3RyaW5nID8gJHV0aWwuYmFzZTY0LmVuY29kZShtZXNzYWdlLmluZGV4ZGF0YSwgMCwgbWVzc2FnZS5pbmRleGRhdGEubGVuZ3RoKSA6IG9wdGlvbnMuYnl0ZXMgPT09IEFycmF5ID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwobWVzc2FnZS5pbmRleGRhdGEpIDogbWVzc2FnZS5pbmRleGRhdGE7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5kYXRhc2l6ZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJkYXRhc2l6ZVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuZGF0YXNpemUgPSBtZXNzYWdlLmRhdGFzaXplO1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBCbG9iSGVhZGVyIHRvIEpTT04uXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b0pTT05cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5CbG9iSGVhZGVyXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBCbG9iSGVhZGVyLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gQmxvYkhlYWRlcjtcbiAgICB9KSgpO1xuXG4gICAgT1NNUEJGLkhlYWRlckJsb2NrID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgSGVhZGVyQmxvY2suXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkZcbiAgICAgICAgICogQGludGVyZmFjZSBJSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHByb3BlcnR5IHtPU01QQkYuSUhlYWRlckJCb3h8bnVsbH0gW2Jib3hdIEhlYWRlckJsb2NrIGJib3hcbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48c3RyaW5nPnxudWxsfSBbcmVxdWlyZWRGZWF0dXJlc10gSGVhZGVyQmxvY2sgcmVxdWlyZWRGZWF0dXJlc1xuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxzdHJpbmc+fG51bGx9IFtvcHRpb25hbEZlYXR1cmVzXSBIZWFkZXJCbG9jayBvcHRpb25hbEZlYXR1cmVzXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7c3RyaW5nfG51bGx9IFt3cml0aW5ncHJvZ3JhbV0gSGVhZGVyQmxvY2sgd3JpdGluZ3Byb2dyYW1cbiAgICAgICAgICogQHByb3BlcnR5IHtzdHJpbmd8bnVsbH0gW3NvdXJjZV0gSGVhZGVyQmxvY2sgc291cmNlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfExvbmd8bnVsbH0gW29zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcF0gSGVhZGVyQmxvY2sgb3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfExvbmd8bnVsbH0gW29zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyXSBIZWFkZXJCbG9jayBvc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlclxuICAgICAgICAgKiBAcHJvcGVydHkge3N0cmluZ3xudWxsfSBbb3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybF0gSGVhZGVyQmxvY2sgb3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybFxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBIZWFkZXJCbG9jay5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAY2xhc3NkZXNjIFJlcHJlc2VudHMgYSBIZWFkZXJCbG9jay5cbiAgICAgICAgICogQGltcGxlbWVudHMgSUhlYWRlckJsb2NrXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQmxvY2s9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIEhlYWRlckJsb2NrKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMucmVxdWlyZWRGZWF0dXJlcyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5vcHRpb25hbEZlYXR1cmVzID0gW107XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlYWRlckJsb2NrIGJib3guXG4gICAgICAgICAqIEBtZW1iZXIge09TTVBCRi5JSGVhZGVyQkJveHxudWxsfHVuZGVmaW5lZH0gYmJveFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQmxvY2sucHJvdG90eXBlLmJib3ggPSBudWxsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWFkZXJCbG9jayByZXF1aXJlZEZlYXR1cmVzLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48c3RyaW5nPn0gcmVxdWlyZWRGZWF0dXJlc1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQmxvY2sucHJvdG90eXBlLnJlcXVpcmVkRmVhdHVyZXMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWFkZXJCbG9jayBvcHRpb25hbEZlYXR1cmVzLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48c3RyaW5nPn0gb3B0aW9uYWxGZWF0dXJlc1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQmxvY2sucHJvdG90eXBlLm9wdGlvbmFsRmVhdHVyZXMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWFkZXJCbG9jayB3cml0aW5ncHJvZ3JhbS5cbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSB3cml0aW5ncHJvZ3JhbVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQmxvY2sucHJvdG90eXBlLndyaXRpbmdwcm9ncmFtID0gXCJcIjtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGVhZGVyQmxvY2sgc291cmNlLlxuICAgICAgICAgKiBAbWVtYmVyIHtzdHJpbmd9IHNvdXJjZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQmxvY2sucHJvdG90eXBlLnNvdXJjZSA9IFwiXCI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlYWRlckJsb2NrIG9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcC5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IG9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQmxvY2sucHJvdG90eXBlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcCA9ICR1dGlsLkxvbmcgPyAkdXRpbC5Mb25nLmZyb21CaXRzKDAsMCxmYWxzZSkgOiAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWFkZXJCbG9jayBvc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlci5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IG9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay5wcm90b3R5cGUub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIgPSAkdXRpbC5Mb25nID8gJHV0aWwuTG9uZy5mcm9tQml0cygwLDAsZmFsc2UpIDogMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGVhZGVyQmxvY2sgb3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybC5cbiAgICAgICAgICogQG1lbWJlciB7c3RyaW5nfSBvc21vc2lzUmVwbGljYXRpb25CYXNlVXJsXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay5wcm90b3R5cGUub3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybCA9IFwiXCI7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgSGVhZGVyQmxvY2sgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gY3JlYXRlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQmxvY2s9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5IZWFkZXJCbG9ja30gSGVhZGVyQmxvY2sgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJsb2NrLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IEhlYWRlckJsb2NrKHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVhZGVyQmxvY2sgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkhlYWRlckJsb2NrLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQmxvY2t9IG1lc3NhZ2UgSGVhZGVyQmxvY2sgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYmJveCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJiYm94XCIpKVxuICAgICAgICAgICAgICAgICRyb290Lk9TTVBCRi5IZWFkZXJCQm94LmVuY29kZShtZXNzYWdlLmJib3gsIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMiA9Ki8xMCkuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMgIT0gbnVsbCAmJiBtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5yZXF1aXJlZEZlYXR1cmVzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDIgPSovMzQpLnN0cmluZyhtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXNbaV0pO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcyAhPSBudWxsICYmIG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLm9wdGlvbmFsRmVhdHVyZXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgNSwgd2lyZVR5cGUgMiA9Ki80Mikuc3RyaW5nKG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlc1tpXSk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS53cml0aW5ncHJvZ3JhbSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ3cml0aW5ncHJvZ3JhbVwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDE2LCB3aXJlVHlwZSAyID0qLzEzMCkuc3RyaW5nKG1lc3NhZ2Uud3JpdGluZ3Byb2dyYW0pO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uuc291cmNlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInNvdXJjZVwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDE3LCB3aXJlVHlwZSAyID0qLzEzOCkuc3RyaW5nKG1lc3NhZ2Uuc291cmNlKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJvc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXBcIikpXG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAzMiwgd2lyZVR5cGUgMCA9Ki8yNTYpLmludDY0KG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyXCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMzMsIHdpcmVUeXBlIDAgPSovMjY0KS5pbnQ2NChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvbkJhc2VVcmwgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwib3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybFwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDM0LCB3aXJlVHlwZSAyID0qLzI3NCkuc3RyaW5nKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybCk7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVhZGVyQmxvY2sgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkhlYWRlckJsb2NrLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQmxvY2t9IG1lc3NhZ2UgSGVhZGVyQmxvY2sgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIEhlYWRlckJsb2NrIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5IZWFkZXJCbG9ja1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkhlYWRlckJsb2NrfSBIZWFkZXJCbG9ja1xuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJsb2NrLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5IZWFkZXJCbG9jaygpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmJib3ggPSAkcm9vdC5PU01QQkYuSGVhZGVyQkJveC5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UucmVxdWlyZWRGZWF0dXJlcyAmJiBtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVxdWlyZWRGZWF0dXJlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMucHVzaChyZWFkZXIuc3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcyAmJiBtZXNzYWdlLm9wdGlvbmFsRmVhdHVyZXMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm9wdGlvbmFsRmVhdHVyZXMucHVzaChyZWFkZXIuc3RyaW5nKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE2OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLndyaXRpbmdwcm9ncmFtID0gcmVhZGVyLnN0cmluZygpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDE3OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnNvdXJjZSA9IHJlYWRlci5zdHJpbmcoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMjpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgPSByZWFkZXIuaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzMzpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlciA9IHJlYWRlci5pbnQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM0OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvbkJhc2VVcmwgPSByZWFkZXIuc3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBIZWFkZXJCbG9jayBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5IZWFkZXJCbG9ja30gSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSBuZXcgJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmVyaWZpZXMgYSBIZWFkZXJCbG9jayBtZXNzYWdlLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdmVyaWZ5XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJsb2NrLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmJib3ggIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiYmJveFwiKSkge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290Lk9TTVBCRi5IZWFkZXJCQm94LnZlcmlmeShtZXNzYWdlLmJib3gpO1xuICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiYmJveC5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucmVxdWlyZWRGZWF0dXJlcyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJyZXF1aXJlZEZlYXR1cmVzXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UucmVxdWlyZWRGZWF0dXJlcykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJlcXVpcmVkRmVhdHVyZXM6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS5yZXF1aXJlZEZlYXR1cmVzW2ldKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInJlcXVpcmVkRmVhdHVyZXM6IHN0cmluZ1tdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5vcHRpb25hbEZlYXR1cmVzICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIm9wdGlvbmFsRmVhdHVyZXNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5vcHRpb25hbEZlYXR1cmVzKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwib3B0aW9uYWxGZWF0dXJlczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc1N0cmluZyhtZXNzYWdlLm9wdGlvbmFsRmVhdHVyZXNbaV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwib3B0aW9uYWxGZWF0dXJlczogc3RyaW5nW10gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLndyaXRpbmdwcm9ncmFtICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIndyaXRpbmdwcm9ncmFtXCIpKVxuICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNTdHJpbmcobWVzc2FnZS53cml0aW5ncHJvZ3JhbSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIndyaXRpbmdwcm9ncmFtOiBzdHJpbmcgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnNvdXJjZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJzb3VyY2VcIikpXG4gICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc1N0cmluZyhtZXNzYWdlLnNvdXJjZSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInNvdXJjZTogc3RyaW5nIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwib3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wXCIpKVxuICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wKSAmJiAhKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcC5sb3cpICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcC5oaWdoKSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcDogaW50ZWdlcnxMb25nIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlciAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJvc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlclwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyKSAmJiAhKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlci5oaWdoKSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyOiBpbnRlZ2VyfExvbmcgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvbkJhc2VVcmwgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwib3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybFwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzU3RyaW5nKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm9zbW9zaXNSZXBsaWNhdGlvbkJhc2VVcmw6IHN0cmluZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBIZWFkZXJCbG9jayBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBmcm9tT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuSGVhZGVyQmxvY2t9IEhlYWRlckJsb2NrXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5PU01QQkYuSGVhZGVyQmxvY2spXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5IZWFkZXJCbG9jaygpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5iYm94ICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5iYm94ICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLkhlYWRlckJsb2NrLmJib3g6IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmJib3ggPSAkcm9vdC5PU01QQkYuSGVhZGVyQkJveC5mcm9tT2JqZWN0KG9iamVjdC5iYm94KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QucmVxdWlyZWRGZWF0dXJlcykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QucmVxdWlyZWRGZWF0dXJlcykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuSGVhZGVyQmxvY2sucmVxdWlyZWRGZWF0dXJlczogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yZXF1aXJlZEZlYXR1cmVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QucmVxdWlyZWRGZWF0dXJlcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yZXF1aXJlZEZlYXR1cmVzW2ldID0gU3RyaW5nKG9iamVjdC5yZXF1aXJlZEZlYXR1cmVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3Qub3B0aW9uYWxGZWF0dXJlcykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3Qub3B0aW9uYWxGZWF0dXJlcykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuSGVhZGVyQmxvY2sub3B0aW9uYWxGZWF0dXJlczogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5vcHRpb25hbEZlYXR1cmVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3Qub3B0aW9uYWxGZWF0dXJlcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5vcHRpb25hbEZlYXR1cmVzW2ldID0gU3RyaW5nKG9iamVjdC5vcHRpb25hbEZlYXR1cmVzW2ldKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3Qud3JpdGluZ3Byb2dyYW0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICBtZXNzYWdlLndyaXRpbmdwcm9ncmFtID0gU3RyaW5nKG9iamVjdC53cml0aW5ncHJvZ3JhbSk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LnNvdXJjZSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2Uuc291cmNlID0gU3RyaW5nKG9iamVjdC5zb3VyY2UpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcCkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wID0gcGFyc2VJbnQob2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcCwgMTApO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcCA9IG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAubG93ID4+PiAwLCBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpXG4gICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyKSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyID0gcGFyc2VJbnQob2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyLCAxMCk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlciA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlciA9IG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlcjtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyID09PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlci5sb3cgPj4+IDAsIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlci5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25CYXNlVXJsICE9IG51bGwpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25CYXNlVXJsID0gU3RyaW5nKG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25CYXNlVXJsKTtcbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBIZWFkZXJCbG9jayBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b09iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJsb2NrXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSGVhZGVyQmxvY2t9IG1lc3NhZ2UgSGVhZGVyQmxvY2tcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuSUNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCbG9jay50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hcnJheXMgfHwgb3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgIG9iamVjdC5yZXF1aXJlZEZlYXR1cmVzID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0Lm9wdGlvbmFsRmVhdHVyZXMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LmJib3ggPSBudWxsO1xuICAgICAgICAgICAgICAgIG9iamVjdC53cml0aW5ncHJvZ3JhbSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnNvdXJjZSA9IFwiXCI7XG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBuZXcgJHV0aWwuTG9uZygwLCAwLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBsb25nLnRvU3RyaW5nKCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBsb25nLnRvTnVtYmVyKCkgOiBsb25nO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gXCIwXCIgOiAwO1xuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb25nID0gbmV3ICR1dGlsLkxvbmcoMCwgMCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBsb25nLnRvU3RyaW5nKCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBsb25nLnRvTnVtYmVyKCkgOiBsb25nO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBcIjBcIiA6IDA7XG4gICAgICAgICAgICAgICAgb2JqZWN0Lm9zbW9zaXNSZXBsaWNhdGlvbkJhc2VVcmwgPSBcIlwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuYmJveCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJiYm94XCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5iYm94ID0gJHJvb3QuT1NNUEJGLkhlYWRlckJCb3gudG9PYmplY3QobWVzc2FnZS5iYm94LCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMgJiYgbWVzc2FnZS5yZXF1aXJlZEZlYXR1cmVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5yZXF1aXJlZEZlYXR1cmVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLnJlcXVpcmVkRmVhdHVyZXMubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5yZXF1aXJlZEZlYXR1cmVzW2pdID0gbWVzc2FnZS5yZXF1aXJlZEZlYXR1cmVzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcyAmJiBtZXNzYWdlLm9wdGlvbmFsRmVhdHVyZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0Lm9wdGlvbmFsRmVhdHVyZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2Uub3B0aW9uYWxGZWF0dXJlcy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lm9wdGlvbmFsRmVhdHVyZXNbal0gPSBtZXNzYWdlLm9wdGlvbmFsRmVhdHVyZXNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS53cml0aW5ncHJvZ3JhbSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ3cml0aW5ncHJvZ3JhbVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3Qud3JpdGluZ3Byb2dyYW0gPSBtZXNzYWdlLndyaXRpbmdwcm9ncmFtO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uuc291cmNlICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInNvdXJjZVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3Quc291cmNlID0gbWVzc2FnZS5zb3VyY2U7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwib3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wXCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXApIDogbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uVGltZXN0YW1wID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXAubG93ID4+PiAwLCBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblRpbWVzdGFtcC5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25UaW1lc3RhbXA7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlciAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJvc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlclwiKSlcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25TZXF1ZW5jZU51bWJlciA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyKSA6IG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXI7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3Qub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbmV3ICR1dGlsLkxvbmdCaXRzKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uU2VxdWVuY2VOdW1iZXIubG93ID4+PiAwLCBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLm9zbW9zaXNSZXBsaWNhdGlvblNlcXVlbmNlTnVtYmVyO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uub3Ntb3Npc1JlcGxpY2F0aW9uQmFzZVVybCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJvc21vc2lzUmVwbGljYXRpb25CYXNlVXJsXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5vc21vc2lzUmVwbGljYXRpb25CYXNlVXJsID0gbWVzc2FnZS5vc21vc2lzUmVwbGljYXRpb25CYXNlVXJsO1xuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBIZWFkZXJCbG9jayB0byBKU09OLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9KU09OXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQmxvY2tcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJsb2NrLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gSGVhZGVyQmxvY2s7XG4gICAgfSkoKTtcblxuICAgIE9TTVBCRi5IZWFkZXJCQm94ID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgSGVhZGVyQkJveC5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElIZWFkZXJCQm94XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfExvbmd9IGxlZnQgSGVhZGVyQkJveCBsZWZ0XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfExvbmd9IHJpZ2h0IEhlYWRlckJCb3ggcmlnaHRcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8TG9uZ30gdG9wIEhlYWRlckJCb3ggdG9wXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfExvbmd9IGJvdHRvbSBIZWFkZXJCQm94IGJvdHRvbVxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBIZWFkZXJCQm94LlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyBhIEhlYWRlckJCb3guXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElIZWFkZXJCQm94XG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQkJveD19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gSGVhZGVyQkJveChwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlYWRlckJCb3ggbGVmdC5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IGxlZnRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5IZWFkZXJCQm94XG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5wcm90b3R5cGUubGVmdCA9ICR1dGlsLkxvbmcgPyAkdXRpbC5Mb25nLmZyb21CaXRzKDAsMCxmYWxzZSkgOiAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBIZWFkZXJCQm94IHJpZ2h0LlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ8TG9uZ30gcmlnaHRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5IZWFkZXJCQm94XG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5wcm90b3R5cGUucmlnaHQgPSAkdXRpbC5Mb25nID8gJHV0aWwuTG9uZy5mcm9tQml0cygwLDAsZmFsc2UpIDogMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSGVhZGVyQkJveCB0b3AuXG4gICAgICAgICAqIEBtZW1iZXIge251bWJlcnxMb25nfSB0b3BcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5IZWFkZXJCQm94XG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5wcm90b3R5cGUudG9wID0gJHV0aWwuTG9uZyA/ICR1dGlsLkxvbmcuZnJvbUJpdHMoMCwwLGZhbHNlKSA6IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEhlYWRlckJCb3ggYm90dG9tLlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ8TG9uZ30gYm90dG9tXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQkJveFxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJCb3gucHJvdG90eXBlLmJvdHRvbSA9ICR1dGlsLkxvbmcgPyAkdXRpbC5Mb25nLmZyb21CaXRzKDAsMCxmYWxzZSkgOiAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IEhlYWRlckJCb3ggaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gY3JlYXRlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQkJveFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklIZWFkZXJCQm94PX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuSGVhZGVyQkJveH0gSGVhZGVyQkJveCBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBIZWFkZXJCQm94KHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVhZGVyQkJveCBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuSGVhZGVyQkJveC52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJCb3hcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQkJveH0gbWVzc2FnZSBIZWFkZXJCQm94IG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAwID0qLzgpLnNpbnQ2NChtZXNzYWdlLmxlZnQpO1xuICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAyLCB3aXJlVHlwZSAwID0qLzE2KS5zaW50NjQobWVzc2FnZS5yaWdodCk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDMsIHdpcmVUeXBlIDAgPSovMjQpLnNpbnQ2NChtZXNzYWdlLnRvcCk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDAgPSovMzIpLnNpbnQ2NChtZXNzYWdlLmJvdHRvbSk7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgSGVhZGVyQkJveCBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuSGVhZGVyQkJveC52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJCb3hcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSGVhZGVyQkJveH0gbWVzc2FnZSBIZWFkZXJCQm94IG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIEhlYWRlckJCb3ggbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJCb3hcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5IZWFkZXJCQm94fSBIZWFkZXJCQm94XG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgSGVhZGVyQkJveC5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuSGVhZGVyQkJveCgpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxlZnQgPSByZWFkZXIuc2ludDY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yaWdodCA9IHJlYWRlci5zaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnRvcCA9IHJlYWRlci5zaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmJvdHRvbSA9IHJlYWRlci5zaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsZWZ0XCIpKVxuICAgICAgICAgICAgICAgIHRocm93ICR1dGlsLlByb3RvY29sRXJyb3IoXCJtaXNzaW5nIHJlcXVpcmVkICdsZWZ0J1wiLCB7IGluc3RhbmNlOiBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgaWYgKCFtZXNzYWdlLmhhc093blByb3BlcnR5KFwicmlnaHRcIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgJHV0aWwuUHJvdG9jb2xFcnJvcihcIm1pc3NpbmcgcmVxdWlyZWQgJ3JpZ2h0J1wiLCB7IGluc3RhbmNlOiBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgaWYgKCFtZXNzYWdlLmhhc093blByb3BlcnR5KFwidG9wXCIpKVxuICAgICAgICAgICAgICAgIHRocm93ICR1dGlsLlByb3RvY29sRXJyb3IoXCJtaXNzaW5nIHJlcXVpcmVkICd0b3AnXCIsIHsgaW5zdGFuY2U6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJib3R0b21cIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgJHV0aWwuUHJvdG9jb2xFcnJvcihcIm1pc3NpbmcgcmVxdWlyZWQgJ2JvdHRvbSdcIiwgeyBpbnN0YW5jZTogbWVzc2FnZSB9KTtcbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgSGVhZGVyQkJveCBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQkJveFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkhlYWRlckJCb3h9IEhlYWRlckJCb3hcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBIZWFkZXJCQm94LmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9IG5ldyAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWZXJpZmllcyBhIEhlYWRlckJCb3ggbWVzc2FnZS5cbiAgICAgICAgICogQGZ1bmN0aW9uIHZlcmlmeVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJCb3hcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJCb3gudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sZWZ0KSAmJiAhKG1lc3NhZ2UubGVmdCAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sZWZ0LmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UubGVmdC5oaWdoKSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwibGVmdDogaW50ZWdlcnxMb25nIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnJpZ2h0KSAmJiAhKG1lc3NhZ2UucmlnaHQgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UucmlnaHQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5yaWdodC5oaWdoKSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmlnaHQ6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS50b3ApICYmICEobWVzc2FnZS50b3AgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UudG9wLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UudG9wLmhpZ2gpKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0b3A6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5ib3R0b20pICYmICEobWVzc2FnZS5ib3R0b20gJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuYm90dG9tLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuYm90dG9tLmhpZ2gpKSlcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJib3R0b206IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBIZWFkZXJCQm94IG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGZyb21PYmplY3RcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5IZWFkZXJCQm94XG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkhlYWRlckJCb3h9IEhlYWRlckJCb3hcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJCb3guZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QuT1NNUEJGLkhlYWRlckJCb3gpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5IZWFkZXJCQm94KCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmxlZnQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UubGVmdCA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC5sZWZ0KSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxlZnQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGVmdCA9IHBhcnNlSW50KG9iamVjdC5sZWZ0LCAxMCk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5sZWZ0ID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxlZnQgPSBvYmplY3QubGVmdDtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxlZnQgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGVmdCA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QubGVmdC5sb3cgPj4+IDAsIG9iamVjdC5sZWZ0LmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LnJpZ2h0ICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpXG4gICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLnJpZ2h0ID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0LnJpZ2h0KSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LnJpZ2h0ID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJpZ2h0ID0gcGFyc2VJbnQob2JqZWN0LnJpZ2h0LCAxMCk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5yaWdodCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yaWdodCA9IG9iamVjdC5yaWdodDtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LnJpZ2h0ID09PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJpZ2h0ID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5yaWdodC5sb3cgPj4+IDAsIG9iamVjdC5yaWdodC5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC50b3AgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UudG9wID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0LnRvcCkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC50b3AgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudG9wID0gcGFyc2VJbnQob2JqZWN0LnRvcCwgMTApO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QudG9wID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnRvcCA9IG9iamVjdC50b3A7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC50b3AgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudG9wID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC50b3AubG93ID4+PiAwLCBvYmplY3QudG9wLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmJvdHRvbSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKVxuICAgICAgICAgICAgICAgICAgICAobWVzc2FnZS5ib3R0b20gPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QuYm90dG9tKSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmJvdHRvbSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ib3R0b20gPSBwYXJzZUludChvYmplY3QuYm90dG9tLCAxMCk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5ib3R0b20gPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuYm90dG9tID0gb2JqZWN0LmJvdHRvbTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmJvdHRvbSA9PT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ib3R0b20gPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LmJvdHRvbS5sb3cgPj4+IDAsIG9iamVjdC5ib3R0b20uaGlnaCA+Pj4gMCkudG9OdW1iZXIoKTtcbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBIZWFkZXJCQm94IG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSGVhZGVyQkJveFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLkhlYWRlckJCb3h9IG1lc3NhZ2UgSGVhZGVyQkJveFxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5JQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJCb3gudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IG5ldyAkdXRpbC5Mb25nKDAsIDAsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmxlZnQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBsb25nLnRvU3RyaW5nKCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBsb25nLnRvTnVtYmVyKCkgOiBsb25nO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QubGVmdCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IG5ldyAkdXRpbC5Mb25nKDAsIDAsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnJpZ2h0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gbG9uZy50b1N0cmluZygpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbG9uZy50b051bWJlcigpIDogbG9uZztcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnJpZ2h0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gXCIwXCIgOiAwO1xuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb25nID0gbmV3ICR1dGlsLkxvbmcoMCwgMCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QudG9wID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gbG9uZy50b1N0cmluZygpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbG9uZy50b051bWJlcigpIDogbG9uZztcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnRvcCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IG5ldyAkdXRpbC5Mb25nKDAsIDAsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmJvdHRvbSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IGxvbmcudG9TdHJpbmcoKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IGxvbmcudG9OdW1iZXIoKSA6IGxvbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5ib3R0b20gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBcIjBcIiA6IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sZWZ0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImxlZnRcIikpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxlZnQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sZWZ0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gU3RyaW5nKG1lc3NhZ2UubGVmdCkgOiBtZXNzYWdlLmxlZnQ7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QubGVmdCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/ICR1dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobWVzc2FnZS5sZWZ0KSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxlZnQubG93ID4+PiAwLCBtZXNzYWdlLmxlZnQuaGlnaCA+Pj4gMCkudG9OdW1iZXIoKSA6IG1lc3NhZ2UubGVmdDtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJpZ2h0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInJpZ2h0XCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5yaWdodCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnJpZ2h0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gU3RyaW5nKG1lc3NhZ2UucmlnaHQpIDogbWVzc2FnZS5yaWdodDtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5yaWdodCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/ICR1dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobWVzc2FnZS5yaWdodCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS5yaWdodC5sb3cgPj4+IDAsIG1lc3NhZ2UucmlnaHQuaGlnaCA+Pj4gMCkudG9OdW1iZXIoKSA6IG1lc3NhZ2UucmlnaHQ7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS50b3AgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidG9wXCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS50b3AgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC50b3AgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS50b3ApIDogbWVzc2FnZS50b3A7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudG9wID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLnRvcCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS50b3AubG93ID4+PiAwLCBtZXNzYWdlLnRvcC5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS50b3A7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5ib3R0b20gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiYm90dG9tXCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5ib3R0b20gPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5ib3R0b20gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5ib3R0b20pIDogbWVzc2FnZS5ib3R0b207XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuYm90dG9tID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLmJvdHRvbSkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS5ib3R0b20ubG93ID4+PiAwLCBtZXNzYWdlLmJvdHRvbS5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS5ib3R0b207XG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIEhlYWRlckJCb3ggdG8gSlNPTi5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvSlNPTlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkhlYWRlckJCb3hcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIEhlYWRlckJCb3gucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBIZWFkZXJCQm94O1xuICAgIH0pKCk7XG5cbiAgICBPU01QQkYuUHJpbWl0aXZlQmxvY2sgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQcmltaXRpdmVCbG9jay5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElQcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAcHJvcGVydHkge09TTVBCRi5JU3RyaW5nVGFibGV9IHN0cmluZ3RhYmxlIFByaW1pdGl2ZUJsb2NrIHN0cmluZ3RhYmxlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPE9TTVBCRi5JUHJpbWl0aXZlR3JvdXA+fG51bGx9IFtwcmltaXRpdmVncm91cF0gUHJpbWl0aXZlQmxvY2sgcHJpbWl0aXZlZ3JvdXBcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8bnVsbH0gW2dyYW51bGFyaXR5XSBQcmltaXRpdmVCbG9jayBncmFudWxhcml0eVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcnxMb25nfG51bGx9IFtsYXRPZmZzZXRdIFByaW1pdGl2ZUJsb2NrIGxhdE9mZnNldFxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcnxMb25nfG51bGx9IFtsb25PZmZzZXRdIFByaW1pdGl2ZUJsb2NrIGxvbk9mZnNldFxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcnxudWxsfSBbZGF0ZUdyYW51bGFyaXR5XSBQcmltaXRpdmVCbG9jayBkYXRlR3JhbnVsYXJpdHlcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUHJpbWl0aXZlQmxvY2suXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkZcbiAgICAgICAgICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIGEgUHJpbWl0aXZlQmxvY2suXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElQcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVByaW1pdGl2ZUJsb2NrPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBQcmltaXRpdmVCbG9jayhwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICB0aGlzLnByaW1pdGl2ZWdyb3VwID0gW107XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByaW1pdGl2ZUJsb2NrIHN0cmluZ3RhYmxlLlxuICAgICAgICAgKiBAbWVtYmVyIHtPU01QQkYuSVN0cmluZ1RhYmxlfSBzdHJpbmd0YWJsZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlQmxvY2sucHJvdG90eXBlLnN0cmluZ3RhYmxlID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJpbWl0aXZlQmxvY2sgcHJpbWl0aXZlZ3JvdXAuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxPU01QQkYuSVByaW1pdGl2ZUdyb3VwPn0gcHJpbWl0aXZlZ3JvdXBcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUJsb2NrLnByb3RvdHlwZS5wcmltaXRpdmVncm91cCA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByaW1pdGl2ZUJsb2NrIGdyYW51bGFyaXR5LlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ9IGdyYW51bGFyaXR5XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlQmxvY2tcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVCbG9jay5wcm90b3R5cGUuZ3JhbnVsYXJpdHkgPSAxMDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByaW1pdGl2ZUJsb2NrIGxhdE9mZnNldC5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IGxhdE9mZnNldFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlQmxvY2sucHJvdG90eXBlLmxhdE9mZnNldCA9ICR1dGlsLkxvbmcgPyAkdXRpbC5Mb25nLmZyb21CaXRzKDAsMCxmYWxzZSkgOiAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcmltaXRpdmVCbG9jayBsb25PZmZzZXQuXG4gICAgICAgICAqIEBtZW1iZXIge251bWJlcnxMb25nfSBsb25PZmZzZXRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUJsb2NrLnByb3RvdHlwZS5sb25PZmZzZXQgPSAkdXRpbC5Mb25nID8gJHV0aWwuTG9uZy5mcm9tQml0cygwLDAsZmFsc2UpIDogMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJpbWl0aXZlQmxvY2sgZGF0ZUdyYW51bGFyaXR5LlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ9IGRhdGVHcmFudWxhcml0eVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlQmxvY2sucHJvdG90eXBlLmRhdGVHcmFudWxhcml0eSA9IDEwMDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgUHJpbWl0aXZlQmxvY2sgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gY3JlYXRlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JUHJpbWl0aXZlQmxvY2s9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5QcmltaXRpdmVCbG9ja30gUHJpbWl0aXZlQmxvY2sgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUJsb2NrLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IFByaW1pdGl2ZUJsb2NrKHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUHJpbWl0aXZlQmxvY2sgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLlByaW1pdGl2ZUJsb2NrLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JUHJpbWl0aXZlQmxvY2t9IG1lc3NhZ2UgUHJpbWl0aXZlQmxvY2sgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVCbG9jay5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgJHJvb3QuT1NNUEJGLlN0cmluZ1RhYmxlLmVuY29kZShtZXNzYWdlLnN0cmluZ3RhYmxlLCB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDIgPSovMTApLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5wcmltaXRpdmVncm91cCAhPSBudWxsICYmIG1lc3NhZ2UucHJpbWl0aXZlZ3JvdXAubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5wcmltaXRpdmVncm91cC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgJHJvb3QuT1NNUEJGLlByaW1pdGl2ZUdyb3VwLmVuY29kZShtZXNzYWdlLnByaW1pdGl2ZWdyb3VwW2ldLCB3cml0ZXIudWludDMyKC8qIGlkIDIsIHdpcmVUeXBlIDIgPSovMTgpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5ncmFudWxhcml0eSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJncmFudWxhcml0eVwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDE3LCB3aXJlVHlwZSAwID0qLzEzNikuaW50MzIobWVzc2FnZS5ncmFudWxhcml0eSk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5kYXRlR3JhbnVsYXJpdHkgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiZGF0ZUdyYW51bGFyaXR5XCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMTgsIHdpcmVUeXBlIDAgPSovMTQ0KS5pbnQzMihtZXNzYWdlLmRhdGVHcmFudWxhcml0eSk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sYXRPZmZzZXQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwibGF0T2Zmc2V0XCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMTksIHdpcmVUeXBlIDAgPSovMTUyKS5pbnQ2NChtZXNzYWdlLmxhdE9mZnNldCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sb25PZmZzZXQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwibG9uT2Zmc2V0XCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMjAsIHdpcmVUeXBlIDAgPSovMTYwKS5pbnQ2NChtZXNzYWdlLmxvbk9mZnNldCk7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUHJpbWl0aXZlQmxvY2sgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLlByaW1pdGl2ZUJsb2NrLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JUHJpbWl0aXZlQmxvY2t9IG1lc3NhZ2UgUHJpbWl0aXZlQmxvY2sgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVCbG9jay5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFByaW1pdGl2ZUJsb2NrIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlByaW1pdGl2ZUJsb2NrfSBQcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUJsb2NrLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5QcmltaXRpdmVCbG9jaygpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnN0cmluZ3RhYmxlID0gJHJvb3QuT1NNUEJGLlN0cmluZ1RhYmxlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5wcmltaXRpdmVncm91cCAmJiBtZXNzYWdlLnByaW1pdGl2ZWdyb3VwLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnByaW1pdGl2ZWdyb3VwID0gW107XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucHJpbWl0aXZlZ3JvdXAucHVzaCgkcm9vdC5PU01QQkYuUHJpbWl0aXZlR3JvdXAuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTc6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuZ3JhbnVsYXJpdHkgPSByZWFkZXIuaW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxOTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXRPZmZzZXQgPSByZWFkZXIuaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyMDpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sb25PZmZzZXQgPSByZWFkZXIuaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxODpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5kYXRlR3JhbnVsYXJpdHkgPSByZWFkZXIuaW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJzdHJpbmd0YWJsZVwiKSlcbiAgICAgICAgICAgICAgICB0aHJvdyAkdXRpbC5Qcm90b2NvbEVycm9yKFwibWlzc2luZyByZXF1aXJlZCAnc3RyaW5ndGFibGUnXCIsIHsgaW5zdGFuY2U6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFByaW1pdGl2ZUJsb2NrIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlByaW1pdGl2ZUJsb2NrfSBQcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUJsb2NrLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9IG5ldyAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWZXJpZmllcyBhIFByaW1pdGl2ZUJsb2NrIG1lc3NhZ2UuXG4gICAgICAgICAqIEBmdW5jdGlvbiB2ZXJpZnlcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlQmxvY2sudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9ICRyb290Lk9TTVBCRi5TdHJpbmdUYWJsZS52ZXJpZnkobWVzc2FnZS5zdHJpbmd0YWJsZSk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJzdHJpbmd0YWJsZS5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucHJpbWl0aXZlZ3JvdXAgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwicHJpbWl0aXZlZ3JvdXBcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5wcmltaXRpdmVncm91cCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInByaW1pdGl2ZWdyb3VwOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5wcmltaXRpdmVncm91cC5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5PU01QQkYuUHJpbWl0aXZlR3JvdXAudmVyaWZ5KG1lc3NhZ2UucHJpbWl0aXZlZ3JvdXBbaV0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJwcmltaXRpdmVncm91cC5cIiArIGVycm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmdyYW51bGFyaXR5ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImdyYW51bGFyaXR5XCIpKVxuICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuZ3JhbnVsYXJpdHkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJncmFudWxhcml0eTogaW50ZWdlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UubGF0T2Zmc2V0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImxhdE9mZnNldFwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmxhdE9mZnNldCkgJiYgIShtZXNzYWdlLmxhdE9mZnNldCAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sYXRPZmZzZXQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sYXRPZmZzZXQuaGlnaCkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJsYXRPZmZzZXQ6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UubG9uT2Zmc2V0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImxvbk9mZnNldFwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmxvbk9mZnNldCkgJiYgIShtZXNzYWdlLmxvbk9mZnNldCAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sb25PZmZzZXQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sb25PZmZzZXQuaGlnaCkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJsb25PZmZzZXQ6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZGF0ZUdyYW51bGFyaXR5ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImRhdGVHcmFudWxhcml0eVwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmRhdGVHcmFudWxhcml0eSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcImRhdGVHcmFudWxhcml0eTogaW50ZWdlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBQcmltaXRpdmVCbG9jayBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBmcm9tT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuUHJpbWl0aXZlQmxvY2t9IFByaW1pdGl2ZUJsb2NrXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVCbG9jay5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5PU01QQkYuUHJpbWl0aXZlQmxvY2spXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5QcmltaXRpdmVCbG9jaygpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5zdHJpbmd0YWJsZSAhPSBudWxsKSB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3Quc3RyaW5ndGFibGUgIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuUHJpbWl0aXZlQmxvY2suc3RyaW5ndGFibGU6IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnN0cmluZ3RhYmxlID0gJHJvb3QuT1NNUEJGLlN0cmluZ1RhYmxlLmZyb21PYmplY3Qob2JqZWN0LnN0cmluZ3RhYmxlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QucHJpbWl0aXZlZ3JvdXApIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LnByaW1pdGl2ZWdyb3VwKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5QcmltaXRpdmVCbG9jay5wcmltaXRpdmVncm91cDogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5wcmltaXRpdmVncm91cCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnByaW1pdGl2ZWdyb3VwLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LnByaW1pdGl2ZWdyb3VwW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5QcmltaXRpdmVCbG9jay5wcmltaXRpdmVncm91cDogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnByaW1pdGl2ZWdyb3VwW2ldID0gJHJvb3QuT1NNUEJGLlByaW1pdGl2ZUdyb3VwLmZyb21PYmplY3Qob2JqZWN0LnByaW1pdGl2ZWdyb3VwW2ldKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LmdyYW51bGFyaXR5ICE9IG51bGwpXG4gICAgICAgICAgICAgICAgbWVzc2FnZS5ncmFudWxhcml0eSA9IG9iamVjdC5ncmFudWxhcml0eSB8IDA7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmxhdE9mZnNldCAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKVxuICAgICAgICAgICAgICAgICAgICAobWVzc2FnZS5sYXRPZmZzZXQgPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QubGF0T2Zmc2V0KSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxhdE9mZnNldCA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXRPZmZzZXQgPSBwYXJzZUludChvYmplY3QubGF0T2Zmc2V0LCAxMCk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5sYXRPZmZzZXQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGF0T2Zmc2V0ID0gb2JqZWN0LmxhdE9mZnNldDtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxhdE9mZnNldCA9PT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXRPZmZzZXQgPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LmxhdE9mZnNldC5sb3cgPj4+IDAsIG9iamVjdC5sYXRPZmZzZXQuaGlnaCA+Pj4gMCkudG9OdW1iZXIoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QubG9uT2Zmc2V0ICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpXG4gICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLmxvbk9mZnNldCA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC5sb25PZmZzZXQpKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QubG9uT2Zmc2V0ID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxvbk9mZnNldCA9IHBhcnNlSW50KG9iamVjdC5sb25PZmZzZXQsIDEwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0Lmxvbk9mZnNldCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sb25PZmZzZXQgPSBvYmplY3QubG9uT2Zmc2V0O1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QubG9uT2Zmc2V0ID09PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxvbk9mZnNldCA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QubG9uT2Zmc2V0LmxvdyA+Pj4gMCwgb2JqZWN0Lmxvbk9mZnNldC5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5kYXRlR3JhbnVsYXJpdHkgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmRhdGVHcmFudWxhcml0eSA9IG9iamVjdC5kYXRlR3JhbnVsYXJpdHkgfCAwO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFByaW1pdGl2ZUJsb2NrIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlQmxvY2tcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5QcmltaXRpdmVCbG9ja30gbWVzc2FnZSBQcmltaXRpdmVCbG9ja1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5JQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUJsb2NrLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFycmF5cyB8fCBvcHRpb25zLmRlZmF1bHRzKVxuICAgICAgICAgICAgICAgIG9iamVjdC5wcmltaXRpdmVncm91cCA9IFtdO1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBvYmplY3Quc3RyaW5ndGFibGUgPSBudWxsO1xuICAgICAgICAgICAgICAgIG9iamVjdC5ncmFudWxhcml0eSA9IDEwMDtcbiAgICAgICAgICAgICAgICBvYmplY3QuZGF0ZUdyYW51bGFyaXR5ID0gMTAwMDtcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IG5ldyAkdXRpbC5Mb25nKDAsIDAsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmxhdE9mZnNldCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IGxvbmcudG9TdHJpbmcoKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IGxvbmcudG9OdW1iZXIoKSA6IGxvbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sYXRPZmZzZXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBcIjBcIiA6IDA7XG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBuZXcgJHV0aWwuTG9uZygwLCAwLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sb25PZmZzZXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBsb25nLnRvU3RyaW5nKCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBsb25nLnRvTnVtYmVyKCkgOiBsb25nO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QubG9uT2Zmc2V0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gXCIwXCIgOiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uuc3RyaW5ndGFibGUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwic3RyaW5ndGFibGVcIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LnN0cmluZ3RhYmxlID0gJHJvb3QuT1NNUEJGLlN0cmluZ1RhYmxlLnRvT2JqZWN0KG1lc3NhZ2Uuc3RyaW5ndGFibGUsIG9wdGlvbnMpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucHJpbWl0aXZlZ3JvdXAgJiYgbWVzc2FnZS5wcmltaXRpdmVncm91cC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QucHJpbWl0aXZlZ3JvdXAgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UucHJpbWl0aXZlZ3JvdXAubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5wcmltaXRpdmVncm91cFtqXSA9ICRyb290Lk9TTVBCRi5QcmltaXRpdmVHcm91cC50b09iamVjdChtZXNzYWdlLnByaW1pdGl2ZWdyb3VwW2pdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmdyYW51bGFyaXR5ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImdyYW51bGFyaXR5XCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5ncmFudWxhcml0eSA9IG1lc3NhZ2UuZ3JhbnVsYXJpdHk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5kYXRlR3JhbnVsYXJpdHkgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiZGF0ZUdyYW51bGFyaXR5XCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5kYXRlR3JhbnVsYXJpdHkgPSBtZXNzYWdlLmRhdGVHcmFudWxhcml0eTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxhdE9mZnNldCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsYXRPZmZzZXRcIikpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxhdE9mZnNldCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmxhdE9mZnNldCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmxhdE9mZnNldCkgOiBtZXNzYWdlLmxhdE9mZnNldDtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sYXRPZmZzZXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubGF0T2Zmc2V0KSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxhdE9mZnNldC5sb3cgPj4+IDAsIG1lc3NhZ2UubGF0T2Zmc2V0LmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmxhdE9mZnNldDtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxvbk9mZnNldCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsb25PZmZzZXRcIikpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxvbk9mZnNldCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lmxvbk9mZnNldCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmxvbk9mZnNldCkgOiBtZXNzYWdlLmxvbk9mZnNldDtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sb25PZmZzZXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubG9uT2Zmc2V0KSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxvbk9mZnNldC5sb3cgPj4+IDAsIG1lc3NhZ2UubG9uT2Zmc2V0LmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmxvbk9mZnNldDtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIHRoaXMgUHJpbWl0aXZlQmxvY2sgdG8gSlNPTi5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvSlNPTlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUJsb2NrXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVCbG9jay5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIFByaW1pdGl2ZUJsb2NrO1xuICAgIH0pKCk7XG5cbiAgICBPU01QQkYuUHJpbWl0aXZlR3JvdXAgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBQcmltaXRpdmVHcm91cC5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElQcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxPU01QQkYuSU5vZGU+fG51bGx9IFtub2Rlc10gUHJpbWl0aXZlR3JvdXAgbm9kZXNcbiAgICAgICAgICogQHByb3BlcnR5IHtPU01QQkYuSURlbnNlTm9kZXN8bnVsbH0gW2RlbnNlXSBQcmltaXRpdmVHcm91cCBkZW5zZVxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxPU01QQkYuSVdheT58bnVsbH0gW3dheXNdIFByaW1pdGl2ZUdyb3VwIHdheXNcbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48T1NNUEJGLklSZWxhdGlvbj58bnVsbH0gW3JlbGF0aW9uc10gUHJpbWl0aXZlR3JvdXAgcmVsYXRpb25zXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPE9TTVBCRi5JQ2hhbmdlU2V0PnxudWxsfSBbY2hhbmdlc2V0c10gUHJpbWl0aXZlR3JvdXAgY2hhbmdlc2V0c1xuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBQcmltaXRpdmVHcm91cC5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAY2xhc3NkZXNjIFJlcHJlc2VudHMgYSBQcmltaXRpdmVHcm91cC5cbiAgICAgICAgICogQGltcGxlbWVudHMgSVByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JUHJpbWl0aXZlR3JvdXA9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIFByaW1pdGl2ZUdyb3VwKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMubm9kZXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMud2F5cyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5yZWxhdGlvbnMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMuY2hhbmdlc2V0cyA9IFtdO1xuICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcmltaXRpdmVHcm91cCBub2Rlcy5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPE9TTVBCRi5JTm9kZT59IG5vZGVzXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlR3JvdXBcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVHcm91cC5wcm90b3R5cGUubm9kZXMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcmltaXRpdmVHcm91cCBkZW5zZS5cbiAgICAgICAgICogQG1lbWJlciB7T1NNUEJGLklEZW5zZU5vZGVzfG51bGx8dW5kZWZpbmVkfSBkZW5zZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlR3JvdXAucHJvdG90eXBlLmRlbnNlID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJpbWl0aXZlR3JvdXAgd2F5cy5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPE9TTVBCRi5JV2F5Pn0gd2F5c1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlR3JvdXAucHJvdG90eXBlLndheXMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcmltaXRpdmVHcm91cCByZWxhdGlvbnMuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxPU01QQkYuSVJlbGF0aW9uPn0gcmVsYXRpb25zXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlR3JvdXBcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVHcm91cC5wcm90b3R5cGUucmVsYXRpb25zID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJpbWl0aXZlR3JvdXAgY2hhbmdlc2V0cy5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPE9TTVBCRi5JQ2hhbmdlU2V0Pn0gY2hhbmdlc2V0c1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlR3JvdXAucHJvdG90eXBlLmNoYW5nZXNldHMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IFByaW1pdGl2ZUdyb3VwIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGNyZWF0ZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVByaW1pdGl2ZUdyb3VwPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuUHJpbWl0aXZlR3JvdXB9IFByaW1pdGl2ZUdyb3VwIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVHcm91cC5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBQcmltaXRpdmVHcm91cChwcm9wZXJ0aWVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFByaW1pdGl2ZUdyb3VwIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIE9TTVBCRi5QcmltaXRpdmVHcm91cC52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVByaW1pdGl2ZUdyb3VwfSBtZXNzYWdlIFByaW1pdGl2ZUdyb3VwIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlR3JvdXAuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLm5vZGVzICE9IG51bGwgJiYgbWVzc2FnZS5ub2Rlcy5sZW5ndGgpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLm5vZGVzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAkcm9vdC5PU01QQkYuTm9kZS5lbmNvZGUobWVzc2FnZS5ub2Rlc1tpXSwgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAyID0qLzEwKS5mb3JrKCkpLmxkZWxpbSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZGVuc2UgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiZGVuc2VcIikpXG4gICAgICAgICAgICAgICAgJHJvb3QuT1NNUEJGLkRlbnNlTm9kZXMuZW5jb2RlKG1lc3NhZ2UuZGVuc2UsIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgMiA9Ki8xOCkuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLndheXMgIT0gbnVsbCAmJiBtZXNzYWdlLndheXMubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS53YXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAkcm9vdC5PU01QQkYuV2F5LmVuY29kZShtZXNzYWdlLndheXNbaV0sIHdyaXRlci51aW50MzIoLyogaWQgMywgd2lyZVR5cGUgMiA9Ki8yNikuZm9yaygpKS5sZGVsaW0oKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJlbGF0aW9ucyAhPSBudWxsICYmIG1lc3NhZ2UucmVsYXRpb25zLmxlbmd0aClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UucmVsYXRpb25zLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICAkcm9vdC5PU01QQkYuUmVsYXRpb24uZW5jb2RlKG1lc3NhZ2UucmVsYXRpb25zW2ldLCB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDIgPSovMzQpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jaGFuZ2VzZXRzICE9IG51bGwgJiYgbWVzc2FnZS5jaGFuZ2VzZXRzLmxlbmd0aClcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UuY2hhbmdlc2V0cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgJHJvb3QuT1NNUEJGLkNoYW5nZVNldC5lbmNvZGUobWVzc2FnZS5jaGFuZ2VzZXRzW2ldLCB3cml0ZXIudWludDMyKC8qIGlkIDUsIHdpcmVUeXBlIDIgPSovNDIpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUHJpbWl0aXZlR3JvdXAgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLlByaW1pdGl2ZUdyb3VwLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlR3JvdXBcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JUHJpbWl0aXZlR3JvdXB9IG1lc3NhZ2UgUHJpbWl0aXZlR3JvdXAgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBQcmltaXRpdmVHcm91cC5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFByaW1pdGl2ZUdyb3VwIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlByaW1pdGl2ZUdyb3VwfSBQcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUdyb3VwLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5QcmltaXRpdmVHcm91cCgpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLm5vZGVzICYmIG1lc3NhZ2Uubm9kZXMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uubm9kZXMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5ub2Rlcy5wdXNoKCRyb290Lk9TTVBCRi5Ob2RlLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuZGVuc2UgPSAkcm9vdC5PU01QQkYuRGVuc2VOb2Rlcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2Uud2F5cyAmJiBtZXNzYWdlLndheXMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uud2F5cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLndheXMucHVzaCgkcm9vdC5PU01QQkYuV2F5LmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UucmVsYXRpb25zICYmIG1lc3NhZ2UucmVsYXRpb25zLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJlbGF0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJlbGF0aW9ucy5wdXNoKCRyb290Lk9TTVBCRi5SZWxhdGlvbi5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLmNoYW5nZXNldHMgJiYgbWVzc2FnZS5jaGFuZ2VzZXRzLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNoYW5nZXNldHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXRzLnB1c2goJHJvb3QuT1NNUEJGLkNoYW5nZVNldC5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFByaW1pdGl2ZUdyb3VwIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlByaW1pdGl2ZUdyb3VwfSBQcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUdyb3VwLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9IG5ldyAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWZXJpZmllcyBhIFByaW1pdGl2ZUdyb3VwIG1lc3NhZ2UuXG4gICAgICAgICAqIEBmdW5jdGlvbiB2ZXJpZnlcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5QcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlR3JvdXAudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uubm9kZXMgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwibm9kZXNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5ub2RlcykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm5vZGVzOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5ub2Rlcy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5PU01QQkYuTm9kZS52ZXJpZnkobWVzc2FnZS5ub2Rlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvcilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm5vZGVzLlwiICsgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuZGVuc2UgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiZGVuc2VcIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5PU01QQkYuRGVuc2VOb2Rlcy52ZXJpZnkobWVzc2FnZS5kZW5zZSk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJkZW5zZS5cIiArIGVycm9yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uud2F5cyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ3YXlzXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2Uud2F5cykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIndheXM6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLndheXMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3QuT1NNUEJGLldheS52ZXJpZnkobWVzc2FnZS53YXlzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwid2F5cy5cIiArIGVycm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJlbGF0aW9ucyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJyZWxhdGlvbnNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5yZWxhdGlvbnMpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyZWxhdGlvbnM6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLnJlbGF0aW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5PU01QQkYuUmVsYXRpb24udmVyaWZ5KG1lc3NhZ2UucmVsYXRpb25zW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicmVsYXRpb25zLlwiICsgZXJyb3I7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY2hhbmdlc2V0cyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJjaGFuZ2VzZXRzXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UuY2hhbmdlc2V0cykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcImNoYW5nZXNldHM6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLmNoYW5nZXNldHMubGVuZ3RoOyArK2kpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3QuT1NNUEJGLkNoYW5nZVNldC52ZXJpZnkobWVzc2FnZS5jaGFuZ2VzZXRzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiY2hhbmdlc2V0cy5cIiArIGVycm9yO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgUHJpbWl0aXZlR3JvdXAgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlByaW1pdGl2ZUdyb3VwXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlByaW1pdGl2ZUdyb3VwfSBQcmltaXRpdmVHcm91cFxuICAgICAgICAgKi9cbiAgICAgICAgUHJpbWl0aXZlR3JvdXAuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QuT1NNUEJGLlByaW1pdGl2ZUdyb3VwKVxuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuUHJpbWl0aXZlR3JvdXAoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3Qubm9kZXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0Lm5vZGVzKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5QcmltaXRpdmVHcm91cC5ub2RlczogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5ub2RlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0Lm5vZGVzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0Lm5vZGVzW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5QcmltaXRpdmVHcm91cC5ub2Rlczogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm5vZGVzW2ldID0gJHJvb3QuT1NNUEJGLk5vZGUuZnJvbU9iamVjdChvYmplY3Qubm9kZXNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QuZGVuc2UgIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LmRlbnNlICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLlByaW1pdGl2ZUdyb3VwLmRlbnNlOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5kZW5zZSA9ICRyb290Lk9TTVBCRi5EZW5zZU5vZGVzLmZyb21PYmplY3Qob2JqZWN0LmRlbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3Qud2F5cykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3Qud2F5cykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuUHJpbWl0aXZlR3JvdXAud2F5czogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS53YXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3Qud2F5cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC53YXlzW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5QcmltaXRpdmVHcm91cC53YXlzOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uud2F5c1tpXSA9ICRyb290Lk9TTVBCRi5XYXkuZnJvbU9iamVjdChvYmplY3Qud2F5c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5yZWxhdGlvbnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LnJlbGF0aW9ucykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuUHJpbWl0aXZlR3JvdXAucmVsYXRpb25zOiBhcnJheSBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnJlbGF0aW9ucyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnJlbGF0aW9ucy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5yZWxhdGlvbnNbaV0gIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLlByaW1pdGl2ZUdyb3VwLnJlbGF0aW9uczogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJlbGF0aW9uc1tpXSA9ICRyb290Lk9TTVBCRi5SZWxhdGlvbi5mcm9tT2JqZWN0KG9iamVjdC5yZWxhdGlvbnNbaV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QuY2hhbmdlc2V0cykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QuY2hhbmdlc2V0cykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuUHJpbWl0aXZlR3JvdXAuY2hhbmdlc2V0czogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXRzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QuY2hhbmdlc2V0cy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5jaGFuZ2VzZXRzW2ldICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5QcmltaXRpdmVHcm91cC5jaGFuZ2VzZXRzOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY2hhbmdlc2V0c1tpXSA9ICRyb290Lk9TTVBCRi5DaGFuZ2VTZXQuZnJvbU9iamVjdChvYmplY3QuY2hhbmdlc2V0c1tpXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFByaW1pdGl2ZUdyb3VwIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlR3JvdXBcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5QcmltaXRpdmVHcm91cH0gbWVzc2FnZSBQcmltaXRpdmVHcm91cFxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5JQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUdyb3VwLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFycmF5cyB8fCBvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0Lm5vZGVzID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LndheXMgPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QucmVsYXRpb25zID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LmNoYW5nZXNldHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKVxuICAgICAgICAgICAgICAgIG9iamVjdC5kZW5zZSA9IG51bGw7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5ub2RlcyAmJiBtZXNzYWdlLm5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5ub2RlcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5ub2Rlcy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0Lm5vZGVzW2pdID0gJHJvb3QuT1NNUEJGLk5vZGUudG9PYmplY3QobWVzc2FnZS5ub2Rlc1tqXSwgb3B0aW9ucyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5kZW5zZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJkZW5zZVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuZGVuc2UgPSAkcm9vdC5PU01QQkYuRGVuc2VOb2Rlcy50b09iamVjdChtZXNzYWdlLmRlbnNlLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLndheXMgJiYgbWVzc2FnZS53YXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC53YXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLndheXMubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC53YXlzW2pdID0gJHJvb3QuT1NNUEJGLldheS50b09iamVjdChtZXNzYWdlLndheXNbal0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucmVsYXRpb25zICYmIG1lc3NhZ2UucmVsYXRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5yZWxhdGlvbnMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UucmVsYXRpb25zLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QucmVsYXRpb25zW2pdID0gJHJvb3QuT1NNUEJGLlJlbGF0aW9uLnRvT2JqZWN0KG1lc3NhZ2UucmVsYXRpb25zW2pdLCBvcHRpb25zKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmNoYW5nZXNldHMgJiYgbWVzc2FnZS5jaGFuZ2VzZXRzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5jaGFuZ2VzZXRzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLmNoYW5nZXNldHMubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5jaGFuZ2VzZXRzW2pdID0gJHJvb3QuT1NNUEJGLkNoYW5nZVNldC50b09iamVjdChtZXNzYWdlLmNoYW5nZXNldHNbal0sIG9wdGlvbnMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBQcmltaXRpdmVHcm91cCB0byBKU09OLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9KU09OXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUHJpbWl0aXZlR3JvdXBcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIFByaW1pdGl2ZUdyb3VwLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gUHJpbWl0aXZlR3JvdXA7XG4gICAgfSkoKTtcblxuICAgIE9TTVBCRi5TdHJpbmdUYWJsZSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFN0cmluZ1RhYmxlLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBpbnRlcmZhY2UgSVN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPFVpbnQ4QXJyYXk+fG51bGx9IFtzXSBTdHJpbmdUYWJsZSBzXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFN0cmluZ1RhYmxlLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgU3RyaW5nIHRhYmxlLCBjb250YWlucyB0aGUgY29tbW9uIHN0cmluZ3MgaW4gZWFjaCBibG9jay5cbiAgICAgICAgICogXG4gICAgICAgICAqIE5vdGUgdGhhdCB3ZSByZXNlcnZlIGluZGV4ICcwJyBhcyBhIGRlbGltaXRlciwgc28gdGhlIGVudHJ5IGF0IHRoYXRcbiAgICAgICAgICogaW5kZXggaW4gdGhlIHRhYmxlIGlzIEFMV0FZUyBibGFuayBhbmQgdW51c2VkLlxuICAgICAgICAgKiBAaW1wbGVtZW50cyBJU3RyaW5nVGFibGVcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklTdHJpbmdUYWJsZT19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gU3RyaW5nVGFibGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgdGhpcy5zID0gW107XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFN0cmluZ1RhYmxlIHMuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxVaW50OEFycmF5Pn0gc1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgU3RyaW5nVGFibGUucHJvdG90eXBlLnMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IFN0cmluZ1RhYmxlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGNyZWF0ZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVN0cmluZ1RhYmxlPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuU3RyaW5nVGFibGV9IFN0cmluZ1RhYmxlIGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBTdHJpbmdUYWJsZS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBTdHJpbmdUYWJsZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFN0cmluZ1RhYmxlIG1lc3NhZ2UuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIE9TTVBCRi5TdHJpbmdUYWJsZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVN0cmluZ1RhYmxlfSBtZXNzYWdlIFN0cmluZ1RhYmxlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgU3RyaW5nVGFibGUuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnMgIT0gbnVsbCAmJiBtZXNzYWdlLnMubGVuZ3RoKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5zLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDIgPSovMTApLmJ5dGVzKG1lc3NhZ2Uuc1tpXSk7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgU3RyaW5nVGFibGUgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLlN0cmluZ1RhYmxlLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuU3RyaW5nVGFibGVcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JU3RyaW5nVGFibGV9IG1lc3NhZ2UgU3RyaW5nVGFibGUgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBTdHJpbmdUYWJsZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFN0cmluZ1RhYmxlIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5TdHJpbmdUYWJsZVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlN0cmluZ1RhYmxlfSBTdHJpbmdUYWJsZVxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIFN0cmluZ1RhYmxlLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5TdHJpbmdUYWJsZSgpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLnMgJiYgbWVzc2FnZS5zLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5zLnB1c2gocmVhZGVyLmJ5dGVzKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgU3RyaW5nVGFibGUgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuU3RyaW5nVGFibGV9IFN0cmluZ1RhYmxlXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgU3RyaW5nVGFibGUuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gbmV3ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgU3RyaW5nVGFibGUgbWVzc2FnZS5cbiAgICAgICAgICogQGZ1bmN0aW9uIHZlcmlmeVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAqL1xuICAgICAgICBTdHJpbmdUYWJsZS52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5zICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5zKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2Uucy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5zW2ldICYmIHR5cGVvZiBtZXNzYWdlLnNbaV0ubGVuZ3RoID09PSBcIm51bWJlclwiIHx8ICR1dGlsLmlzU3RyaW5nKG1lc3NhZ2Uuc1tpXSkpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiczogYnVmZmVyW10gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgU3RyaW5nVGFibGUgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlN0cmluZ1RhYmxlfSBTdHJpbmdUYWJsZVxuICAgICAgICAgKi9cbiAgICAgICAgU3RyaW5nVGFibGUuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QuT1NNUEJGLlN0cmluZ1RhYmxlKVxuICAgICAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgICAgICB2YXIgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuU3RyaW5nVGFibGUoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3Qucykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QucykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuU3RyaW5nVGFibGUuczogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5zID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3Qucy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBvYmplY3Quc1tpXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgICR1dGlsLmJhc2U2NC5kZWNvZGUob2JqZWN0LnNbaV0sIG1lc3NhZ2Uuc1tpXSA9ICR1dGlsLm5ld0J1ZmZlcigkdXRpbC5iYXNlNjQubGVuZ3RoKG9iamVjdC5zW2ldKSksIDApO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmIChvYmplY3Quc1tpXS5sZW5ndGgpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnNbaV0gPSBvYmplY3Quc1tpXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgcGxhaW4gb2JqZWN0IGZyb20gYSBTdHJpbmdUYWJsZSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b09iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlN0cmluZ1RhYmxlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuU3RyaW5nVGFibGV9IG1lc3NhZ2UgU3RyaW5nVGFibGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuSUNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBTdHJpbmdUYWJsZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hcnJheXMgfHwgb3B0aW9ucy5kZWZhdWx0cylcbiAgICAgICAgICAgICAgICBvYmplY3QucyA9IFtdO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UucyAmJiBtZXNzYWdlLnMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2Uucy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnNbal0gPSBvcHRpb25zLmJ5dGVzID09PSBTdHJpbmcgPyAkdXRpbC5iYXNlNjQuZW5jb2RlKG1lc3NhZ2Uuc1tqXSwgMCwgbWVzc2FnZS5zW2pdLmxlbmd0aCkgOiBvcHRpb25zLmJ5dGVzID09PSBBcnJheSA/IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKG1lc3NhZ2Uuc1tqXSkgOiBtZXNzYWdlLnNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFN0cmluZ1RhYmxlIHRvIEpTT04uXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b0pTT05cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5TdHJpbmdUYWJsZVxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgU3RyaW5nVGFibGUucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIHJldHVybiBTdHJpbmdUYWJsZTtcbiAgICB9KSgpO1xuXG4gICAgT1NNUEJGLkluZm8gPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYW4gSW5mby5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElJbmZvXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfG51bGx9IFt2ZXJzaW9uXSBJbmZvIHZlcnNpb25cbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8TG9uZ3xudWxsfSBbdGltZXN0YW1wXSBJbmZvIHRpbWVzdGFtcFxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcnxMb25nfG51bGx9IFtjaGFuZ2VzZXRdIEluZm8gY2hhbmdlc2V0XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfG51bGx9IFt1aWRdIEluZm8gdWlkXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfG51bGx9IFt1c2VyU2lkXSBJbmZvIHVzZXJTaWRcbiAgICAgICAgICogQHByb3BlcnR5IHtib29sZWFufG51bGx9IFt2aXNpYmxlXSBJbmZvIHZpc2libGVcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgSW5mby5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAY2xhc3NkZXNjIFJlcHJlc2VudHMgYW4gSW5mby5cbiAgICAgICAgICogQGltcGxlbWVudHMgSUluZm9cbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklJbmZvPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBJbmZvKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5mbyB2ZXJzaW9uLlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ9IHZlcnNpb25cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5JbmZvXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSW5mby5wcm90b3R5cGUudmVyc2lvbiA9IC0xO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbmZvIHRpbWVzdGFtcC5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IHRpbWVzdGFtcFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkluZm9cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBJbmZvLnByb3RvdHlwZS50aW1lc3RhbXAgPSAkdXRpbC5Mb25nID8gJHV0aWwuTG9uZy5mcm9tQml0cygwLDAsZmFsc2UpIDogMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5mbyBjaGFuZ2VzZXQuXG4gICAgICAgICAqIEBtZW1iZXIge251bWJlcnxMb25nfSBjaGFuZ2VzZXRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5JbmZvXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgSW5mby5wcm90b3R5cGUuY2hhbmdlc2V0ID0gJHV0aWwuTG9uZyA/ICR1dGlsLkxvbmcuZnJvbUJpdHMoMCwwLGZhbHNlKSA6IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEluZm8gdWlkLlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ9IHVpZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkluZm9cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBJbmZvLnByb3RvdHlwZS51aWQgPSAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBJbmZvIHVzZXJTaWQuXG4gICAgICAgICAqIEBtZW1iZXIge251bWJlcn0gdXNlclNpZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkluZm9cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBJbmZvLnByb3RvdHlwZS51c2VyU2lkID0gMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogSW5mbyB2aXNpYmxlLlxuICAgICAgICAgKiBAbWVtYmVyIHtib29sZWFufSB2aXNpYmxlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSW5mb1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEluZm8ucHJvdG90eXBlLnZpc2libGUgPSBmYWxzZTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBJbmZvIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGNyZWF0ZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkluZm9cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JSW5mbz19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkluZm99IEluZm8gaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIEluZm8uY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW5mbyhwcm9wZXJ0aWVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIEluZm8gbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkluZm8udmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBlbmNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5JbmZvXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSUluZm99IG1lc3NhZ2UgSW5mbyBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIEluZm8uZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZlcnNpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidmVyc2lvblwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDAgPSovOCkuaW50MzIobWVzc2FnZS52ZXJzaW9uKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnRpbWVzdGFtcCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ0aW1lc3RhbXBcIikpXG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAyLCB3aXJlVHlwZSAwID0qLzE2KS5pbnQ2NChtZXNzYWdlLnRpbWVzdGFtcCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jaGFuZ2VzZXQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiY2hhbmdlc2V0XCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMywgd2lyZVR5cGUgMCA9Ki8yNCkuaW50NjQobWVzc2FnZS5jaGFuZ2VzZXQpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudWlkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInVpZFwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDAgPSovMzIpLmludDMyKG1lc3NhZ2UudWlkKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnVzZXJTaWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidXNlclNpZFwiKSlcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDUsIHdpcmVUeXBlIDAgPSovNDApLnVpbnQzMihtZXNzYWdlLnVzZXJTaWQpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudmlzaWJsZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ2aXNpYmxlXCIpKVxuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgNiwgd2lyZVR5cGUgMCA9Ki80OCkuYm9vbChtZXNzYWdlLnZpc2libGUpO1xuICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIEluZm8gbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkluZm8udmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5JbmZvXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSUluZm99IG1lc3NhZ2UgSW5mbyBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIEluZm8uZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYW4gSW5mbyBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkluZm99IEluZm9cbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBJbmZvLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5JbmZvKCk7XG4gICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbiA9IHJlYWRlci5pbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudGltZXN0YW1wID0gcmVhZGVyLmludDY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXQgPSByZWFkZXIuaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnVpZCA9IHJlYWRlci5pbnQzMigpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDU6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudXNlclNpZCA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnZpc2libGUgPSByZWFkZXIuYm9vbCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGFuIEluZm8gbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkluZm9cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5JbmZvfSBJbmZvXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgSW5mby5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSBuZXcgJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmVyaWZpZXMgYW4gSW5mbyBtZXNzYWdlLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdmVyaWZ5XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgKi9cbiAgICAgICAgSW5mby52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52ZXJzaW9uICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInZlcnNpb25cIikpXG4gICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS52ZXJzaW9uKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVyc2lvbjogaW50ZWdlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudGltZXN0YW1wICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInRpbWVzdGFtcFwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnRpbWVzdGFtcCkgJiYgIShtZXNzYWdlLnRpbWVzdGFtcCAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS50aW1lc3RhbXAubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS50aW1lc3RhbXAuaGlnaCkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0aW1lc3RhbXA6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY2hhbmdlc2V0ICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImNoYW5nZXNldFwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmNoYW5nZXNldCkgJiYgIShtZXNzYWdlLmNoYW5nZXNldCAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5jaGFuZ2VzZXQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5jaGFuZ2VzZXQuaGlnaCkpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJjaGFuZ2VzZXQ6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudWlkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInVpZFwiKSlcbiAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnVpZCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInVpZDogaW50ZWdlciBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudXNlclNpZCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ1c2VyU2lkXCIpKVxuICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UudXNlclNpZCkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInVzZXJTaWQ6IGludGVnZXIgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZpc2libGUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidmlzaWJsZVwiKSlcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UudmlzaWJsZSAhPT0gXCJib29sZWFuXCIpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZpc2libGU6IGJvb2xlYW4gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGFuIEluZm8gbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkluZm9cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuSW5mb30gSW5mb1xuICAgICAgICAgKi9cbiAgICAgICAgSW5mby5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5PU01QQkYuSW5mbylcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3QuT1NNUEJGLkluZm8oKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QudmVyc2lvbiAhPSBudWxsKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbiA9IG9iamVjdC52ZXJzaW9uIHwgMDtcbiAgICAgICAgICAgIGlmIChvYmplY3QudGltZXN0YW1wICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpXG4gICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLnRpbWVzdGFtcCA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC50aW1lc3RhbXApKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QudGltZXN0YW1wID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnRpbWVzdGFtcCA9IHBhcnNlSW50KG9iamVjdC50aW1lc3RhbXAsIDEwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LnRpbWVzdGFtcCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50aW1lc3RhbXAgPSBvYmplY3QudGltZXN0YW1wO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QudGltZXN0YW1wID09PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnRpbWVzdGFtcCA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QudGltZXN0YW1wLmxvdyA+Pj4gMCwgb2JqZWN0LnRpbWVzdGFtcC5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5jaGFuZ2VzZXQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UuY2hhbmdlc2V0ID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0LmNoYW5nZXNldCkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5jaGFuZ2VzZXQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY2hhbmdlc2V0ID0gcGFyc2VJbnQob2JqZWN0LmNoYW5nZXNldCwgMTApO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuY2hhbmdlc2V0ID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNoYW5nZXNldCA9IG9iamVjdC5jaGFuZ2VzZXQ7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5jaGFuZ2VzZXQgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY2hhbmdlc2V0ID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5jaGFuZ2VzZXQubG93ID4+PiAwLCBvYmplY3QuY2hhbmdlc2V0LmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LnVpZCAhPSBudWxsKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UudWlkID0gb2JqZWN0LnVpZCB8IDA7XG4gICAgICAgICAgICBpZiAob2JqZWN0LnVzZXJTaWQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnVzZXJTaWQgPSBvYmplY3QudXNlclNpZCA+Pj4gMDtcbiAgICAgICAgICAgIGlmIChvYmplY3QudmlzaWJsZSAhPSBudWxsKVxuICAgICAgICAgICAgICAgIG1lc3NhZ2UudmlzaWJsZSA9IEJvb2xlYW4ob2JqZWN0LnZpc2libGUpO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhbiBJbmZvIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLkluZm99IG1lc3NhZ2UgSW5mb1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5JQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIEluZm8udG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QudmVyc2lvbiA9IC0xO1xuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb25nID0gbmV3ICR1dGlsLkxvbmcoMCwgMCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QudGltZXN0YW1wID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gbG9uZy50b1N0cmluZygpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbG9uZy50b051bWJlcigpIDogbG9uZztcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnRpbWVzdGFtcCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IG5ldyAkdXRpbC5Mb25nKDAsIDAsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmNoYW5nZXNldCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IGxvbmcudG9TdHJpbmcoKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IGxvbmcudG9OdW1iZXIoKSA6IGxvbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5jaGFuZ2VzZXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBcIjBcIiA6IDA7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnVpZCA9IDA7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnVzZXJTaWQgPSAwO1xuICAgICAgICAgICAgICAgIG9iamVjdC52aXNpYmxlID0gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52ZXJzaW9uICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInZlcnNpb25cIikpXG4gICAgICAgICAgICAgICAgb2JqZWN0LnZlcnNpb24gPSBtZXNzYWdlLnZlcnNpb247XG4gICAgICAgICAgICBpZiAobWVzc2FnZS50aW1lc3RhbXAgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidGltZXN0YW1wXCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS50aW1lc3RhbXAgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC50aW1lc3RhbXAgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS50aW1lc3RhbXApIDogbWVzc2FnZS50aW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudGltZXN0YW1wID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLnRpbWVzdGFtcCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS50aW1lc3RhbXAubG93ID4+PiAwLCBtZXNzYWdlLnRpbWVzdGFtcC5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS50aW1lc3RhbXA7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jaGFuZ2VzZXQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiY2hhbmdlc2V0XCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5jaGFuZ2VzZXQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5jaGFuZ2VzZXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5jaGFuZ2VzZXQpIDogbWVzc2FnZS5jaGFuZ2VzZXQ7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuY2hhbmdlc2V0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLmNoYW5nZXNldCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS5jaGFuZ2VzZXQubG93ID4+PiAwLCBtZXNzYWdlLmNoYW5nZXNldC5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS5jaGFuZ2VzZXQ7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS51aWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidWlkXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC51aWQgPSBtZXNzYWdlLnVpZDtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnVzZXJTaWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidXNlclNpZFwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QudXNlclNpZCA9IG1lc3NhZ2UudXNlclNpZDtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZpc2libGUgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidmlzaWJsZVwiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QudmlzaWJsZSA9IG1lc3NhZ2UudmlzaWJsZTtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIHRoaXMgSW5mbyB0byBKU09OLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9KU09OXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuSW5mb1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgSW5mby5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIEluZm87XG4gICAgfSkoKTtcblxuICAgIE9TTVBCRi5EZW5zZUluZm8gPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBEZW5zZUluZm8uXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkZcbiAgICAgICAgICogQGludGVyZmFjZSBJRGVuc2VJbmZvXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj58bnVsbH0gW3ZlcnNpb25dIERlbnNlSW5mbyB2ZXJzaW9uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcnxMb25nPnxudWxsfSBbdGltZXN0YW1wXSBEZW5zZUluZm8gdGltZXN0YW1wXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcnxMb25nPnxudWxsfSBbY2hhbmdlc2V0XSBEZW5zZUluZm8gY2hhbmdlc2V0XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj58bnVsbH0gW3VpZF0gRGVuc2VJbmZvIHVpZFxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxudW1iZXI+fG51bGx9IFt1c2VyU2lkXSBEZW5zZUluZm8gdXNlclNpZFxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5Ljxib29sZWFuPnxudWxsfSBbdmlzaWJsZV0gRGVuc2VJbmZvIHZpc2libGVcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgRGVuc2VJbmZvLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgT3B0aW9uYWwgbWV0YWRhdGEgdGhhdCBtYXkgYmUgaW5jbHVkZWQgaW50byBlYWNoIHByaW1pdGl2ZS4gU3BlY2lhbCBkZW5zZSBmb3JtYXQgdXNlZCBpbiBEZW5zZU5vZGVzLlxuICAgICAgICAgKiBAaW1wbGVtZW50cyBJRGVuc2VJbmZvXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JRGVuc2VJbmZvPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBEZW5zZUluZm8ocHJvcGVydGllcykge1xuICAgICAgICAgICAgdGhpcy52ZXJzaW9uID0gW107XG4gICAgICAgICAgICB0aGlzLnRpbWVzdGFtcCA9IFtdO1xuICAgICAgICAgICAgdGhpcy5jaGFuZ2VzZXQgPSBbXTtcbiAgICAgICAgICAgIHRoaXMudWlkID0gW107XG4gICAgICAgICAgICB0aGlzLnVzZXJTaWQgPSBbXTtcbiAgICAgICAgICAgIHRoaXMudmlzaWJsZSA9IFtdO1xuICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZW5zZUluZm8gdmVyc2lvbi5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPG51bWJlcj59IHZlcnNpb25cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZUluZm9cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZUluZm8ucHJvdG90eXBlLnZlcnNpb24gPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZW5zZUluZm8gdGltZXN0YW1wLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48bnVtYmVyfExvbmc+fSB0aW1lc3RhbXBcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZUluZm9cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZUluZm8ucHJvdG90eXBlLnRpbWVzdGFtcCA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbnNlSW5mbyBjaGFuZ2VzZXQuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXJ8TG9uZz59IGNoYW5nZXNldFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlSW5mby5wcm90b3R5cGUuY2hhbmdlc2V0ID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVuc2VJbmZvIHVpZC5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPG51bWJlcj59IHVpZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlSW5mby5wcm90b3R5cGUudWlkID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVuc2VJbmZvIHVzZXJTaWQuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXI+fSB1c2VyU2lkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VJbmZvXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VJbmZvLnByb3RvdHlwZS51c2VyU2lkID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVuc2VJbmZvIHZpc2libGUuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5Ljxib29sZWFuPn0gdmlzaWJsZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlSW5mby5wcm90b3R5cGUudmlzaWJsZSA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgRGVuc2VJbmZvIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGNyZWF0ZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklEZW5zZUluZm89fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5EZW5zZUluZm99IERlbnNlSW5mbyBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VJbmZvLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IERlbnNlSW5mbyhwcm9wZXJ0aWVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIERlbnNlSW5mbyBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuRGVuc2VJbmZvLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VJbmZvXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSURlbnNlSW5mb30gbWVzc2FnZSBEZW5zZUluZm8gbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZUluZm8uZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZlcnNpb24gIT0gbnVsbCAmJiBtZXNzYWdlLnZlcnNpb24ubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxLCB3aXJlVHlwZSAyID0qLzEwKS5mb3JrKCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLnZlcnNpb24ubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci5pbnQzMihtZXNzYWdlLnZlcnNpb25baV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnRpbWVzdGFtcCAhPSBudWxsICYmIG1lc3NhZ2UudGltZXN0YW1wLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgMiA9Ki8xOCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS50aW1lc3RhbXAubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci5zaW50NjQobWVzc2FnZS50aW1lc3RhbXBbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmNoYW5nZXNldCAhPSBudWxsICYmIG1lc3NhZ2UuY2hhbmdlc2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMywgd2lyZVR5cGUgMiA9Ki8yNikuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5jaGFuZ2VzZXQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci5zaW50NjQobWVzc2FnZS5jaGFuZ2VzZXRbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnVpZCAhPSBudWxsICYmIG1lc3NhZ2UudWlkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgNCwgd2lyZVR5cGUgMiA9Ki8zNCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS51aWQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci5zaW50MzIobWVzc2FnZS51aWRbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnVzZXJTaWQgIT0gbnVsbCAmJiBtZXNzYWdlLnVzZXJTaWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCA1LCB3aXJlVHlwZSAyID0qLzQyKS5mb3JrKCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLnVzZXJTaWQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci5zaW50MzIobWVzc2FnZS51c2VyU2lkW2ldKTtcbiAgICAgICAgICAgICAgICB3cml0ZXIubGRlbGltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52aXNpYmxlICE9IG51bGwgJiYgbWVzc2FnZS52aXNpYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgNiwgd2lyZVR5cGUgMiA9Ki81MCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS52aXNpYmxlLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIuYm9vbChtZXNzYWdlLnZpc2libGVbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBEZW5zZUluZm8gbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkRlbnNlSW5mby52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklEZW5zZUluZm99IG1lc3NhZ2UgRGVuc2VJbmZvIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VJbmZvLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgRGVuc2VJbmZvIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZUluZm9cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5EZW5zZUluZm99IERlbnNlSW5mb1xuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlSW5mby5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuRGVuc2VJbmZvKCk7XG4gICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UudmVyc2lvbiAmJiBtZXNzYWdlLnZlcnNpb24ubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS52ZXJzaW9uLnB1c2gocmVhZGVyLmludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbi5wdXNoKHJlYWRlci5pbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLnRpbWVzdGFtcCAmJiBtZXNzYWdlLnRpbWVzdGFtcC5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50aW1lc3RhbXAgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0YWcgJiA3KSA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZDIgPSByZWFkZXIudWludDMyKCkgKyByZWFkZXIucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudGltZXN0YW1wLnB1c2gocmVhZGVyLnNpbnQ2NCgpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnRpbWVzdGFtcC5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5jaGFuZ2VzZXQgJiYgbWVzc2FnZS5jaGFuZ2VzZXQubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY2hhbmdlc2V0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmICgodGFnICYgNykgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmQyID0gcmVhZGVyLnVpbnQzMigpICsgcmVhZGVyLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNoYW5nZXNldC5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXQucHVzaChyZWFkZXIuc2ludDY0KCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UudWlkICYmIG1lc3NhZ2UudWlkLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnVpZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS51aWQucHVzaChyZWFkZXIuc2ludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudWlkLnB1c2gocmVhZGVyLnNpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA1OlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLnVzZXJTaWQgJiYgbWVzc2FnZS51c2VyU2lkLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnVzZXJTaWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0YWcgJiA3KSA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZDIgPSByZWFkZXIudWludDMyKCkgKyByZWFkZXIucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudXNlclNpZC5wdXNoKHJlYWRlci5zaW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS51c2VyU2lkLnB1c2gocmVhZGVyLnNpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA2OlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLnZpc2libGUgJiYgbWVzc2FnZS52aXNpYmxlLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnZpc2libGUgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0YWcgJiA3KSA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZDIgPSByZWFkZXIudWludDMyKCkgKyByZWFkZXIucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmlzaWJsZS5wdXNoKHJlYWRlci5ib29sKCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmlzaWJsZS5wdXNoKHJlYWRlci5ib29sKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgRGVuc2VJbmZvIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZUluZm9cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5EZW5zZUluZm99IERlbnNlSW5mb1xuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlSW5mby5kZWNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWQocmVhZGVyKSB7XG4gICAgICAgICAgICBpZiAoIShyZWFkZXIgaW5zdGFuY2VvZiAkUmVhZGVyKSlcbiAgICAgICAgICAgICAgICByZWFkZXIgPSBuZXcgJFJlYWRlcihyZWFkZXIpO1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogVmVyaWZpZXMgYSBEZW5zZUluZm8gbWVzc2FnZS5cbiAgICAgICAgICogQGZ1bmN0aW9uIHZlcmlmeVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VJbmZvLnZlcmlmeSA9IGZ1bmN0aW9uIHZlcmlmeShtZXNzYWdlKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UgIT09IFwib2JqZWN0XCIgfHwgbWVzc2FnZSA9PT0gbnVsbClcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJvYmplY3QgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZlcnNpb24gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidmVyc2lvblwiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLnZlcnNpb24pKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2ZXJzaW9uOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS52ZXJzaW9uLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnZlcnNpb25baV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmVyc2lvbjogaW50ZWdlcltdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS50aW1lc3RhbXAgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidGltZXN0YW1wXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UudGltZXN0YW1wKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidGltZXN0YW1wOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS50aW1lc3RhbXAubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UudGltZXN0YW1wW2ldKSAmJiAhKG1lc3NhZ2UudGltZXN0YW1wW2ldICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnRpbWVzdGFtcFtpXS5sb3cpICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnRpbWVzdGFtcFtpXS5oaWdoKSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0aW1lc3RhbXA6IGludGVnZXJ8TG9uZ1tdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jaGFuZ2VzZXQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiY2hhbmdlc2V0XCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UuY2hhbmdlc2V0KSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiY2hhbmdlc2V0OiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5jaGFuZ2VzZXQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuY2hhbmdlc2V0W2ldKSAmJiAhKG1lc3NhZ2UuY2hhbmdlc2V0W2ldICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmNoYW5nZXNldFtpXS5sb3cpICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmNoYW5nZXNldFtpXS5oaWdoKSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJjaGFuZ2VzZXQ6IGludGVnZXJ8TG9uZ1tdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS51aWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidWlkXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UudWlkKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidWlkOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS51aWQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UudWlkW2ldKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInVpZDogaW50ZWdlcltdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS51c2VyU2lkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInVzZXJTaWRcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS51c2VyU2lkKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidXNlclNpZDogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudXNlclNpZC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS51c2VyU2lkW2ldKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInVzZXJTaWQ6IGludGVnZXJbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudmlzaWJsZSAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJ2aXNpYmxlXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2UudmlzaWJsZSkpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZpc2libGU6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLnZpc2libGUubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS52aXNpYmxlW2ldICE9PSBcImJvb2xlYW5cIilcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZpc2libGU6IGJvb2xlYW5bXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBEZW5zZUluZm8gbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5EZW5zZUluZm99IERlbnNlSW5mb1xuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VJbmZvLmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lk9TTVBCRi5EZW5zZUluZm8pXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5EZW5zZUluZm8oKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QudmVyc2lvbikge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QudmVyc2lvbikpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VJbmZvLnZlcnNpb246IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbiA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnZlcnNpb24ubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmVyc2lvbltpXSA9IG9iamVjdC52ZXJzaW9uW2ldIHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QudGltZXN0YW1wKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdC50aW1lc3RhbXApKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLkRlbnNlSW5mby50aW1lc3RhbXA6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudGltZXN0YW1wID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QudGltZXN0YW1wLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLnRpbWVzdGFtcFtpXSA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC50aW1lc3RhbXBbaV0pKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LnRpbWVzdGFtcFtpXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudGltZXN0YW1wW2ldID0gcGFyc2VJbnQob2JqZWN0LnRpbWVzdGFtcFtpXSwgMTApO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LnRpbWVzdGFtcFtpXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudGltZXN0YW1wW2ldID0gb2JqZWN0LnRpbWVzdGFtcFtpXTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC50aW1lc3RhbXBbaV0gPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnRpbWVzdGFtcFtpXSA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QudGltZXN0YW1wW2ldLmxvdyA+Pj4gMCwgb2JqZWN0LnRpbWVzdGFtcFtpXS5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5jaGFuZ2VzZXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LmNoYW5nZXNldCkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VJbmZvLmNoYW5nZXNldDogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5jaGFuZ2VzZXQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKVxuICAgICAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UuY2hhbmdlc2V0W2ldID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0LmNoYW5nZXNldFtpXSkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuY2hhbmdlc2V0W2ldID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXRbaV0gPSBwYXJzZUludChvYmplY3QuY2hhbmdlc2V0W2ldLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuY2hhbmdlc2V0W2ldID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jaGFuZ2VzZXRbaV0gPSBvYmplY3QuY2hhbmdlc2V0W2ldO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmNoYW5nZXNldFtpXSA9PT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY2hhbmdlc2V0W2ldID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5jaGFuZ2VzZXRbaV0ubG93ID4+PiAwLCBvYmplY3QuY2hhbmdlc2V0W2ldLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LnVpZCkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QudWlkKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5EZW5zZUluZm8udWlkOiBhcnJheSBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnVpZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnVpZC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS51aWRbaV0gPSBvYmplY3QudWlkW2ldIHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QudXNlclNpZCkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QudXNlclNpZCkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VJbmZvLnVzZXJTaWQ6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudXNlclNpZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnVzZXJTaWQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudXNlclNpZFtpXSA9IG9iamVjdC51c2VyU2lkW2ldIHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QudmlzaWJsZSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QudmlzaWJsZSkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VJbmZvLnZpc2libGU6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudmlzaWJsZSA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnZpc2libGUubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmlzaWJsZVtpXSA9IEJvb2xlYW4ob2JqZWN0LnZpc2libGVbaV0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIERlbnNlSW5mbyBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b09iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLkRlbnNlSW5mb30gbWVzc2FnZSBEZW5zZUluZm9cbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuSUNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZUluZm8udG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYXJyYXlzIHx8IG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QudmVyc2lvbiA9IFtdO1xuICAgICAgICAgICAgICAgIG9iamVjdC50aW1lc3RhbXAgPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QuY2hhbmdlc2V0ID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LnVpZCA9IFtdO1xuICAgICAgICAgICAgICAgIG9iamVjdC51c2VyU2lkID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LnZpc2libGUgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZlcnNpb24gJiYgbWVzc2FnZS52ZXJzaW9uLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC52ZXJzaW9uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLnZlcnNpb24ubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC52ZXJzaW9uW2pdID0gbWVzc2FnZS52ZXJzaW9uW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudGltZXN0YW1wICYmIG1lc3NhZ2UudGltZXN0YW1wLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC50aW1lc3RhbXAgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UudGltZXN0YW1wLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UudGltZXN0YW1wW2pdID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnRpbWVzdGFtcFtqXSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLnRpbWVzdGFtcFtqXSkgOiBtZXNzYWdlLnRpbWVzdGFtcFtqXTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnRpbWVzdGFtcFtqXSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/ICR1dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobWVzc2FnZS50aW1lc3RhbXBbal0pIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbmV3ICR1dGlsLkxvbmdCaXRzKG1lc3NhZ2UudGltZXN0YW1wW2pdLmxvdyA+Pj4gMCwgbWVzc2FnZS50aW1lc3RhbXBbal0uaGlnaCA+Pj4gMCkudG9OdW1iZXIoKSA6IG1lc3NhZ2UudGltZXN0YW1wW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY2hhbmdlc2V0ICYmIG1lc3NhZ2UuY2hhbmdlc2V0Lmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5jaGFuZ2VzZXQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UuY2hhbmdlc2V0Lmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuY2hhbmdlc2V0W2pdID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmNoYW5nZXNldFtqXSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmNoYW5nZXNldFtqXSkgOiBtZXNzYWdlLmNoYW5nZXNldFtqXTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmNoYW5nZXNldFtqXSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/ICR1dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobWVzc2FnZS5jaGFuZ2VzZXRbal0pIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbmV3ICR1dGlsLkxvbmdCaXRzKG1lc3NhZ2UuY2hhbmdlc2V0W2pdLmxvdyA+Pj4gMCwgbWVzc2FnZS5jaGFuZ2VzZXRbal0uaGlnaCA+Pj4gMCkudG9OdW1iZXIoKSA6IG1lc3NhZ2UuY2hhbmdlc2V0W2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudWlkICYmIG1lc3NhZ2UudWlkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC51aWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UudWlkLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudWlkW2pdID0gbWVzc2FnZS51aWRbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS51c2VyU2lkICYmIG1lc3NhZ2UudXNlclNpZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QudXNlclNpZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS51c2VyU2lkLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudXNlclNpZFtqXSA9IG1lc3NhZ2UudXNlclNpZFtqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZpc2libGUgJiYgbWVzc2FnZS52aXNpYmxlLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC52aXNpYmxlID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLnZpc2libGUubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC52aXNpYmxlW2pdID0gbWVzc2FnZS52aXNpYmxlW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBEZW5zZUluZm8gdG8gSlNPTi5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvSlNPTlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlSW5mb1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VJbmZvLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gRGVuc2VJbmZvO1xuICAgIH0pKCk7XG5cbiAgICBPU01QQkYuQ2hhbmdlU2V0ID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgQ2hhbmdlU2V0LlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBpbnRlcmZhY2UgSUNoYW5nZVNldFxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcnxMb25nfSBpZCBDaGFuZ2VTZXQgaWRcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgQ2hhbmdlU2V0LlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyBhIENoYW5nZVNldC5cbiAgICAgICAgICogQGltcGxlbWVudHMgSUNoYW5nZVNldFxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSUNoYW5nZVNldD19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gQ2hhbmdlU2V0KHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ2hhbmdlU2V0IGlkLlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ8TG9uZ30gaWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5DaGFuZ2VTZXRcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBDaGFuZ2VTZXQucHJvdG90eXBlLmlkID0gJHV0aWwuTG9uZyA/ICR1dGlsLkxvbmcuZnJvbUJpdHMoMCwwLGZhbHNlKSA6IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBuZXcgQ2hhbmdlU2V0IGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGNyZWF0ZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkNoYW5nZVNldFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklDaGFuZ2VTZXQ9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5DaGFuZ2VTZXR9IENoYW5nZVNldCBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgQ2hhbmdlU2V0LmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3IENoYW5nZVNldChwcm9wZXJ0aWVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIENoYW5nZVNldCBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuQ2hhbmdlU2V0LnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQ2hhbmdlU2V0XG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSUNoYW5nZVNldH0gbWVzc2FnZSBDaGFuZ2VTZXQgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBDaGFuZ2VTZXQuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMCA9Ki84KS5pbnQ2NChtZXNzYWdlLmlkKTtcbiAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBDaGFuZ2VTZXQgbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLkNoYW5nZVNldC52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkNoYW5nZVNldFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklDaGFuZ2VTZXR9IG1lc3NhZ2UgQ2hhbmdlU2V0IG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgQ2hhbmdlU2V0LmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgQ2hhbmdlU2V0IG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5DaGFuZ2VTZXRcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5DaGFuZ2VTZXR9IENoYW5nZVNldFxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIENoYW5nZVNldC5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuQ2hhbmdlU2V0KCk7XG4gICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSByZWFkZXIuaW50NjQoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgcmVhZGVyLnNraXBUeXBlKHRhZyAmIDcpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpZFwiKSlcbiAgICAgICAgICAgICAgICB0aHJvdyAkdXRpbC5Qcm90b2NvbEVycm9yKFwibWlzc2luZyByZXF1aXJlZCAnaWQnXCIsIHsgaW5zdGFuY2U6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIENoYW5nZVNldCBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQ2hhbmdlU2V0XG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuQ2hhbmdlU2V0fSBDaGFuZ2VTZXRcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBDaGFuZ2VTZXQuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gbmV3ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgQ2hhbmdlU2V0IG1lc3NhZ2UuXG4gICAgICAgICAqIEBmdW5jdGlvbiB2ZXJpZnlcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5DaGFuZ2VTZXRcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICovXG4gICAgICAgIENoYW5nZVNldC52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmlkKSAmJiAhKG1lc3NhZ2UuaWQgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuaWQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5pZC5oaWdoKSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiaWQ6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBDaGFuZ2VTZXQgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkNoYW5nZVNldFxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5DaGFuZ2VTZXR9IENoYW5nZVNldFxuICAgICAgICAgKi9cbiAgICAgICAgQ2hhbmdlU2V0LmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lk9TTVBCRi5DaGFuZ2VTZXQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5DaGFuZ2VTZXQoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QuaWQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UuaWQgPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QuaWQpKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBwYXJzZUludChvYmplY3QuaWQsIDEwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmlkID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmlkID0gb2JqZWN0LmlkO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LmlkLmxvdyA+Pj4gMCwgb2JqZWN0LmlkLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgQ2hhbmdlU2V0IG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuQ2hhbmdlU2V0XG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuQ2hhbmdlU2V0fSBtZXNzYWdlIENoYW5nZVNldFxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5JQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIENoYW5nZVNldC50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5kZWZhdWx0cylcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgbG9uZyA9IG5ldyAkdXRpbC5Mb25nKDAsIDAsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmlkID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gbG9uZy50b1N0cmluZygpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbG9uZy50b051bWJlcigpIDogbG9uZztcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmlkID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gXCIwXCIgOiAwO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWQgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaWRcIikpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmlkID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuaWQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5pZCkgOiBtZXNzYWdlLmlkO1xuICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmlkID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLmlkKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmlkLmxvdyA+Pj4gMCwgbWVzc2FnZS5pZC5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS5pZDtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIHRoaXMgQ2hhbmdlU2V0IHRvIEpTT04uXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b0pTT05cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5DaGFuZ2VTZXRcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gSlNPTiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIENoYW5nZVNldC5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIENoYW5nZVNldDtcbiAgICB9KSgpO1xuXG4gICAgT1NNUEJGLk5vZGUgPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBOb2RlLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBpbnRlcmZhY2UgSU5vZGVcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8TG9uZ30gaWQgTm9kZSBpZFxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxudW1iZXI+fG51bGx9IFtrZXlzXSBOb2RlIGtleXNcbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48bnVtYmVyPnxudWxsfSBbdmFsc10gTm9kZSB2YWxzXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T1NNUEJGLklJbmZvfG51bGx9IFtpbmZvXSBOb2RlIGluZm9cbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8TG9uZ30gbGF0IE5vZGUgbGF0XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfExvbmd9IGxvbiBOb2RlIGxvblxuICAgICAgICAgKi9cblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29uc3RydWN0cyBhIG5ldyBOb2RlLlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGXG4gICAgICAgICAqIEBjbGFzc2Rlc2MgUmVwcmVzZW50cyBhIE5vZGUuXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElOb2RlXG4gICAgICAgICAqIEBjb25zdHJ1Y3RvclxuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JTm9kZT19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKi9cbiAgICAgICAgZnVuY3Rpb24gTm9kZShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICB0aGlzLmtleXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMudmFscyA9IFtdO1xuICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBOb2RlIGlkLlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ8TG9uZ30gaWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5Ob2RlXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS5wcm90b3R5cGUuaWQgPSAkdXRpbC5Mb25nID8gJHV0aWwuTG9uZy5mcm9tQml0cygwLDAsZmFsc2UpIDogMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTm9kZSBrZXlzLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48bnVtYmVyPn0ga2V5c1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBOb2RlLnByb3RvdHlwZS5rZXlzID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTm9kZSB2YWxzLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48bnVtYmVyPn0gdmFsc1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBOb2RlLnByb3RvdHlwZS52YWxzID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogTm9kZSBpbmZvLlxuICAgICAgICAgKiBAbWVtYmVyIHtPU01QQkYuSUluZm98bnVsbHx1bmRlZmluZWR9IGluZm9cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5Ob2RlXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS5wcm90b3R5cGUuaW5mbyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIE5vZGUgbGF0LlxuICAgICAgICAgKiBAbWVtYmVyIHtudW1iZXJ8TG9uZ30gbGF0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuTm9kZVxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIE5vZGUucHJvdG90eXBlLmxhdCA9ICR1dGlsLkxvbmcgPyAkdXRpbC5Mb25nLmZyb21CaXRzKDAsMCxmYWxzZSkgOiAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBOb2RlIGxvbi5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IGxvblxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBOb2RlLnByb3RvdHlwZS5sb24gPSAkdXRpbC5Mb25nID8gJHV0aWwuTG9uZy5mcm9tQml0cygwLDAsZmFsc2UpIDogMDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBOb2RlIGluc3RhbmNlIHVzaW5nIHRoZSBzcGVjaWZpZWQgcHJvcGVydGllcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGNyZWF0ZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JTm9kZT19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLk5vZGV9IE5vZGUgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIE5vZGUuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgTm9kZShwcm9wZXJ0aWVzKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIE5vZGUgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLk5vZGUudmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBlbmNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5Ob2RlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSU5vZGV9IG1lc3NhZ2UgTm9kZSBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIE5vZGUuZW5jb2RlID0gZnVuY3Rpb24gZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgaWYgKCF3cml0ZXIpXG4gICAgICAgICAgICAgICAgd3JpdGVyID0gJFdyaXRlci5jcmVhdGUoKTtcbiAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMCA9Ki84KS5zaW50NjQobWVzc2FnZS5pZCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5rZXlzICE9IG51bGwgJiYgbWVzc2FnZS5rZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgMiA9Ki8xOCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5rZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKG1lc3NhZ2Uua2V5c1tpXSk7XG4gICAgICAgICAgICAgICAgd3JpdGVyLmxkZWxpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudmFscyAhPSBudWxsICYmIG1lc3NhZ2UudmFscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDMsIHdpcmVUeXBlIDIgPSovMjYpLmZvcmsoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMihtZXNzYWdlLnZhbHNbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaW5mb1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC5PU01QQkYuSW5mby5lbmNvZGUobWVzc2FnZS5pbmZvLCB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDIgPSovMzQpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDgsIHdpcmVUeXBlIDAgPSovNjQpLnNpbnQ2NChtZXNzYWdlLmxhdCk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDksIHdpcmVUeXBlIDAgPSovNzIpLnNpbnQ2NChtZXNzYWdlLmxvbik7XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgTm9kZSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuTm9kZS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JTm9kZX0gbWVzc2FnZSBOb2RlIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIE5vZGUgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5SZWFkZXJ8VWludDhBcnJheX0gcmVhZGVyIFJlYWRlciBvciBidWZmZXIgdG8gZGVjb2RlIGZyb21cbiAgICAgICAgICogQHBhcmFtIHtudW1iZXJ9IFtsZW5ndGhdIE1lc3NhZ2UgbGVuZ3RoIGlmIGtub3duIGJlZm9yZWhhbmRcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5Ob2RlfSBOb2RlXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS5kZWNvZGUgPSBmdW5jdGlvbiBkZWNvZGUocmVhZGVyLCBsZW5ndGgpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9ICRSZWFkZXIuY3JlYXRlKHJlYWRlcik7XG4gICAgICAgICAgICB2YXIgZW5kID0gbGVuZ3RoID09PSB1bmRlZmluZWQgPyByZWFkZXIubGVuIDogcmVhZGVyLnBvcyArIGxlbmd0aCwgbWVzc2FnZSA9IG5ldyAkcm9vdC5PU01QQkYuTm9kZSgpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmlkID0gcmVhZGVyLnNpbnQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2Uua2V5cyAmJiBtZXNzYWdlLmtleXMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uua2V5cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzLnB1c2gocmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXMucHVzaChyZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UudmFscyAmJiBtZXNzYWdlLnZhbHMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS52YWxzLnB1c2gocmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnZhbHMucHVzaChyZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaW5mbyA9ICRyb290Lk9TTVBCRi5JbmZvLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXQgPSByZWFkZXIuc2ludDY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgOTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sb24gPSByZWFkZXIuc2ludDY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaWRcIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgJHV0aWwuUHJvdG9jb2xFcnJvcihcIm1pc3NpbmcgcmVxdWlyZWQgJ2lkJ1wiLCB7IGluc3RhbmNlOiBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgaWYgKCFtZXNzYWdlLmhhc093blByb3BlcnR5KFwibGF0XCIpKVxuICAgICAgICAgICAgICAgIHRocm93ICR1dGlsLlByb3RvY29sRXJyb3IoXCJtaXNzaW5nIHJlcXVpcmVkICdsYXQnXCIsIHsgaW5zdGFuY2U6IG1lc3NhZ2UgfSk7XG4gICAgICAgICAgICBpZiAoIW1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsb25cIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgJHV0aWwuUHJvdG9jb2xFcnJvcihcIm1pc3NpbmcgcmVxdWlyZWQgJ2xvbidcIiwgeyBpbnN0YW5jZTogbWVzc2FnZSB9KTtcbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgTm9kZSBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLCBsZW5ndGggZGVsaW1pdGVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuTm9kZVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLk5vZGV9IE5vZGVcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBOb2RlLmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9IG5ldyAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWZXJpZmllcyBhIE5vZGUgbWVzc2FnZS5cbiAgICAgICAgICogQGZ1bmN0aW9uIHZlcmlmeVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBtZXNzYWdlIFBsYWluIG9iamVjdCB0byB2ZXJpZnlcbiAgICAgICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBgbnVsbGAgaWYgdmFsaWQsIG90aGVyd2lzZSB0aGUgcmVhc29uIHdoeSBpdCBpcyBub3RcbiAgICAgICAgICovXG4gICAgICAgIE5vZGUudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5pZCkgJiYgIShtZXNzYWdlLmlkICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmlkLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuaWQuaGlnaCkpKVxuICAgICAgICAgICAgICAgIHJldHVybiBcImlkOiBpbnRlZ2VyfExvbmcgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmtleXMgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwia2V5c1wiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLmtleXMpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJrZXlzOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5rZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmtleXNbaV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwia2V5czogaW50ZWdlcltdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52YWxzICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInZhbHNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS52YWxzKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmFsczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS52YWxzW2ldKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZhbHM6IGludGVnZXJbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaW5mbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpbmZvXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3QuT1NNUEJGLkluZm8udmVyaWZ5KG1lc3NhZ2UuaW5mbyk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJpbmZvLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmxhdCkgJiYgIShtZXNzYWdlLmxhdCAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sYXQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sYXQuaGlnaCkpKVxuICAgICAgICAgICAgICAgIHJldHVybiBcImxhdDogaW50ZWdlcnxMb25nIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmxvbikgJiYgIShtZXNzYWdlLmxvbiAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sb24ubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sb24uaGlnaCkpKVxuICAgICAgICAgICAgICAgIHJldHVybiBcImxvbjogaW50ZWdlcnxMb25nIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIE5vZGUgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLk5vZGVcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuTm9kZX0gTm9kZVxuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5PU01QQkYuTm9kZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICAgICAgdmFyIG1lc3NhZ2UgPSBuZXcgJHJvb3QuT1NNUEJGLk5vZGUoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QuaWQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UuaWQgPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QuaWQpKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBwYXJzZUludChvYmplY3QuaWQsIDEwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmlkID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmlkID0gb2JqZWN0LmlkO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LmlkLmxvdyA+Pj4gMCwgb2JqZWN0LmlkLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LmtleXMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLk5vZGUua2V5czogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3Qua2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzW2ldID0gb2JqZWN0LmtleXNbaV0gPj4+IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LnZhbHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LnZhbHMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLk5vZGUudmFsczogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS52YWxzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QudmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS52YWxzW2ldID0gb2JqZWN0LnZhbHNbaV0gPj4+IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LmluZm8gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LmluZm8gIT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuTm9kZS5pbmZvOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5pbmZvID0gJHJvb3QuT1NNUEJGLkluZm8uZnJvbU9iamVjdChvYmplY3QuaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LmxhdCAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKVxuICAgICAgICAgICAgICAgICAgICAobWVzc2FnZS5sYXQgPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QubGF0KSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxhdCA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXQgPSBwYXJzZUludChvYmplY3QubGF0LCAxMCk7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5sYXQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGF0ID0gb2JqZWN0LmxhdDtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxhdCA9PT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXQgPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LmxhdC5sb3cgPj4+IDAsIG9iamVjdC5sYXQuaGlnaCA+Pj4gMCkudG9OdW1iZXIoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QubG9uICE9IG51bGwpXG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpXG4gICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLmxvbiA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC5sb24pKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QubG9uID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxvbiA9IHBhcnNlSW50KG9iamVjdC5sb24sIDEwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxvbiA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sb24gPSBvYmplY3QubG9uO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QubG9uID09PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxvbiA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QubG9uLmxvdyA+Pj4gMCwgb2JqZWN0Lmxvbi5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIE5vZGUgbWVzc2FnZS4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gb3RoZXIgdHlwZXMgaWYgc3BlY2lmaWVkLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9PYmplY3RcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5Ob2RlXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuTm9kZX0gbWVzc2FnZSBOb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLklDb252ZXJzaW9uT3B0aW9uc30gW29wdGlvbnNdIENvbnZlcnNpb24gb3B0aW9uc1xuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IFBsYWluIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS50b09iamVjdCA9IGZ1bmN0aW9uIHRvT2JqZWN0KG1lc3NhZ2UsIG9wdGlvbnMpIHtcbiAgICAgICAgICAgIGlmICghb3B0aW9ucylcbiAgICAgICAgICAgICAgICBvcHRpb25zID0ge307XG4gICAgICAgICAgICB2YXIgb2JqZWN0ID0ge307XG4gICAgICAgICAgICBpZiAob3B0aW9ucy5hcnJheXMgfHwgb3B0aW9ucy5kZWZhdWx0cykge1xuICAgICAgICAgICAgICAgIG9iamVjdC5rZXlzID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LnZhbHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBuZXcgJHV0aWwuTG9uZygwLCAwLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IGxvbmcudG9TdHJpbmcoKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IGxvbmcudG9OdW1iZXIoKSA6IGxvbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgICAgICBvYmplY3QuaW5mbyA9IG51bGw7XG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBuZXcgJHV0aWwuTG9uZygwLCAwLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sYXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBsb25nLnRvU3RyaW5nKCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBsb25nLnRvTnVtYmVyKCkgOiBsb25nO1xuICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QubGF0ID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gXCIwXCIgOiAwO1xuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBsb25nID0gbmV3ICR1dGlsLkxvbmcoMCwgMCwgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICBvYmplY3QubG9uID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gbG9uZy50b1N0cmluZygpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbG9uZy50b051bWJlcigpIDogbG9uZztcbiAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmxvbiA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImlkXCIpKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5pZCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmlkID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gU3RyaW5nKG1lc3NhZ2UuaWQpIDogbWVzc2FnZS5pZDtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/ICR1dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobWVzc2FnZS5pZCkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS5pZC5sb3cgPj4+IDAsIG1lc3NhZ2UuaWQuaGlnaCA+Pj4gMCkudG9OdW1iZXIoKSA6IG1lc3NhZ2UuaWQ7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5rZXlzICYmIG1lc3NhZ2Uua2V5cy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3Qua2V5cyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5rZXlzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3Qua2V5c1tqXSA9IG1lc3NhZ2Uua2V5c1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZhbHMgJiYgbWVzc2FnZS52YWxzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC52YWxzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLnZhbHMubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC52YWxzW2pdID0gbWVzc2FnZS52YWxzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaW5mbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpbmZvXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5pbmZvID0gJHJvb3QuT1NNUEJGLkluZm8udG9PYmplY3QobWVzc2FnZS5pbmZvLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxhdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsYXRcIikpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxhdCA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmxhdCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmxhdCkgOiBtZXNzYWdlLmxhdDtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sYXQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubGF0KSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxhdC5sb3cgPj4+IDAsIG1lc3NhZ2UubGF0LmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmxhdDtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxvbiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsb25cIikpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxvbiA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmxvbiA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmxvbikgOiBtZXNzYWdlLmxvbjtcbiAgICAgICAgICAgICAgICBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5sb24gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubG9uKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxvbi5sb3cgPj4+IDAsIG1lc3NhZ2UubG9uLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmxvbjtcbiAgICAgICAgICAgIHJldHVybiBvYmplY3Q7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnZlcnRzIHRoaXMgTm9kZSB0byBKU09OLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdG9KU09OXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuTm9kZVxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgTm9kZS5wcm90b3R5cGUudG9KU09OID0gZnVuY3Rpb24gdG9KU09OKCkge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuY29uc3RydWN0b3IudG9PYmplY3QodGhpcywgJHByb3RvYnVmLnV0aWwudG9KU09OT3B0aW9ucyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgcmV0dXJuIE5vZGU7XG4gICAgfSkoKTtcblxuICAgIE9TTVBCRi5EZW5zZU5vZGVzID0gKGZ1bmN0aW9uKCkge1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBQcm9wZXJ0aWVzIG9mIGEgRGVuc2VOb2Rlcy5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElEZW5zZU5vZGVzXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcnxMb25nPnxudWxsfSBbaWRdIERlbnNlTm9kZXMgaWRcbiAgICAgICAgICogQHByb3BlcnR5IHtPU01QQkYuSURlbnNlSW5mb3xudWxsfSBbZGVuc2VpbmZvXSBEZW5zZU5vZGVzIGRlbnNlaW5mb1xuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxudW1iZXJ8TG9uZz58bnVsbH0gW2xhdF0gRGVuc2VOb2RlcyBsYXRcbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48bnVtYmVyfExvbmc+fG51bGx9IFtsb25dIERlbnNlTm9kZXMgbG9uXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj58bnVsbH0gW2tleXNWYWxzXSBEZW5zZU5vZGVzIGtleXNWYWxzXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IERlbnNlTm9kZXMuXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkZcbiAgICAgICAgICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIGEgRGVuc2VOb2Rlcy5cbiAgICAgICAgICogQGltcGxlbWVudHMgSURlbnNlTm9kZXNcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklEZW5zZU5vZGVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBEZW5zZU5vZGVzKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHRoaXMuaWQgPSBbXTtcbiAgICAgICAgICAgIHRoaXMubGF0ID0gW107XG4gICAgICAgICAgICB0aGlzLmxvbiA9IFtdO1xuICAgICAgICAgICAgdGhpcy5rZXlzVmFscyA9IFtdO1xuICAgICAgICAgICAgaWYgKHByb3BlcnRpZXMpXG4gICAgICAgICAgICAgICAgZm9yICh2YXIga2V5cyA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpLCBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzW2tleXNbaV1dICE9IG51bGwpXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzW2tleXNbaV1dID0gcHJvcGVydGllc1trZXlzW2ldXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZW5zZU5vZGVzIGlkLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48bnVtYmVyfExvbmc+fSBpZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlTm9kZXNcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZU5vZGVzLnByb3RvdHlwZS5pZCA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbnNlTm9kZXMgZGVuc2VpbmZvLlxuICAgICAgICAgKiBAbWVtYmVyIHtPU01QQkYuSURlbnNlSW5mb3xudWxsfHVuZGVmaW5lZH0gZGVuc2VpbmZvXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VOb2Rlc1xuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlTm9kZXMucHJvdG90eXBlLmRlbnNlaW5mbyA9IG51bGw7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlbnNlTm9kZXMgbGF0LlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48bnVtYmVyfExvbmc+fSBsYXRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZU5vZGVzXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VOb2Rlcy5wcm90b3R5cGUubGF0ID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVuc2VOb2RlcyBsb24uXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXJ8TG9uZz59IGxvblxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlTm9kZXNcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZU5vZGVzLnByb3RvdHlwZS5sb24gPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZW5zZU5vZGVzIGtleXNWYWxzLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48bnVtYmVyPn0ga2V5c1ZhbHNcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZU5vZGVzXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VOb2Rlcy5wcm90b3R5cGUua2V5c1ZhbHMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IERlbnNlTm9kZXMgaW5zdGFuY2UgdXNpbmcgdGhlIHNwZWNpZmllZCBwcm9wZXJ0aWVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gY3JlYXRlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VOb2Rlc1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklEZW5zZU5vZGVzPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuRGVuc2VOb2Rlc30gRGVuc2VOb2RlcyBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VOb2Rlcy5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEZW5zZU5vZGVzKHByb3BlcnRpZXMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgRGVuc2VOb2RlcyBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuRGVuc2VOb2Rlcy52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlTm9kZXNcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JRGVuc2VOb2Rlc30gbWVzc2FnZSBEZW5zZU5vZGVzIG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VOb2Rlcy5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICBpZiAoIXdyaXRlcilcbiAgICAgICAgICAgICAgICB3cml0ZXIgPSAkV3JpdGVyLmNyZWF0ZSgpO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWQgIT0gbnVsbCAmJiBtZXNzYWdlLmlkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMSwgd2lyZVR5cGUgMiA9Ki8xMCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5pZC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnNpbnQ2NChtZXNzYWdlLmlkW2ldKTtcbiAgICAgICAgICAgICAgICB3cml0ZXIubGRlbGltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5kZW5zZWluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiZGVuc2VpbmZvXCIpKVxuICAgICAgICAgICAgICAgICRyb290Lk9TTVBCRi5EZW5zZUluZm8uZW5jb2RlKG1lc3NhZ2UuZGVuc2VpbmZvLCB3cml0ZXIudWludDMyKC8qIGlkIDUsIHdpcmVUeXBlIDIgPSovNDIpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sYXQgIT0gbnVsbCAmJiBtZXNzYWdlLmxhdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDgsIHdpcmVUeXBlIDIgPSovNjYpLmZvcmsoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UubGF0Lmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIuc2ludDY0KG1lc3NhZ2UubGF0W2ldKTtcbiAgICAgICAgICAgICAgICB3cml0ZXIubGRlbGltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5sb24gIT0gbnVsbCAmJiBtZXNzYWdlLmxvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDksIHdpcmVUeXBlIDIgPSovNzQpLmZvcmsoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UubG9uLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIuc2ludDY0KG1lc3NhZ2UubG9uW2ldKTtcbiAgICAgICAgICAgICAgICB3cml0ZXIubGRlbGltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5rZXlzVmFscyAhPSBudWxsICYmIG1lc3NhZ2Uua2V5c1ZhbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCAxMCwgd2lyZVR5cGUgMiA9Ki84MikuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5rZXlzVmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLmludDMyKG1lc3NhZ2Uua2V5c1ZhbHNbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB3cml0ZXI7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBEZW5zZU5vZGVzIG1lc3NhZ2UsIGxlbmd0aCBkZWxpbWl0ZWQuIERvZXMgbm90IGltcGxpY2l0bHkge0BsaW5rIE9TTVBCRi5EZW5zZU5vZGVzLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VOb2Rlc1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklEZW5zZU5vZGVzfSBtZXNzYWdlIERlbnNlTm9kZXMgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZU5vZGVzLmVuY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGVuY29kZURlbGltaXRlZChtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmVuY29kZShtZXNzYWdlLCB3cml0ZXIpLmxkZWxpbSgpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgRGVuc2VOb2RlcyBtZXNzYWdlIGZyb20gdGhlIHNwZWNpZmllZCByZWFkZXIgb3IgYnVmZmVyLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZGVjb2RlXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VOb2Rlc1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkRlbnNlTm9kZXN9IERlbnNlTm9kZXNcbiAgICAgICAgICogQHRocm93cyB7RXJyb3J9IElmIHRoZSBwYXlsb2FkIGlzIG5vdCBhIHJlYWRlciBvciB2YWxpZCBidWZmZXJcbiAgICAgICAgICogQHRocm93cyB7JHByb3RvYnVmLnV0aWwuUHJvdG9jb2xFcnJvcn0gSWYgcmVxdWlyZWQgZmllbGRzIGFyZSBtaXNzaW5nXG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZU5vZGVzLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5EZW5zZU5vZGVzKCk7XG4gICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZCkge1xuICAgICAgICAgICAgICAgIHZhciB0YWcgPSByZWFkZXIudWludDMyKCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0YWcgPj4+IDMpIHtcbiAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UuaWQgJiYgbWVzc2FnZS5pZC5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pZCA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pZC5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pZC5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5kZW5zZWluZm8gPSAkcm9vdC5PU01QQkYuRGVuc2VJbmZvLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5sYXQgJiYgbWVzc2FnZS5sYXQubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGF0ID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmICgodGFnICYgNykgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmQyID0gcmVhZGVyLnVpbnQzMigpICsgcmVhZGVyLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxhdC5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sYXQucHVzaChyZWFkZXIuc2ludDY0KCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDk6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UubG9uICYmIG1lc3NhZ2UubG9uLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxvbiA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5sb24ucHVzaChyZWFkZXIuc2ludDY0KCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubG9uLnB1c2gocmVhZGVyLnNpbnQ2NCgpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAxMDpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5rZXlzVmFscyAmJiBtZXNzYWdlLmtleXNWYWxzLmxlbmd0aCkpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXNWYWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmICgodGFnICYgNykgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmQyID0gcmVhZGVyLnVpbnQzMigpICsgcmVhZGVyLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXNWYWxzLnB1c2gocmVhZGVyLmludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uua2V5c1ZhbHMucHVzaChyZWFkZXIuaW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBEZW5zZU5vZGVzIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIsIGxlbmd0aCBkZWxpbWl0ZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVEZWxpbWl0ZWRcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZU5vZGVzXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuRGVuc2VOb2Rlc30gRGVuc2VOb2Rlc1xuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlTm9kZXMuZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gbmV3ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgRGVuc2VOb2RlcyBtZXNzYWdlLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdmVyaWZ5XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuRGVuc2VOb2Rlc1xuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG1lc3NhZ2UgUGxhaW4gb2JqZWN0IHRvIHZlcmlmeVxuICAgICAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IGBudWxsYCBpZiB2YWxpZCwgb3RoZXJ3aXNlIHRoZSByZWFzb24gd2h5IGl0IGlzIG5vdFxuICAgICAgICAgKi9cbiAgICAgICAgRGVuc2VOb2Rlcy52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpZFwiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLmlkKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwiaWQ6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLmlkLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmlkW2ldKSAmJiAhKG1lc3NhZ2UuaWRbaV0gJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuaWRbaV0ubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5pZFtpXS5oaWdoKSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJpZDogaW50ZWdlcnxMb25nW10gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmRlbnNlaW5mbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJkZW5zZWluZm9cIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5PU01QQkYuRGVuc2VJbmZvLnZlcmlmeShtZXNzYWdlLmRlbnNlaW5mbyk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJkZW5zZWluZm8uXCIgKyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxhdCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsYXRcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5sYXQpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJsYXQ6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLmxhdC5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sYXRbaV0pICYmICEobWVzc2FnZS5sYXRbaV0gJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UubGF0W2ldLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UubGF0W2ldLmhpZ2gpKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcImxhdDogaW50ZWdlcnxMb25nW10gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxvbiAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJsb25cIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5sb24pKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJsb246IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLmxvbi5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5sb25baV0pICYmICEobWVzc2FnZS5sb25baV0gJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UubG9uW2ldLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UubG9uW2ldLmhpZ2gpKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcImxvbjogaW50ZWdlcnxMb25nW10gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmtleXNWYWxzICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImtleXNWYWxzXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2Uua2V5c1ZhbHMpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJrZXlzVmFsczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2Uua2V5c1ZhbHMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2Uua2V5c1ZhbHNbaV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwia2V5c1ZhbHM6IGludGVnZXJbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBEZW5zZU5vZGVzIG1lc3NhZ2UgZnJvbSBhIHBsYWluIG9iamVjdC4gQWxzbyBjb252ZXJ0cyB2YWx1ZXMgdG8gdGhlaXIgcmVzcGVjdGl2ZSBpbnRlcm5hbCB0eXBlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGZyb21PYmplY3RcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZU5vZGVzXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gb2JqZWN0IFBsYWluIG9iamVjdFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLkRlbnNlTm9kZXN9IERlbnNlTm9kZXNcbiAgICAgICAgICovXG4gICAgICAgIERlbnNlTm9kZXMuZnJvbU9iamVjdCA9IGZ1bmN0aW9uIGZyb21PYmplY3Qob2JqZWN0KSB7XG4gICAgICAgICAgICBpZiAob2JqZWN0IGluc3RhbmNlb2YgJHJvb3QuT1NNUEJGLkRlbnNlTm9kZXMpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5EZW5zZU5vZGVzKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmlkKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdC5pZCkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VOb2Rlcy5pZDogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5pZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LmlkLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLmlkW2ldID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0LmlkW2ldKSkudW5zaWduZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5pZFtpXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWRbaV0gPSBwYXJzZUludChvYmplY3QuaWRbaV0sIDEwKTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5pZFtpXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWRbaV0gPSBvYmplY3QuaWRbaV07XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWRbaV0gPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmlkW2ldID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5pZFtpXS5sb3cgPj4+IDAsIG9iamVjdC5pZFtpXS5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5kZW5zZWluZm8gIT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygb2JqZWN0LmRlbnNlaW5mbyAhPT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5EZW5zZU5vZGVzLmRlbnNlaW5mbzogb2JqZWN0IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UuZGVuc2VpbmZvID0gJHJvb3QuT1NNUEJGLkRlbnNlSW5mby5mcm9tT2JqZWN0KG9iamVjdC5kZW5zZWluZm8pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5sYXQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LmxhdCkpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VOb2Rlcy5sYXQ6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UubGF0ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QubGF0Lmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLmxhdFtpXSA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC5sYXRbaV0pKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxhdFtpXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGF0W2ldID0gcGFyc2VJbnQob2JqZWN0LmxhdFtpXSwgMTApO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxhdFtpXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubGF0W2ldID0gb2JqZWN0LmxhdFtpXTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5sYXRbaV0gPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxhdFtpXSA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QubGF0W2ldLmxvdyA+Pj4gMCwgb2JqZWN0LmxhdFtpXS5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5sb24pIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LmxvbikpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuRGVuc2VOb2Rlcy5sb246IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UubG9uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3QubG9uLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLmxvbltpXSA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC5sb25baV0pKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxvbltpXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubG9uW2ldID0gcGFyc2VJbnQob2JqZWN0LmxvbltpXSwgMTApO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmxvbltpXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubG9uW2ldID0gb2JqZWN0LmxvbltpXTtcbiAgICAgICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5sb25baV0gPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmxvbltpXSA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QubG9uW2ldLmxvdyA+Pj4gMCwgb2JqZWN0LmxvbltpXS5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5rZXlzVmFscykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3Qua2V5c1ZhbHMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLkRlbnNlTm9kZXMua2V5c1ZhbHM6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2Uua2V5c1ZhbHMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5rZXlzVmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzVmFsc1tpXSA9IG9iamVjdC5rZXlzVmFsc1tpXSB8IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWVzc2FnZTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIHBsYWluIG9iamVjdCBmcm9tIGEgRGVuc2VOb2RlcyBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b09iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLkRlbnNlTm9kZXNcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5EZW5zZU5vZGVzfSBtZXNzYWdlIERlbnNlTm9kZXNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuSUNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZU5vZGVzLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFycmF5cyB8fCBvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LmlkID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LmxhdCA9IFtdO1xuICAgICAgICAgICAgICAgIG9iamVjdC5sb24gPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3Qua2V5c1ZhbHMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKVxuICAgICAgICAgICAgICAgIG9iamVjdC5kZW5zZWluZm8gPSBudWxsO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWQgJiYgbWVzc2FnZS5pZC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QuaWQgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2UuaWQubGVuZ3RoOyArK2opXG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZS5pZFtqXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZFtqXSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmlkW2pdKSA6IG1lc3NhZ2UuaWRbal07XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZFtqXSA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/ICR1dGlsLkxvbmcucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobWVzc2FnZS5pZFtqXSkgOiBvcHRpb25zLmxvbmdzID09PSBOdW1iZXIgPyBuZXcgJHV0aWwuTG9uZ0JpdHMobWVzc2FnZS5pZFtqXS5sb3cgPj4+IDAsIG1lc3NhZ2UuaWRbal0uaGlnaCA+Pj4gMCkudG9OdW1iZXIoKSA6IG1lc3NhZ2UuaWRbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5kZW5zZWluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiZGVuc2VpbmZvXCIpKVxuICAgICAgICAgICAgICAgIG9iamVjdC5kZW5zZWluZm8gPSAkcm9vdC5PU01QQkYuRGVuc2VJbmZvLnRvT2JqZWN0KG1lc3NhZ2UuZGVuc2VpbmZvLCBvcHRpb25zKTtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxhdCAmJiBtZXNzYWdlLmxhdC5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QubGF0ID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLmxhdC5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxhdFtqXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5sYXRbal0gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5sYXRbal0pIDogbWVzc2FnZS5sYXRbal07XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5sYXRbal0gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubGF0W2pdKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxhdFtqXS5sb3cgPj4+IDAsIG1lc3NhZ2UubGF0W2pdLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmxhdFtqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmxvbiAmJiBtZXNzYWdlLmxvbi5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QubG9uID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLmxvbi5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLmxvbltqXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5sb25bal0gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5sb25bal0pIDogbWVzc2FnZS5sb25bal07XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5sb25bal0gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubG9uW2pdKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLmxvbltqXS5sb3cgPj4+IDAsIG1lc3NhZ2UubG9uW2pdLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmxvbltqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmtleXNWYWxzICYmIG1lc3NhZ2Uua2V5c1ZhbHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LmtleXNWYWxzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLmtleXNWYWxzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3Qua2V5c1ZhbHNbal0gPSBtZXNzYWdlLmtleXNWYWxzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBEZW5zZU5vZGVzIHRvIEpTT04uXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b0pTT05cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5EZW5zZU5vZGVzXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKiBAcmV0dXJucyB7T2JqZWN0LjxzdHJpbmcsKj59IEpTT04gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBEZW5zZU5vZGVzLnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gRGVuc2VOb2RlcztcbiAgICB9KSgpO1xuXG4gICAgT1NNUEJGLldheSA9IChmdW5jdGlvbigpIHtcblxuICAgICAgICAvKipcbiAgICAgICAgICogUHJvcGVydGllcyBvZiBhIFdheS5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElXYXlcbiAgICAgICAgICogQHByb3BlcnR5IHtudW1iZXJ8TG9uZ30gaWQgV2F5IGlkXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj58bnVsbH0gW2tleXNdIFdheSBrZXlzXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj58bnVsbH0gW3ZhbHNdIFdheSB2YWxzXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7T1NNUEJGLklJbmZvfG51bGx9IFtpbmZvXSBXYXkgaW5mb1xuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxudW1iZXJ8TG9uZz58bnVsbH0gW3JlZnNdIFdheSByZWZzXG4gICAgICAgICAqL1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb25zdHJ1Y3RzIGEgbmV3IFdheS5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAY2xhc3NkZXNjIFJlcHJlc2VudHMgYSBXYXkuXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElXYXlcbiAgICAgICAgICogQGNvbnN0cnVjdG9yXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklXYXk9fSBbcHJvcGVydGllc10gUHJvcGVydGllcyB0byBzZXRcbiAgICAgICAgICovXG4gICAgICAgIGZ1bmN0aW9uIFdheShwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICB0aGlzLmtleXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMudmFscyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5yZWZzID0gW107XG4gICAgICAgICAgICBpZiAocHJvcGVydGllcylcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMocHJvcGVydGllcyksIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHByb3BlcnRpZXNba2V5c1tpXV0gIT0gbnVsbClcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXNba2V5c1tpXV0gPSBwcm9wZXJ0aWVzW2tleXNbaV1dO1xuICAgICAgICB9XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFdheSBpZC5cbiAgICAgICAgICogQG1lbWJlciB7bnVtYmVyfExvbmd9IGlkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuV2F5XG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgV2F5LnByb3RvdHlwZS5pZCA9ICR1dGlsLkxvbmcgPyAkdXRpbC5Mb25nLmZyb21CaXRzKDAsMCxmYWxzZSkgOiAwO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXYXkga2V5cy5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPG51bWJlcj59IGtleXNcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5XYXlcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBXYXkucHJvdG90eXBlLmtleXMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXYXkgdmFscy5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPG51bWJlcj59IHZhbHNcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5XYXlcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBXYXkucHJvdG90eXBlLnZhbHMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBXYXkgaW5mby5cbiAgICAgICAgICogQG1lbWJlciB7T1NNUEJGLklJbmZvfG51bGx8dW5kZWZpbmVkfSBpbmZvXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuV2F5XG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgV2F5LnByb3RvdHlwZS5pbmZvID0gbnVsbDtcblxuICAgICAgICAvKipcbiAgICAgICAgICogV2F5IHJlZnMuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXJ8TG9uZz59IHJlZnNcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5XYXlcbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBXYXkucHJvdG90eXBlLnJlZnMgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDcmVhdGVzIGEgbmV3IFdheSBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBjcmVhdGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5XYXlcbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JV2F5PX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuV2F5fSBXYXkgaW5zdGFuY2VcbiAgICAgICAgICovXG4gICAgICAgIFdheS5jcmVhdGUgPSBmdW5jdGlvbiBjcmVhdGUocHJvcGVydGllcykge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBXYXkocHJvcGVydGllcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBXYXkgbWVzc2FnZS4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLldheS52ZXJpZnl8dmVyaWZ5fSBtZXNzYWdlcy5cbiAgICAgICAgICogQGZ1bmN0aW9uIGVuY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLldheVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklXYXl9IG1lc3NhZ2UgV2F5IG1lc3NhZ2Ugb3IgcGxhaW4gb2JqZWN0IHRvIGVuY29kZVxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5Xcml0ZXJ9IFt3cml0ZXJdIFdyaXRlciB0byBlbmNvZGUgdG9cbiAgICAgICAgICogQHJldHVybnMgeyRwcm90b2J1Zi5Xcml0ZXJ9IFdyaXRlclxuICAgICAgICAgKi9cbiAgICAgICAgV2F5LmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDAgPSovOCkuaW50NjQobWVzc2FnZS5pZCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5rZXlzICE9IG51bGwgJiYgbWVzc2FnZS5rZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgMiA9Ki8xOCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5rZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKG1lc3NhZ2Uua2V5c1tpXSk7XG4gICAgICAgICAgICAgICAgd3JpdGVyLmxkZWxpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudmFscyAhPSBudWxsICYmIG1lc3NhZ2UudmFscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDMsIHdpcmVUeXBlIDIgPSovMjYpLmZvcmsoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMihtZXNzYWdlLnZhbHNbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaW5mb1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC5PU01QQkYuSW5mby5lbmNvZGUobWVzc2FnZS5pbmZvLCB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDIgPSovMzQpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yZWZzICE9IG51bGwgJiYgbWVzc2FnZS5yZWZzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgOCwgd2lyZVR5cGUgMiA9Ki82NikuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5yZWZzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIuc2ludDY0KG1lc3NhZ2UucmVmc1tpXSk7XG4gICAgICAgICAgICAgICAgd3JpdGVyLmxkZWxpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHdyaXRlcjtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRW5jb2RlcyB0aGUgc3BlY2lmaWVkIFdheSBtZXNzYWdlLCBsZW5ndGggZGVsaW1pdGVkLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuV2F5LnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuV2F5XG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVdheX0gbWVzc2FnZSBXYXkgbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBXYXkuZW5jb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkKG1lc3NhZ2UsIHdyaXRlcikge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuZW5jb2RlKG1lc3NhZ2UsIHdyaXRlcikubGRlbGltKCk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBXYXkgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlci5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLldheVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLldheX0gV2F5XG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgV2F5LmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5XYXkoKTtcbiAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kKSB7XG4gICAgICAgICAgICAgICAgdmFyIHRhZyA9IHJlYWRlci51aW50MzIoKTtcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRhZyA+Pj4gMykge1xuICAgICAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pZCA9IHJlYWRlci5pbnQ2NCgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2Uua2V5cyAmJiBtZXNzYWdlLmtleXMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uua2V5cyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzLnB1c2gocmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXMucHVzaChyZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UudmFscyAmJiBtZXNzYWdlLnZhbHMubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS52YWxzLnB1c2gocmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnZhbHMucHVzaChyZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaW5mbyA9ICRyb290Lk9TTVBCRi5JbmZvLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgODpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5yZWZzICYmIG1lc3NhZ2UucmVmcy5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yZWZzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmICgodGFnICYgNykgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmQyID0gcmVhZGVyLnVpbnQzMigpICsgcmVhZGVyLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJlZnMucHVzaChyZWFkZXIuc2ludDY0KCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVmcy5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIHJlYWRlci5za2lwVHlwZSh0YWcgJiA3KTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaWRcIikpXG4gICAgICAgICAgICAgICAgdGhyb3cgJHV0aWwuUHJvdG9jb2xFcnJvcihcIm1pc3NpbmcgcmVxdWlyZWQgJ2lkJ1wiLCB7IGluc3RhbmNlOiBtZXNzYWdlIH0pO1xuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIERlY29kZXMgYSBXYXkgbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLldheVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLldheX0gV2F5XG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgV2F5LmRlY29kZURlbGltaXRlZCA9IGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZChyZWFkZXIpIHtcbiAgICAgICAgICAgIGlmICghKHJlYWRlciBpbnN0YW5jZW9mICRSZWFkZXIpKVxuICAgICAgICAgICAgICAgIHJlYWRlciA9IG5ldyAkUmVhZGVyKHJlYWRlcik7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5kZWNvZGUocmVhZGVyLCByZWFkZXIudWludDMyKCkpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBWZXJpZmllcyBhIFdheSBtZXNzYWdlLlxuICAgICAgICAgKiBAZnVuY3Rpb24gdmVyaWZ5XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuV2F5XG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAqL1xuICAgICAgICBXYXkudmVyaWZ5ID0gZnVuY3Rpb24gdmVyaWZ5KG1lc3NhZ2UpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgbWVzc2FnZSAhPT0gXCJvYmplY3RcIiB8fCBtZXNzYWdlID09PSBudWxsKVxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9iamVjdCBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5pZCkgJiYgIShtZXNzYWdlLmlkICYmICR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmlkLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuaWQuaGlnaCkpKVxuICAgICAgICAgICAgICAgIHJldHVybiBcImlkOiBpbnRlZ2VyfExvbmcgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmtleXMgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwia2V5c1wiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLmtleXMpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJrZXlzOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5rZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmtleXNbaV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwia2V5czogaW50ZWdlcltdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52YWxzICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInZhbHNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS52YWxzKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmFsczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS52YWxzW2ldKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBcInZhbHM6IGludGVnZXJbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaW5mbyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpbmZvXCIpKSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gJHJvb3QuT1NNUEJGLkluZm8udmVyaWZ5KG1lc3NhZ2UuaW5mbyk7XG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJpbmZvLlwiICsgZXJyb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yZWZzICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInJlZnNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS5yZWZzKSlcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicmVmczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UucmVmcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5yZWZzW2ldKSAmJiAhKG1lc3NhZ2UucmVmc1tpXSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5yZWZzW2ldLmxvdykgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UucmVmc1tpXS5oaWdoKSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyZWZzOiBpbnRlZ2VyfExvbmdbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBXYXkgbWVzc2FnZSBmcm9tIGEgcGxhaW4gb2JqZWN0LiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byB0aGVpciByZXNwZWN0aXZlIGludGVybmFsIHR5cGVzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZnJvbU9iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLldheVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IG9iamVjdCBQbGFpbiBvYmplY3RcbiAgICAgICAgICogQHJldHVybnMge09TTVBCRi5XYXl9IFdheVxuICAgICAgICAgKi9cbiAgICAgICAgV2F5LmZyb21PYmplY3QgPSBmdW5jdGlvbiBmcm9tT2JqZWN0KG9iamVjdCkge1xuICAgICAgICAgICAgaWYgKG9iamVjdCBpbnN0YW5jZW9mICRyb290Lk9TTVBCRi5XYXkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5XYXkoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3QuaWQgIT0gbnVsbClcbiAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UuaWQgPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QuaWQpKS51bnNpZ25lZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBwYXJzZUludChvYmplY3QuaWQsIDEwKTtcbiAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LmlkID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmlkID0gb2JqZWN0LmlkO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LmlkLmxvdyA+Pj4gMCwgb2JqZWN0LmlkLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICBpZiAob2JqZWN0LmtleXMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LmtleXMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLldheS5rZXlzOiBhcnJheSBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5rZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXNbaV0gPSBvYmplY3Qua2V5c1tpXSA+Pj4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QudmFscykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3QudmFscykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuV2F5LnZhbHM6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnZhbHMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFsc1tpXSA9IG9iamVjdC52YWxzW2ldID4+PiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5pbmZvICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5pbmZvICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLldheS5pbmZvOiBvYmplY3QgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5pbmZvID0gJHJvb3QuT1NNUEJGLkluZm8uZnJvbU9iamVjdChvYmplY3QuaW5mbyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LnJlZnMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LnJlZnMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLldheS5yZWZzOiBhcnJheSBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLnJlZnMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5yZWZzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoJHV0aWwuTG9uZylcbiAgICAgICAgICAgICAgICAgICAgICAgIChtZXNzYWdlLnJlZnNbaV0gPSAkdXRpbC5Mb25nLmZyb21WYWx1ZShvYmplY3QucmVmc1tpXSkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QucmVmc1tpXSA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVmc1tpXSA9IHBhcnNlSW50KG9iamVjdC5yZWZzW2ldLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QucmVmc1tpXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UucmVmc1tpXSA9IG9iamVjdC5yZWZzW2ldO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0LnJlZnNbaV0gPT09IFwib2JqZWN0XCIpXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJlZnNbaV0gPSBuZXcgJHV0aWwuTG9uZ0JpdHMob2JqZWN0LnJlZnNbaV0ubG93ID4+PiAwLCBvYmplY3QucmVmc1tpXS5oaWdoID4+PiAwKS50b051bWJlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFdheSBtZXNzYWdlLiBBbHNvIGNvbnZlcnRzIHZhbHVlcyB0byBvdGhlciB0eXBlcyBpZiBzcGVjaWZpZWQuXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b09iamVjdFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLldheVxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLldheX0gbWVzc2FnZSBXYXlcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuSUNvbnZlcnNpb25PcHRpb25zfSBbb3B0aW9uc10gQ29udmVyc2lvbiBvcHRpb25zXG4gICAgICAgICAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gUGxhaW4gb2JqZWN0XG4gICAgICAgICAqL1xuICAgICAgICBXYXkudG9PYmplY3QgPSBmdW5jdGlvbiB0b09iamVjdChtZXNzYWdlLCBvcHRpb25zKSB7XG4gICAgICAgICAgICBpZiAoIW9wdGlvbnMpXG4gICAgICAgICAgICAgICAgb3B0aW9ucyA9IHt9O1xuICAgICAgICAgICAgdmFyIG9iamVjdCA9IHt9O1xuICAgICAgICAgICAgaWYgKG9wdGlvbnMuYXJyYXlzIHx8IG9wdGlvbnMuZGVmYXVsdHMpIHtcbiAgICAgICAgICAgICAgICBvYmplY3Qua2V5cyA9IFtdO1xuICAgICAgICAgICAgICAgIG9iamVjdC52YWxzID0gW107XG4gICAgICAgICAgICAgICAgb2JqZWN0LnJlZnMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBuZXcgJHV0aWwuTG9uZygwLCAwLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IGxvbmcudG9TdHJpbmcoKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IGxvbmcudG9OdW1iZXIoKSA6IGxvbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgICAgICBvYmplY3QuaW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpZFwiKSlcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuaWQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmlkKSA6IG1lc3NhZ2UuaWQ7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuaWQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UuaWQpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbmV3ICR1dGlsLkxvbmdCaXRzKG1lc3NhZ2UuaWQubG93ID4+PiAwLCBtZXNzYWdlLmlkLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmlkO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uua2V5cyAmJiBtZXNzYWdlLmtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LmtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2Uua2V5cy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmtleXNbal0gPSBtZXNzYWdlLmtleXNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52YWxzICYmIG1lc3NhZ2UudmFscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS52YWxzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudmFsc1tqXSA9IG1lc3NhZ2UudmFsc1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaW5mb1wiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuaW5mbyA9ICRyb290Lk9TTVBCRi5JbmZvLnRvT2JqZWN0KG1lc3NhZ2UuaW5mbywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yZWZzICYmIG1lc3NhZ2UucmVmcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QucmVmcyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5yZWZzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UucmVmc1tqXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5yZWZzW2pdID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gU3RyaW5nKG1lc3NhZ2UucmVmc1tqXSkgOiBtZXNzYWdlLnJlZnNbal07XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5yZWZzW2pdID0gb3B0aW9ucy5sb25ncyA9PT0gU3RyaW5nID8gJHV0aWwuTG9uZy5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChtZXNzYWdlLnJlZnNbal0pIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbmV3ICR1dGlsLkxvbmdCaXRzKG1lc3NhZ2UucmVmc1tqXS5sb3cgPj4+IDAsIG1lc3NhZ2UucmVmc1tqXS5oaWdoID4+PiAwKS50b051bWJlcigpIDogbWVzc2FnZS5yZWZzW2pdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ29udmVydHMgdGhpcyBXYXkgdG8gSlNPTi5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvSlNPTlxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLldheVxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgV2F5LnByb3RvdHlwZS50b0pTT04gPSBmdW5jdGlvbiB0b0pTT04oKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb25zdHJ1Y3Rvci50b09iamVjdCh0aGlzLCAkcHJvdG9idWYudXRpbC50b0pTT05PcHRpb25zKTtcbiAgICAgICAgfTtcblxuICAgICAgICByZXR1cm4gV2F5O1xuICAgIH0pKCk7XG5cbiAgICBPU01QQkYuUmVsYXRpb24gPSAoZnVuY3Rpb24oKSB7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFByb3BlcnRpZXMgb2YgYSBSZWxhdGlvbi5cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRlxuICAgICAgICAgKiBAaW50ZXJmYWNlIElSZWxhdGlvblxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcnxMb25nfSBpZCBSZWxhdGlvbiBpZFxuICAgICAgICAgKiBAcHJvcGVydHkge0FycmF5LjxudW1iZXI+fG51bGx9IFtrZXlzXSBSZWxhdGlvbiBrZXlzXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcj58bnVsbH0gW3ZhbHNdIFJlbGF0aW9uIHZhbHNcbiAgICAgICAgICogQHByb3BlcnR5IHtPU01QQkYuSUluZm98bnVsbH0gW2luZm9dIFJlbGF0aW9uIGluZm9cbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48bnVtYmVyPnxudWxsfSBbcm9sZXNTaWRdIFJlbGF0aW9uIHJvbGVzU2lkXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7QXJyYXkuPG51bWJlcnxMb25nPnxudWxsfSBbbWVtaWRzXSBSZWxhdGlvbiBtZW1pZHNcbiAgICAgICAgICogQHByb3BlcnR5IHtBcnJheS48T1NNUEJGLlJlbGF0aW9uLk1lbWJlclR5cGU+fG51bGx9IFt0eXBlc10gUmVsYXRpb24gdHlwZXNcbiAgICAgICAgICovXG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENvbnN0cnVjdHMgYSBuZXcgUmVsYXRpb24uXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkZcbiAgICAgICAgICogQGNsYXNzZGVzYyBSZXByZXNlbnRzIGEgUmVsYXRpb24uXG4gICAgICAgICAqIEBpbXBsZW1lbnRzIElSZWxhdGlvblxuICAgICAgICAgKiBAY29uc3RydWN0b3JcbiAgICAgICAgICogQHBhcmFtIHtPU01QQkYuSVJlbGF0aW9uPX0gW3Byb3BlcnRpZXNdIFByb3BlcnRpZXMgdG8gc2V0XG4gICAgICAgICAqL1xuICAgICAgICBmdW5jdGlvbiBSZWxhdGlvbihwcm9wZXJ0aWVzKSB7XG4gICAgICAgICAgICB0aGlzLmtleXMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMudmFscyA9IFtdO1xuICAgICAgICAgICAgdGhpcy5yb2xlc1NpZCA9IFtdO1xuICAgICAgICAgICAgdGhpcy5tZW1pZHMgPSBbXTtcbiAgICAgICAgICAgIHRoaXMudHlwZXMgPSBbXTtcbiAgICAgICAgICAgIGlmIChwcm9wZXJ0aWVzKVxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXMgPSBPYmplY3Qua2V5cyhwcm9wZXJ0aWVzKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAocHJvcGVydGllc1trZXlzW2ldXSAhPSBudWxsKVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpc1trZXlzW2ldXSA9IHByb3BlcnRpZXNba2V5c1tpXV07XG4gICAgICAgIH1cblxuICAgICAgICAvKipcbiAgICAgICAgICogUmVsYXRpb24gaWQuXG4gICAgICAgICAqIEBtZW1iZXIge251bWJlcnxMb25nfSBpZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlJlbGF0aW9uXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24ucHJvdG90eXBlLmlkID0gJHV0aWwuTG9uZyA/ICR1dGlsLkxvbmcuZnJvbUJpdHMoMCwwLGZhbHNlKSA6IDA7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbGF0aW9uIGtleXMuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXI+fSBrZXlzXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUmVsYXRpb25cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi5wcm90b3R5cGUua2V5cyA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbGF0aW9uIHZhbHMuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXI+fSB2YWxzXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUmVsYXRpb25cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi5wcm90b3R5cGUudmFscyA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbGF0aW9uIGluZm8uXG4gICAgICAgICAqIEBtZW1iZXIge09TTVBCRi5JSW5mb3xudWxsfHVuZGVmaW5lZH0gaW5mb1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlJlbGF0aW9uXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24ucHJvdG90eXBlLmluZm8gPSBudWxsO1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWxhdGlvbiByb2xlc1NpZC5cbiAgICAgICAgICogQG1lbWJlciB7QXJyYXkuPG51bWJlcj59IHJvbGVzU2lkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUmVsYXRpb25cbiAgICAgICAgICogQGluc3RhbmNlXG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi5wcm90b3R5cGUucm9sZXNTaWQgPSAkdXRpbC5lbXB0eUFycmF5O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBSZWxhdGlvbiBtZW1pZHMuXG4gICAgICAgICAqIEBtZW1iZXIge0FycmF5LjxudW1iZXJ8TG9uZz59IG1lbWlkc1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlJlbGF0aW9uXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24ucHJvdG90eXBlLm1lbWlkcyA9ICR1dGlsLmVtcHR5QXJyYXk7XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFJlbGF0aW9uIHR5cGVzLlxuICAgICAgICAgKiBAbWVtYmVyIHtBcnJheS48T1NNUEJGLlJlbGF0aW9uLk1lbWJlclR5cGU+fSB0eXBlc1xuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlJlbGF0aW9uXG4gICAgICAgICAqIEBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24ucHJvdG90eXBlLnR5cGVzID0gJHV0aWwuZW1wdHlBcnJheTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogQ3JlYXRlcyBhIG5ldyBSZWxhdGlvbiBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIHByb3BlcnRpZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBjcmVhdGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5SZWxhdGlvblxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklSZWxhdGlvbj19IFtwcm9wZXJ0aWVzXSBQcm9wZXJ0aWVzIHRvIHNldFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlJlbGF0aW9ufSBSZWxhdGlvbiBpbnN0YW5jZVxuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24uY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlKHByb3BlcnRpZXMpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVsYXRpb24ocHJvcGVydGllcyk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIEVuY29kZXMgdGhlIHNwZWNpZmllZCBSZWxhdGlvbiBtZXNzYWdlLiBEb2VzIG5vdCBpbXBsaWNpdGx5IHtAbGluayBPU01QQkYuUmVsYXRpb24udmVyaWZ5fHZlcmlmeX0gbWVzc2FnZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBlbmNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5SZWxhdGlvblxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7T1NNUEJGLklSZWxhdGlvbn0gbWVzc2FnZSBSZWxhdGlvbiBtZXNzYWdlIG9yIHBsYWluIG9iamVjdCB0byBlbmNvZGVcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuV3JpdGVyfSBbd3JpdGVyXSBXcml0ZXIgdG8gZW5jb2RlIHRvXG4gICAgICAgICAqIEByZXR1cm5zIHskcHJvdG9idWYuV3JpdGVyfSBXcml0ZXJcbiAgICAgICAgICovXG4gICAgICAgIFJlbGF0aW9uLmVuY29kZSA9IGZ1bmN0aW9uIGVuY29kZShtZXNzYWdlLCB3cml0ZXIpIHtcbiAgICAgICAgICAgIGlmICghd3JpdGVyKVxuICAgICAgICAgICAgICAgIHdyaXRlciA9ICRXcml0ZXIuY3JlYXRlKCk7XG4gICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDEsIHdpcmVUeXBlIDAgPSovOCkuaW50NjQobWVzc2FnZS5pZCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5rZXlzICE9IG51bGwgJiYgbWVzc2FnZS5rZXlzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMiwgd2lyZVR5cGUgMiA9Ki8xOCkuZm9yaygpO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS5rZXlzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKG1lc3NhZ2Uua2V5c1tpXSk7XG4gICAgICAgICAgICAgICAgd3JpdGVyLmxkZWxpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudmFscyAhPSBudWxsICYmIG1lc3NhZ2UudmFscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICB3cml0ZXIudWludDMyKC8qIGlkIDMsIHdpcmVUeXBlIDIgPSovMjYpLmZvcmsoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudmFscy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMihtZXNzYWdlLnZhbHNbaV0pO1xuICAgICAgICAgICAgICAgIHdyaXRlci5sZGVsaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaW5mb1wiKSlcbiAgICAgICAgICAgICAgICAkcm9vdC5PU01QQkYuSW5mby5lbmNvZGUobWVzc2FnZS5pbmZvLCB3cml0ZXIudWludDMyKC8qIGlkIDQsIHdpcmVUeXBlIDIgPSovMzQpLmZvcmsoKSkubGRlbGltKCk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yb2xlc1NpZCAhPSBudWxsICYmIG1lc3NhZ2Uucm9sZXNTaWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCA4LCB3aXJlVHlwZSAyID0qLzY2KS5mb3JrKCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLnJvbGVzU2lkLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICB3cml0ZXIuaW50MzIobWVzc2FnZS5yb2xlc1NpZFtpXSk7XG4gICAgICAgICAgICAgICAgd3JpdGVyLmxkZWxpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UubWVtaWRzICE9IG51bGwgJiYgbWVzc2FnZS5tZW1pZHMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgd3JpdGVyLnVpbnQzMigvKiBpZCA5LCB3aXJlVHlwZSAyID0qLzc0KS5mb3JrKCk7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLm1lbWlkcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVyLnNpbnQ2NChtZXNzYWdlLm1lbWlkc1tpXSk7XG4gICAgICAgICAgICAgICAgd3JpdGVyLmxkZWxpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZXMgIT0gbnVsbCAmJiBtZXNzYWdlLnR5cGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIHdyaXRlci51aW50MzIoLyogaWQgMTAsIHdpcmVUeXBlIDIgPSovODIpLmZvcmsoKTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UudHlwZXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlci5pbnQzMihtZXNzYWdlLnR5cGVzW2ldKTtcbiAgICAgICAgICAgICAgICB3cml0ZXIubGRlbGltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gd3JpdGVyO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBFbmNvZGVzIHRoZSBzcGVjaWZpZWQgUmVsYXRpb24gbWVzc2FnZSwgbGVuZ3RoIGRlbGltaXRlZC4gRG9lcyBub3QgaW1wbGljaXRseSB7QGxpbmsgT1NNUEJGLlJlbGF0aW9uLnZlcmlmeXx2ZXJpZnl9IG1lc3NhZ2VzLlxuICAgICAgICAgKiBAZnVuY3Rpb24gZW5jb2RlRGVsaW1pdGVkXG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUmVsYXRpb25cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5JUmVsYXRpb259IG1lc3NhZ2UgUmVsYXRpb24gbWVzc2FnZSBvciBwbGFpbiBvYmplY3QgdG8gZW5jb2RlXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLldyaXRlcn0gW3dyaXRlcl0gV3JpdGVyIHRvIGVuY29kZSB0b1xuICAgICAgICAgKiBAcmV0dXJucyB7JHByb3RvYnVmLldyaXRlcn0gV3JpdGVyXG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi5lbmNvZGVEZWxpbWl0ZWQgPSBmdW5jdGlvbiBlbmNvZGVEZWxpbWl0ZWQobWVzc2FnZSwgd3JpdGVyKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGUobWVzc2FnZSwgd3JpdGVyKS5sZGVsaW0oKTtcbiAgICAgICAgfTtcblxuICAgICAgICAvKipcbiAgICAgICAgICogRGVjb2RlcyBhIFJlbGF0aW9uIG1lc3NhZ2UgZnJvbSB0aGUgc3BlY2lmaWVkIHJlYWRlciBvciBidWZmZXIuXG4gICAgICAgICAqIEBmdW5jdGlvbiBkZWNvZGVcbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5SZWxhdGlvblxuICAgICAgICAgKiBAc3RhdGljXG4gICAgICAgICAqIEBwYXJhbSB7JHByb3RvYnVmLlJlYWRlcnxVaW50OEFycmF5fSByZWFkZXIgUmVhZGVyIG9yIGJ1ZmZlciB0byBkZWNvZGUgZnJvbVxuICAgICAgICAgKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTWVzc2FnZSBsZW5ndGggaWYga25vd24gYmVmb3JlaGFuZFxuICAgICAgICAgKiBAcmV0dXJucyB7T1NNUEJGLlJlbGF0aW9ufSBSZWxhdGlvblxuICAgICAgICAgKiBAdGhyb3dzIHtFcnJvcn0gSWYgdGhlIHBheWxvYWQgaXMgbm90IGEgcmVhZGVyIG9yIHZhbGlkIGJ1ZmZlclxuICAgICAgICAgKiBAdGhyb3dzIHskcHJvdG9idWYudXRpbC5Qcm90b2NvbEVycm9yfSBJZiByZXF1aXJlZCBmaWVsZHMgYXJlIG1pc3NpbmdcbiAgICAgICAgICovXG4gICAgICAgIFJlbGF0aW9uLmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShyZWFkZXIsIGxlbmd0aCkge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gJFJlYWRlci5jcmVhdGUocmVhZGVyKTtcbiAgICAgICAgICAgIHZhciBlbmQgPSBsZW5ndGggPT09IHVuZGVmaW5lZCA/IHJlYWRlci5sZW4gOiByZWFkZXIucG9zICsgbGVuZ3RoLCBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5SZWxhdGlvbigpO1xuICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQpIHtcbiAgICAgICAgICAgICAgICB2YXIgdGFnID0gcmVhZGVyLnVpbnQzMigpO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodGFnID4+PiAzKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmlkID0gcmVhZGVyLmludDY0KCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS5rZXlzICYmIG1lc3NhZ2Uua2V5cy5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmICgodGFnICYgNykgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmQyID0gcmVhZGVyLnVpbnQzMigpICsgcmVhZGVyLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmtleXMucHVzaChyZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uua2V5cy5wdXNoKHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKCEobWVzc2FnZS52YWxzICYmIG1lc3NhZ2UudmFscy5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS52YWxzID0gW107XG4gICAgICAgICAgICAgICAgICAgIGlmICgodGFnICYgNykgPT09IDIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBlbmQyID0gcmVhZGVyLnVpbnQzMigpICsgcmVhZGVyLnBvcztcbiAgICAgICAgICAgICAgICAgICAgICAgIHdoaWxlIChyZWFkZXIucG9zIDwgZW5kMilcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnZhbHMucHVzaChyZWFkZXIudWludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFscy5wdXNoKHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pbmZvID0gJHJvb3QuT1NNUEJGLkluZm8uZGVjb2RlKHJlYWRlciwgcmVhZGVyLnVpbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA4OlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLnJvbGVzU2lkICYmIG1lc3NhZ2Uucm9sZXNTaWQubGVuZ3RoKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uucm9sZXNTaWQgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0YWcgJiA3KSA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZDIgPSByZWFkZXIudWludDMyKCkgKyByZWFkZXIucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2Uucm9sZXNTaWQucHVzaChyZWFkZXIuaW50MzIoKSk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5yb2xlc1NpZC5wdXNoKHJlYWRlci5pbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA5OlxuICAgICAgICAgICAgICAgICAgICBpZiAoIShtZXNzYWdlLm1lbWlkcyAmJiBtZXNzYWdlLm1lbWlkcy5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5tZW1pZHMgPSBbXTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCh0YWcgJiA3KSA9PT0gMikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVuZDIgPSByZWFkZXIudWludDMyKCkgKyByZWFkZXIucG9zO1xuICAgICAgICAgICAgICAgICAgICAgICAgd2hpbGUgKHJlYWRlci5wb3MgPCBlbmQyKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubWVtaWRzLnB1c2gocmVhZGVyLnNpbnQ2NCgpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLm1lbWlkcy5wdXNoKHJlYWRlci5zaW50NjQoKSk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgMTA6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKG1lc3NhZ2UudHlwZXMgJiYgbWVzc2FnZS50eXBlcy5sZW5ndGgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50eXBlcyA9IFtdO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKHRhZyAmIDcpID09PSAyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgZW5kMiA9IHJlYWRlci51aW50MzIoKSArIHJlYWRlci5wb3M7XG4gICAgICAgICAgICAgICAgICAgICAgICB3aGlsZSAocmVhZGVyLnBvcyA8IGVuZDIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50eXBlcy5wdXNoKHJlYWRlci5pbnQzMigpKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnR5cGVzLnB1c2gocmVhZGVyLmludDMyKCkpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZWFkZXIuc2tpcFR5cGUodGFnICYgNyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImlkXCIpKVxuICAgICAgICAgICAgICAgIHRocm93ICR1dGlsLlByb3RvY29sRXJyb3IoXCJtaXNzaW5nIHJlcXVpcmVkICdpZCdcIiwgeyBpbnN0YW5jZTogbWVzc2FnZSB9KTtcbiAgICAgICAgICAgIHJldHVybiBtZXNzYWdlO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBEZWNvZGVzIGEgUmVsYXRpb24gbWVzc2FnZSBmcm9tIHRoZSBzcGVjaWZpZWQgcmVhZGVyIG9yIGJ1ZmZlciwgbGVuZ3RoIGRlbGltaXRlZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIGRlY29kZURlbGltaXRlZFxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlJlbGF0aW9uXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHskcHJvdG9idWYuUmVhZGVyfFVpbnQ4QXJyYXl9IHJlYWRlciBSZWFkZXIgb3IgYnVmZmVyIHRvIGRlY29kZSBmcm9tXG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuUmVsYXRpb259IFJlbGF0aW9uXG4gICAgICAgICAqIEB0aHJvd3Mge0Vycm9yfSBJZiB0aGUgcGF5bG9hZCBpcyBub3QgYSByZWFkZXIgb3IgdmFsaWQgYnVmZmVyXG4gICAgICAgICAqIEB0aHJvd3MgeyRwcm90b2J1Zi51dGlsLlByb3RvY29sRXJyb3J9IElmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24uZGVjb2RlRGVsaW1pdGVkID0gZnVuY3Rpb24gZGVjb2RlRGVsaW1pdGVkKHJlYWRlcikge1xuICAgICAgICAgICAgaWYgKCEocmVhZGVyIGluc3RhbmNlb2YgJFJlYWRlcikpXG4gICAgICAgICAgICAgICAgcmVhZGVyID0gbmV3ICRSZWFkZXIocmVhZGVyKTtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmRlY29kZShyZWFkZXIsIHJlYWRlci51aW50MzIoKSk7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIFZlcmlmaWVzIGEgUmVsYXRpb24gbWVzc2FnZS5cbiAgICAgICAgICogQGZ1bmN0aW9uIHZlcmlmeVxuICAgICAgICAgKiBAbWVtYmVyb2YgT1NNUEJGLlJlbGF0aW9uXG4gICAgICAgICAqIEBzdGF0aWNcbiAgICAgICAgICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gbWVzc2FnZSBQbGFpbiBvYmplY3QgdG8gdmVyaWZ5XG4gICAgICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gYG51bGxgIGlmIHZhbGlkLCBvdGhlcndpc2UgdGhlIHJlYXNvbiB3aHkgaXQgaXMgbm90XG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi52ZXJpZnkgPSBmdW5jdGlvbiB2ZXJpZnkobWVzc2FnZSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlICE9PSBcIm9iamVjdFwiIHx8IG1lc3NhZ2UgPT09IG51bGwpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2JqZWN0IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLmlkKSAmJiAhKG1lc3NhZ2UuaWQgJiYgJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2UuaWQubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5pZC5oaWdoKSkpXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiaWQ6IGludGVnZXJ8TG9uZyBleHBlY3RlZFwiO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uua2V5cyAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJrZXlzXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2Uua2V5cykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcImtleXM6IGFycmF5IGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtZXNzYWdlLmtleXMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2Uua2V5c1tpXSkpXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJrZXlzOiBpbnRlZ2VyW10gZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnZhbHMgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidmFsc1wiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLnZhbHMpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ2YWxzOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS52YWxzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLnZhbHNbaV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwidmFsczogaW50ZWdlcltdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pbmZvICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcImluZm9cIikpIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3IgPSAkcm9vdC5PU01QQkYuSW5mby52ZXJpZnkobWVzc2FnZS5pbmZvKTtcbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcImluZm8uXCIgKyBlcnJvcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnJvbGVzU2lkICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcInJvbGVzU2lkXCIpKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG1lc3NhZ2Uucm9sZXNTaWQpKVxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJyb2xlc1NpZDogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2Uucm9sZXNTaWQubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICghJHV0aWwuaXNJbnRlZ2VyKG1lc3NhZ2Uucm9sZXNTaWRbaV0pKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwicm9sZXNTaWQ6IGludGVnZXJbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UubWVtaWRzICE9IG51bGwgJiYgbWVzc2FnZS5oYXNPd25Qcm9wZXJ0eShcIm1lbWlkc1wiKSkge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShtZXNzYWdlLm1lbWlkcykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcIm1lbWlkczogYXJyYXkgZXhwZWN0ZWRcIjtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1lc3NhZ2UubWVtaWRzLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBpZiAoISR1dGlsLmlzSW50ZWdlcihtZXNzYWdlLm1lbWlkc1tpXSkgJiYgIShtZXNzYWdlLm1lbWlkc1tpXSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5tZW1pZHNbaV0ubG93KSAmJiAkdXRpbC5pc0ludGVnZXIobWVzc2FnZS5tZW1pZHNbaV0uaGlnaCkpKVxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFwibWVtaWRzOiBpbnRlZ2VyfExvbmdbXSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UudHlwZXMgIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwidHlwZXNcIikpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkobWVzc2FnZS50eXBlcykpXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBcInR5cGVzOiBhcnJheSBleHBlY3RlZFwiO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbWVzc2FnZS50eXBlcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLnR5cGVzW2ldKSB7XG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gXCJ0eXBlczogZW51bSB2YWx1ZVtdIGV4cGVjdGVkXCI7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBSZWxhdGlvbiBtZXNzYWdlIGZyb20gYSBwbGFpbiBvYmplY3QuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIHRoZWlyIHJlc3BlY3RpdmUgaW50ZXJuYWwgdHlwZXMuXG4gICAgICAgICAqIEBmdW5jdGlvbiBmcm9tT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUmVsYXRpb25cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09iamVjdC48c3RyaW5nLCo+fSBvYmplY3QgUGxhaW4gb2JqZWN0XG4gICAgICAgICAqIEByZXR1cm5zIHtPU01QQkYuUmVsYXRpb259IFJlbGF0aW9uXG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi5mcm9tT2JqZWN0ID0gZnVuY3Rpb24gZnJvbU9iamVjdChvYmplY3QpIHtcbiAgICAgICAgICAgIGlmIChvYmplY3QgaW5zdGFuY2VvZiAkcm9vdC5PU01QQkYuUmVsYXRpb24pXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9iamVjdDtcbiAgICAgICAgICAgIHZhciBtZXNzYWdlID0gbmV3ICRyb290Lk9TTVBCRi5SZWxhdGlvbigpO1xuICAgICAgICAgICAgaWYgKG9iamVjdC5pZCAhPSBudWxsKVxuICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKVxuICAgICAgICAgICAgICAgICAgICAobWVzc2FnZS5pZCA9ICR1dGlsLkxvbmcuZnJvbVZhbHVlKG9iamVjdC5pZCkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5pZCA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pZCA9IHBhcnNlSW50KG9iamVjdC5pZCwgMTApO1xuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QuaWQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuaWQgPSBvYmplY3QuaWQ7XG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodHlwZW9mIG9iamVjdC5pZCA9PT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5pZCA9IG5ldyAkdXRpbC5Mb25nQml0cyhvYmplY3QuaWQubG93ID4+PiAwLCBvYmplY3QuaWQuaGlnaCA+Pj4gMCkudG9OdW1iZXIoKTtcbiAgICAgICAgICAgIGlmIChvYmplY3Qua2V5cykge1xuICAgICAgICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShvYmplY3Qua2V5cykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuUmVsYXRpb24ua2V5czogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvYmplY3Qua2V5cy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5rZXlzW2ldID0gb2JqZWN0LmtleXNbaV0gPj4+IDA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LnZhbHMpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LnZhbHMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLlJlbGF0aW9uLnZhbHM6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnZhbHMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UudmFsc1tpXSA9IG9iamVjdC52YWxzW2ldID4+PiAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKG9iamVjdC5pbmZvICE9IG51bGwpIHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG9iamVjdC5pbmZvICE9PSBcIm9iamVjdFwiKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLlJlbGF0aW9uLmluZm86IG9iamVjdCBleHBlY3RlZFwiKTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlLmluZm8gPSAkcm9vdC5PU01QQkYuSW5mby5mcm9tT2JqZWN0KG9iamVjdC5pbmZvKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3Qucm9sZXNTaWQpIHtcbiAgICAgICAgICAgICAgICBpZiAoIUFycmF5LmlzQXJyYXkob2JqZWN0LnJvbGVzU2lkKSlcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwiLk9TTVBCRi5SZWxhdGlvbi5yb2xlc1NpZDogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5yb2xlc1NpZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb2JqZWN0LnJvbGVzU2lkLmxlbmd0aDsgKytpKVxuICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnJvbGVzU2lkW2ldID0gb2JqZWN0LnJvbGVzU2lkW2ldIHwgMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvYmplY3QubWVtaWRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdC5tZW1pZHMpKVxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCIuT1NNUEJGLlJlbGF0aW9uLm1lbWlkczogYXJyYXkgZXhwZWN0ZWRcIik7XG4gICAgICAgICAgICAgICAgbWVzc2FnZS5tZW1pZHMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC5tZW1pZHMubGVuZ3RoOyArK2kpXG4gICAgICAgICAgICAgICAgICAgIGlmICgkdXRpbC5Mb25nKVxuICAgICAgICAgICAgICAgICAgICAgICAgKG1lc3NhZ2UubWVtaWRzW2ldID0gJHV0aWwuTG9uZy5mcm9tVmFsdWUob2JqZWN0Lm1lbWlkc1tpXSkpLnVuc2lnbmVkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QubWVtaWRzW2ldID09PSBcInN0cmluZ1wiKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5tZW1pZHNbaV0gPSBwYXJzZUludChvYmplY3QubWVtaWRzW2ldLCAxMCk7XG4gICAgICAgICAgICAgICAgICAgIGVsc2UgaWYgKHR5cGVvZiBvYmplY3QubWVtaWRzW2ldID09PSBcIm51bWJlclwiKVxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5tZW1pZHNbaV0gPSBvYmplY3QubWVtaWRzW2ldO1xuICAgICAgICAgICAgICAgICAgICBlbHNlIGlmICh0eXBlb2Ygb2JqZWN0Lm1lbWlkc1tpXSA9PT0gXCJvYmplY3RcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UubWVtaWRzW2ldID0gbmV3ICR1dGlsLkxvbmdCaXRzKG9iamVjdC5tZW1pZHNbaV0ubG93ID4+PiAwLCBvYmplY3QubWVtaWRzW2ldLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAob2JqZWN0LnR5cGVzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KG9iamVjdC50eXBlcykpXG4gICAgICAgICAgICAgICAgICAgIHRocm93IFR5cGVFcnJvcihcIi5PU01QQkYuUmVsYXRpb24udHlwZXM6IGFycmF5IGV4cGVjdGVkXCIpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2UudHlwZXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG9iamVjdC50eXBlcy5sZW5ndGg7ICsraSlcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChvYmplY3QudHlwZXNbaV0pIHtcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIk5PREVcIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50eXBlc1tpXSA9IDA7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBcIldBWVwiOlxuICAgICAgICAgICAgICAgICAgICBjYXNlIDE6XG4gICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLnR5cGVzW2ldID0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFwiUkVMQVRJT05cIjpcbiAgICAgICAgICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS50eXBlc1tpXSA9IDI7XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIG1lc3NhZ2U7XG4gICAgICAgIH07XG5cbiAgICAgICAgLyoqXG4gICAgICAgICAqIENyZWF0ZXMgYSBwbGFpbiBvYmplY3QgZnJvbSBhIFJlbGF0aW9uIG1lc3NhZ2UuIEFsc28gY29udmVydHMgdmFsdWVzIHRvIG90aGVyIHR5cGVzIGlmIHNwZWNpZmllZC5cbiAgICAgICAgICogQGZ1bmN0aW9uIHRvT2JqZWN0XG4gICAgICAgICAqIEBtZW1iZXJvZiBPU01QQkYuUmVsYXRpb25cbiAgICAgICAgICogQHN0YXRpY1xuICAgICAgICAgKiBAcGFyYW0ge09TTVBCRi5SZWxhdGlvbn0gbWVzc2FnZSBSZWxhdGlvblxuICAgICAgICAgKiBAcGFyYW0geyRwcm90b2J1Zi5JQ29udmVyc2lvbk9wdGlvbnN9IFtvcHRpb25zXSBDb252ZXJzaW9uIG9wdGlvbnNcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBQbGFpbiBvYmplY3RcbiAgICAgICAgICovXG4gICAgICAgIFJlbGF0aW9uLnRvT2JqZWN0ID0gZnVuY3Rpb24gdG9PYmplY3QobWVzc2FnZSwgb3B0aW9ucykge1xuICAgICAgICAgICAgaWYgKCFvcHRpb25zKVxuICAgICAgICAgICAgICAgIG9wdGlvbnMgPSB7fTtcbiAgICAgICAgICAgIHZhciBvYmplY3QgPSB7fTtcbiAgICAgICAgICAgIGlmIChvcHRpb25zLmFycmF5cyB8fCBvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LmtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIG9iamVjdC5yb2xlc1NpZCA9IFtdO1xuICAgICAgICAgICAgICAgIG9iamVjdC5tZW1pZHMgPSBbXTtcbiAgICAgICAgICAgICAgICBvYmplY3QudHlwZXMgPSBbXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChvcHRpb25zLmRlZmF1bHRzKSB7XG4gICAgICAgICAgICAgICAgaWYgKCR1dGlsLkxvbmcpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxvbmcgPSBuZXcgJHV0aWwuTG9uZygwLCAwLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IGxvbmcudG9TdHJpbmcoKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IGxvbmcudG9OdW1iZXIoKSA6IGxvbmc7XG4gICAgICAgICAgICAgICAgfSBlbHNlXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFwiMFwiIDogMDtcbiAgICAgICAgICAgICAgICBvYmplY3QuaW5mbyA9IG51bGw7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZCAhPSBudWxsICYmIG1lc3NhZ2UuaGFzT3duUHJvcGVydHkoXCJpZFwiKSlcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIG1lc3NhZ2UuaWQgPT09IFwibnVtYmVyXCIpXG4gICAgICAgICAgICAgICAgICAgIG9iamVjdC5pZCA9IG9wdGlvbnMubG9uZ3MgPT09IFN0cmluZyA/IFN0cmluZyhtZXNzYWdlLmlkKSA6IG1lc3NhZ2UuaWQ7XG4gICAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QuaWQgPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UuaWQpIDogb3B0aW9ucy5sb25ncyA9PT0gTnVtYmVyID8gbmV3ICR1dGlsLkxvbmdCaXRzKG1lc3NhZ2UuaWQubG93ID4+PiAwLCBtZXNzYWdlLmlkLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLmlkO1xuICAgICAgICAgICAgaWYgKG1lc3NhZ2Uua2V5cyAmJiBtZXNzYWdlLmtleXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LmtleXMgPSBbXTtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBqID0gMDsgaiA8IG1lc3NhZ2Uua2V5cy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LmtleXNbal0gPSBtZXNzYWdlLmtleXNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAobWVzc2FnZS52YWxzICYmIG1lc3NhZ2UudmFscy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QudmFscyA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS52YWxzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudmFsc1tqXSA9IG1lc3NhZ2UudmFsc1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmluZm8gIT0gbnVsbCAmJiBtZXNzYWdlLmhhc093blByb3BlcnR5KFwiaW5mb1wiKSlcbiAgICAgICAgICAgICAgICBvYmplY3QuaW5mbyA9ICRyb290Lk9TTVBCRi5JbmZvLnRvT2JqZWN0KG1lc3NhZ2UuaW5mbywgb3B0aW9ucyk7XG4gICAgICAgICAgICBpZiAobWVzc2FnZS5yb2xlc1NpZCAmJiBtZXNzYWdlLnJvbGVzU2lkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgIG9iamVjdC5yb2xlc1NpZCA9IFtdO1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgbWVzc2FnZS5yb2xlc1NpZC5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgb2JqZWN0LnJvbGVzU2lkW2pdID0gbWVzc2FnZS5yb2xlc1NpZFtqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLm1lbWlkcyAmJiBtZXNzYWdlLm1lbWlkcy5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBvYmplY3QubWVtaWRzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLm1lbWlkcy5sZW5ndGg7ICsrailcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlLm1lbWlkc1tqXSA9PT0gXCJudW1iZXJcIilcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5tZW1pZHNbal0gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyBTdHJpbmcobWVzc2FnZS5tZW1pZHNbal0pIDogbWVzc2FnZS5tZW1pZHNbal07XG4gICAgICAgICAgICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iamVjdC5tZW1pZHNbal0gPSBvcHRpb25zLmxvbmdzID09PSBTdHJpbmcgPyAkdXRpbC5Mb25nLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG1lc3NhZ2UubWVtaWRzW2pdKSA6IG9wdGlvbnMubG9uZ3MgPT09IE51bWJlciA/IG5ldyAkdXRpbC5Mb25nQml0cyhtZXNzYWdlLm1lbWlkc1tqXS5sb3cgPj4+IDAsIG1lc3NhZ2UubWVtaWRzW2pdLmhpZ2ggPj4+IDApLnRvTnVtYmVyKCkgOiBtZXNzYWdlLm1lbWlkc1tqXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChtZXNzYWdlLnR5cGVzICYmIG1lc3NhZ2UudHlwZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0LnR5cGVzID0gW107XG4gICAgICAgICAgICAgICAgZm9yICh2YXIgaiA9IDA7IGogPCBtZXNzYWdlLnR5cGVzLmxlbmd0aDsgKytqKVxuICAgICAgICAgICAgICAgICAgICBvYmplY3QudHlwZXNbal0gPSBvcHRpb25zLmVudW1zID09PSBTdHJpbmcgPyAkcm9vdC5PU01QQkYuUmVsYXRpb24uTWVtYmVyVHlwZVttZXNzYWdlLnR5cGVzW2pdXSA6IG1lc3NhZ2UudHlwZXNbal07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0O1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBDb252ZXJ0cyB0aGlzIFJlbGF0aW9uIHRvIEpTT04uXG4gICAgICAgICAqIEBmdW5jdGlvbiB0b0pTT05cbiAgICAgICAgICogQG1lbWJlcm9mIE9TTVBCRi5SZWxhdGlvblxuICAgICAgICAgKiBAaW5zdGFuY2VcbiAgICAgICAgICogQHJldHVybnMge09iamVjdC48c3RyaW5nLCo+fSBKU09OIG9iamVjdFxuICAgICAgICAgKi9cbiAgICAgICAgUmVsYXRpb24ucHJvdG90eXBlLnRvSlNPTiA9IGZ1bmN0aW9uIHRvSlNPTigpIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvbnN0cnVjdG9yLnRvT2JqZWN0KHRoaXMsICRwcm90b2J1Zi51dGlsLnRvSlNPTk9wdGlvbnMpO1xuICAgICAgICB9O1xuXG4gICAgICAgIC8qKlxuICAgICAgICAgKiBNZW1iZXJUeXBlIGVudW0uXG4gICAgICAgICAqIEBuYW1lIE9TTVBCRi5SZWxhdGlvbi5NZW1iZXJUeXBlXG4gICAgICAgICAqIEBlbnVtIHtzdHJpbmd9XG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBOT0RFPTAgTk9ERSB2YWx1ZVxuICAgICAgICAgKiBAcHJvcGVydHkge251bWJlcn0gV0FZPTEgV0FZIHZhbHVlXG4gICAgICAgICAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBSRUxBVElPTj0yIFJFTEFUSU9OIHZhbHVlXG4gICAgICAgICAqL1xuICAgICAgICBSZWxhdGlvbi5NZW1iZXJUeXBlID0gKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIHZhbHVlc0J5SWQgPSB7fSwgdmFsdWVzID0gT2JqZWN0LmNyZWF0ZSh2YWx1ZXNCeUlkKTtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzBdID0gXCJOT0RFXCJdID0gMDtcbiAgICAgICAgICAgIHZhbHVlc1t2YWx1ZXNCeUlkWzFdID0gXCJXQVlcIl0gPSAxO1xuICAgICAgICAgICAgdmFsdWVzW3ZhbHVlc0J5SWRbMl0gPSBcIlJFTEFUSU9OXCJdID0gMjtcbiAgICAgICAgICAgIHJldHVybiB2YWx1ZXM7XG4gICAgICAgIH0pKCk7XG5cbiAgICAgICAgcmV0dXJuIFJlbGF0aW9uO1xuICAgIH0pKCk7XG5cbiAgICByZXR1cm4gT1NNUEJGO1xufSkoKTtcblxubW9kdWxlLmV4cG9ydHMgPSAkcm9vdDtcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IGFzUHJvbWlzZTtcclxuXHJcbi8qKlxyXG4gKiBDYWxsYmFjayBhcyB1c2VkIGJ5IHtAbGluayB1dGlsLmFzUHJvbWlzZX0uXHJcbiAqIEB0eXBlZGVmIGFzUHJvbWlzZUNhbGxiYWNrXHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtFcnJvcnxudWxsfSBlcnJvciBFcnJvciwgaWYgYW55XHJcbiAqIEBwYXJhbSB7Li4uKn0gcGFyYW1zIEFkZGl0aW9uYWwgYXJndW1lbnRzXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJldHVybnMgYSBwcm9taXNlIGZyb20gYSBub2RlLXN0eWxlIGNhbGxiYWNrIGZ1bmN0aW9uLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAcGFyYW0ge2FzUHJvbWlzZUNhbGxiYWNrfSBmbiBGdW5jdGlvbiB0byBjYWxsXHJcbiAqIEBwYXJhbSB7Kn0gY3R4IEZ1bmN0aW9uIGNvbnRleHRcclxuICogQHBhcmFtIHsuLi4qfSBwYXJhbXMgRnVuY3Rpb24gYXJndW1lbnRzXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPCo+fSBQcm9taXNpZmllZCBmdW5jdGlvblxyXG4gKi9cclxuZnVuY3Rpb24gYXNQcm9taXNlKGZuLCBjdHgvKiwgdmFyYXJncyAqLykge1xyXG4gICAgdmFyIHBhcmFtcyAgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpLFxyXG4gICAgICAgIG9mZnNldCAgPSAwLFxyXG4gICAgICAgIGluZGV4ICAgPSAyLFxyXG4gICAgICAgIHBlbmRpbmcgPSB0cnVlO1xyXG4gICAgd2hpbGUgKGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aClcclxuICAgICAgICBwYXJhbXNbb2Zmc2V0KytdID0gYXJndW1lbnRzW2luZGV4KytdO1xyXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIGV4ZWN1dG9yKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgIHBhcmFtc1tvZmZzZXRdID0gZnVuY3Rpb24gY2FsbGJhY2soZXJyLyosIHZhcmFyZ3MgKi8pIHtcclxuICAgICAgICAgICAgaWYgKHBlbmRpbmcpIHtcclxuICAgICAgICAgICAgICAgIHBlbmRpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGlmIChlcnIpXHJcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGFyYW1zID0gbmV3IEFycmF5KGFyZ3VtZW50cy5sZW5ndGggLSAxKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2Zmc2V0ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB3aGlsZSAob2Zmc2V0IDwgcGFyYW1zLmxlbmd0aClcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFyYW1zW29mZnNldCsrXSA9IGFyZ3VtZW50c1tvZmZzZXRdO1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUuYXBwbHkobnVsbCwgcGFyYW1zKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgZm4uYXBwbHkoY3R4IHx8IG51bGwsIHBhcmFtcyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgIGlmIChwZW5kaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBwZW5kaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLyoqXHJcbiAqIEEgbWluaW1hbCBiYXNlNjQgaW1wbGVtZW50YXRpb24gZm9yIG51bWJlciBhcnJheXMuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcbnZhciBiYXNlNjQgPSBleHBvcnRzO1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGJ5dGUgbGVuZ3RoIG9mIGEgYmFzZTY0IGVuY29kZWQgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIEJhc2U2NCBlbmNvZGVkIHN0cmluZ1xyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBCeXRlIGxlbmd0aFxyXG4gKi9cclxuYmFzZTY0Lmxlbmd0aCA9IGZ1bmN0aW9uIGxlbmd0aChzdHJpbmcpIHtcclxuICAgIHZhciBwID0gc3RyaW5nLmxlbmd0aDtcclxuICAgIGlmICghcClcclxuICAgICAgICByZXR1cm4gMDtcclxuICAgIHZhciBuID0gMDtcclxuICAgIHdoaWxlICgtLXAgJSA0ID4gMSAmJiBzdHJpbmcuY2hhckF0KHApID09PSBcIj1cIilcclxuICAgICAgICArK247XHJcbiAgICByZXR1cm4gTWF0aC5jZWlsKHN0cmluZy5sZW5ndGggKiAzKSAvIDQgLSBuO1xyXG59O1xyXG5cclxuLy8gQmFzZTY0IGVuY29kaW5nIHRhYmxlXHJcbnZhciBiNjQgPSBuZXcgQXJyYXkoNjQpO1xyXG5cclxuLy8gQmFzZTY0IGRlY29kaW5nIHRhYmxlXHJcbnZhciBzNjQgPSBuZXcgQXJyYXkoMTIzKTtcclxuXHJcbi8vIDY1Li45MCwgOTcuLjEyMiwgNDguLjU3LCA0MywgNDdcclxuZm9yICh2YXIgaSA9IDA7IGkgPCA2NDspXHJcbiAgICBzNjRbYjY0W2ldID0gaSA8IDI2ID8gaSArIDY1IDogaSA8IDUyID8gaSArIDcxIDogaSA8IDYyID8gaSAtIDQgOiBpIC0gNTkgfCA0M10gPSBpKys7XHJcblxyXG4vKipcclxuICogRW5jb2RlcyBhIGJ1ZmZlciB0byBhIGJhc2U2NCBlbmNvZGVkIHN0cmluZy5cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWZmZXIgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgU291cmNlIHN0YXJ0XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgU291cmNlIGVuZFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBCYXNlNjQgZW5jb2RlZCBzdHJpbmdcclxuICovXHJcbmJhc2U2NC5lbmNvZGUgPSBmdW5jdGlvbiBlbmNvZGUoYnVmZmVyLCBzdGFydCwgZW5kKSB7XHJcbiAgICB2YXIgcGFydHMgPSBudWxsLFxyXG4gICAgICAgIGNodW5rID0gW107XHJcbiAgICB2YXIgaSA9IDAsIC8vIG91dHB1dCBpbmRleFxyXG4gICAgICAgIGogPSAwLCAvLyBnb3RvIGluZGV4XHJcbiAgICAgICAgdDsgICAgIC8vIHRlbXBvcmFyeVxyXG4gICAgd2hpbGUgKHN0YXJ0IDwgZW5kKSB7XHJcbiAgICAgICAgdmFyIGIgPSBidWZmZXJbc3RhcnQrK107XHJcbiAgICAgICAgc3dpdGNoIChqKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgIGNodW5rW2krK10gPSBiNjRbYiA+PiAyXTtcclxuICAgICAgICAgICAgICAgIHQgPSAoYiAmIDMpIDw8IDQ7XHJcbiAgICAgICAgICAgICAgICBqID0gMTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICBjaHVua1tpKytdID0gYjY0W3QgfCBiID4+IDRdO1xyXG4gICAgICAgICAgICAgICAgdCA9IChiICYgMTUpIDw8IDI7XHJcbiAgICAgICAgICAgICAgICBqID0gMjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBjaHVua1tpKytdID0gYjY0W3QgfCBiID4+IDZdO1xyXG4gICAgICAgICAgICAgICAgY2h1bmtbaSsrXSA9IGI2NFtiICYgNjNdO1xyXG4gICAgICAgICAgICAgICAgaiA9IDA7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGkgPiA4MTkxKSB7XHJcbiAgICAgICAgICAgIChwYXJ0cyB8fCAocGFydHMgPSBbXSkpLnB1c2goU3RyaW5nLmZyb21DaGFyQ29kZS5hcHBseShTdHJpbmcsIGNodW5rKSk7XHJcbiAgICAgICAgICAgIGkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGlmIChqKSB7XHJcbiAgICAgICAgY2h1bmtbaSsrXSA9IGI2NFt0XTtcclxuICAgICAgICBjaHVua1tpKytdID0gNjE7XHJcbiAgICAgICAgaWYgKGogPT09IDEpXHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSA2MTtcclxuICAgIH1cclxuICAgIGlmIChwYXJ0cykge1xyXG4gICAgICAgIGlmIChpKVxyXG4gICAgICAgICAgICBwYXJ0cy5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjaHVuay5zbGljZSgwLCBpKSkpO1xyXG4gICAgICAgIHJldHVybiBwYXJ0cy5qb2luKFwiXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjaHVuay5zbGljZSgwLCBpKSk7XHJcbn07XHJcblxyXG52YXIgaW52YWxpZEVuY29kaW5nID0gXCJpbnZhbGlkIGVuY29kaW5nXCI7XHJcblxyXG4vKipcclxuICogRGVjb2RlcyBhIGJhc2U2NCBlbmNvZGVkIHN0cmluZyB0byBhIGJ1ZmZlci5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBTb3VyY2Ugc3RyaW5nXHJcbiAqIEBwYXJhbSB7VWludDhBcnJheX0gYnVmZmVyIERlc3RpbmF0aW9uIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IERlc3RpbmF0aW9uIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBOdW1iZXIgb2YgYnl0ZXMgd3JpdHRlblxyXG4gKiBAdGhyb3dzIHtFcnJvcn0gSWYgZW5jb2RpbmcgaXMgaW52YWxpZFxyXG4gKi9cclxuYmFzZTY0LmRlY29kZSA9IGZ1bmN0aW9uIGRlY29kZShzdHJpbmcsIGJ1ZmZlciwgb2Zmc2V0KSB7XHJcbiAgICB2YXIgc3RhcnQgPSBvZmZzZXQ7XHJcbiAgICB2YXIgaiA9IDAsIC8vIGdvdG8gaW5kZXhcclxuICAgICAgICB0OyAgICAgLy8gdGVtcG9yYXJ5XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0cmluZy5sZW5ndGg7KSB7XHJcbiAgICAgICAgdmFyIGMgPSBzdHJpbmcuY2hhckNvZGVBdChpKyspO1xyXG4gICAgICAgIGlmIChjID09PSA2MSAmJiBqID4gMSlcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgaWYgKChjID0gczY0W2NdKSA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihpbnZhbGlkRW5jb2RpbmcpO1xyXG4gICAgICAgIHN3aXRjaCAoaikge1xyXG4gICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICB0ID0gYztcclxuICAgICAgICAgICAgICAgIGogPSAxO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSB0IDw8IDIgfCAoYyAmIDQ4KSA+PiA0O1xyXG4gICAgICAgICAgICAgICAgdCA9IGM7XHJcbiAgICAgICAgICAgICAgICBqID0gMjtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gKHQgJiAxNSkgPDwgNCB8IChjICYgNjApID4+IDI7XHJcbiAgICAgICAgICAgICAgICB0ID0gYztcclxuICAgICAgICAgICAgICAgIGogPSAzO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSAodCAmIDMpIDw8IDYgfCBjO1xyXG4gICAgICAgICAgICAgICAgaiA9IDA7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAoaiA9PT0gMSlcclxuICAgICAgICB0aHJvdyBFcnJvcihpbnZhbGlkRW5jb2RpbmcpO1xyXG4gICAgcmV0dXJuIG9mZnNldCAtIHN0YXJ0O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFRlc3RzIGlmIHRoZSBzcGVjaWZpZWQgc3RyaW5nIGFwcGVhcnMgdG8gYmUgYmFzZTY0IGVuY29kZWQuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJpbmcgU3RyaW5nIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiBwcm9iYWJseSBiYXNlNjQgZW5jb2RlZCwgb3RoZXJ3aXNlIGZhbHNlXHJcbiAqL1xyXG5iYXNlNjQudGVzdCA9IGZ1bmN0aW9uIHRlc3Qoc3RyaW5nKSB7XHJcbiAgICByZXR1cm4gL14oPzpbQS1aYS16MC05Ky9dezR9KSooPzpbQS1aYS16MC05Ky9dezJ9PT18W0EtWmEtejAtOSsvXXszfT0pPyQvLnRlc3Qoc3RyaW5nKTtcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgZXZlbnQgZW1pdHRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBBIG1pbmltYWwgZXZlbnQgZW1pdHRlci5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWdpc3RlcmVkIGxpc3RlbmVycy5cclxuICAgICAqIEB0eXBlIHtPYmplY3QuPHN0cmluZywqPn1cclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIHRoaXMuX2xpc3RlbmVycyA9IHt9O1xyXG59XHJcblxyXG4vKipcclxuICogUmVnaXN0ZXJzIGFuIGV2ZW50IGxpc3RlbmVyLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZ0IEV2ZW50IG5hbWVcclxuICogQHBhcmFtIHtmdW5jdGlvbn0gZm4gTGlzdGVuZXJcclxuICogQHBhcmFtIHsqfSBbY3R4XSBMaXN0ZW5lciBjb250ZXh0XHJcbiAqIEByZXR1cm5zIHt1dGlsLkV2ZW50RW1pdHRlcn0gYHRoaXNgXHJcbiAqL1xyXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gb24oZXZ0LCBmbiwgY3R4KSB7XHJcbiAgICAodGhpcy5fbGlzdGVuZXJzW2V2dF0gfHwgKHRoaXMuX2xpc3RlbmVyc1tldnRdID0gW10pKS5wdXNoKHtcclxuICAgICAgICBmbiAgOiBmbixcclxuICAgICAgICBjdHggOiBjdHggfHwgdGhpc1xyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZW1vdmVzIGFuIGV2ZW50IGxpc3RlbmVyIG9yIGFueSBtYXRjaGluZyBsaXN0ZW5lcnMgaWYgYXJndW1lbnRzIGFyZSBvbWl0dGVkLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V2dF0gRXZlbnQgbmFtZS4gUmVtb3ZlcyBhbGwgbGlzdGVuZXJzIGlmIG9taXR0ZWQuXHJcbiAqIEBwYXJhbSB7ZnVuY3Rpb259IFtmbl0gTGlzdGVuZXIgdG8gcmVtb3ZlLiBSZW1vdmVzIGFsbCBsaXN0ZW5lcnMgb2YgYGV2dGAgaWYgb21pdHRlZC5cclxuICogQHJldHVybnMge3V0aWwuRXZlbnRFbWl0dGVyfSBgdGhpc2BcclxuICovXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24gb2ZmKGV2dCwgZm4pIHtcclxuICAgIGlmIChldnQgPT09IHVuZGVmaW5lZClcclxuICAgICAgICB0aGlzLl9saXN0ZW5lcnMgPSB7fTtcclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGlmIChmbiA9PT0gdW5kZWZpbmVkKVxyXG4gICAgICAgICAgICB0aGlzLl9saXN0ZW5lcnNbZXZ0XSA9IFtdO1xyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW2V2dF07XHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDspXHJcbiAgICAgICAgICAgICAgICBpZiAobGlzdGVuZXJzW2ldLmZuID09PSBmbilcclxuICAgICAgICAgICAgICAgICAgICBsaXN0ZW5lcnMuc3BsaWNlKGksIDEpO1xyXG4gICAgICAgICAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgICsraTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBFbWl0cyBhbiBldmVudCBieSBjYWxsaW5nIGl0cyBsaXN0ZW5lcnMgd2l0aCB0aGUgc3BlY2lmaWVkIGFyZ3VtZW50cy5cclxuICogQHBhcmFtIHtzdHJpbmd9IGV2dCBFdmVudCBuYW1lXHJcbiAqIEBwYXJhbSB7Li4uKn0gYXJncyBBcmd1bWVudHNcclxuICogQHJldHVybnMge3V0aWwuRXZlbnRFbWl0dGVyfSBgdGhpc2BcclxuICovXHJcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uIGVtaXQoZXZ0KSB7XHJcbiAgICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fbGlzdGVuZXJzW2V2dF07XHJcbiAgICBpZiAobGlzdGVuZXJzKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXSxcclxuICAgICAgICAgICAgaSA9IDE7XHJcbiAgICAgICAgZm9yICg7IGkgPCBhcmd1bWVudHMubGVuZ3RoOylcclxuICAgICAgICAgICAgYXJncy5wdXNoKGFyZ3VtZW50c1tpKytdKTtcclxuICAgICAgICBmb3IgKGkgPSAwOyBpIDwgbGlzdGVuZXJzLmxlbmd0aDspXHJcbiAgICAgICAgICAgIGxpc3RlbmVyc1tpXS5mbi5hcHBseShsaXN0ZW5lcnNbaSsrXS5jdHgsIGFyZ3MpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KGZhY3RvcnkpO1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIC8gd3JpdGVzIGZsb2F0cyAvIGRvdWJsZXMgZnJvbSAvIHRvIGJ1ZmZlcnMuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXRcclxuICogQG5hbWVzcGFjZVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSAzMiBiaXQgZmxvYXQgdG8gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LndyaXRlRmxvYXRMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBUYXJnZXQgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgVGFyZ2V0IGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgMzIgYml0IGZsb2F0IHRvIGEgYnVmZmVyIHVzaW5nIGJpZyBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC53cml0ZUZsb2F0QkVcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgVGFyZ2V0IGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFRhcmdldCBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgMzIgYml0IGZsb2F0IGZyb20gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LnJlYWRGbG9hdExFXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBTb3VyY2UgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgU291cmNlIGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIDMyIGJpdCBmbG9hdCBmcm9tIGEgYnVmZmVyIHVzaW5nIGJpZyBlbmRpYW4gYnl0ZSBvcmRlci5cclxuICogQG5hbWUgdXRpbC5mbG9hdC5yZWFkRmxvYXRCRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgNjQgYml0IGRvdWJsZSB0byBhIGJ1ZmZlciB1c2luZyBsaXR0bGUgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQud3JpdGVEb3VibGVMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBUYXJnZXQgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgVGFyZ2V0IGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgNjQgYml0IGRvdWJsZSB0byBhIGJ1ZmZlciB1c2luZyBiaWcgZW5kaWFuIGJ5dGUgb3JkZXIuXHJcbiAqIEBuYW1lIHV0aWwuZmxvYXQud3JpdGVEb3VibGVCRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbCBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZiBUYXJnZXQgYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBwb3MgVGFyZ2V0IGJ1ZmZlciBvZmZzZXRcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSA2NCBiaXQgZG91YmxlIGZyb20gYSBidWZmZXIgdXNpbmcgbGl0dGxlIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LnJlYWREb3VibGVMRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSA2NCBiaXQgZG91YmxlIGZyb20gYSBidWZmZXIgdXNpbmcgYmlnIGVuZGlhbiBieXRlIG9yZGVyLlxyXG4gKiBAbmFtZSB1dGlsLmZsb2F0LnJlYWREb3VibGVCRVxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWYgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gcG9zIFNvdXJjZSBidWZmZXIgb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vLyBGYWN0b3J5IGZ1bmN0aW9uIGZvciB0aGUgcHVycG9zZSBvZiBub2RlLWJhc2VkIHRlc3RpbmcgaW4gbW9kaWZpZWQgZ2xvYmFsIGVudmlyb25tZW50c1xyXG5mdW5jdGlvbiBmYWN0b3J5KGV4cG9ydHMpIHtcclxuXHJcbiAgICAvLyBmbG9hdDogdHlwZWQgYXJyYXlcclxuICAgIGlmICh0eXBlb2YgRmxvYXQzMkFycmF5ICE9PSBcInVuZGVmaW5lZFwiKSAoZnVuY3Rpb24oKSB7XHJcblxyXG4gICAgICAgIHZhciBmMzIgPSBuZXcgRmxvYXQzMkFycmF5KFsgLTAgXSksXHJcbiAgICAgICAgICAgIGY4YiA9IG5ldyBVaW50OEFycmF5KGYzMi5idWZmZXIpLFxyXG4gICAgICAgICAgICBsZSAgPSBmOGJbM10gPT09IDEyODtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gd3JpdGVGbG9hdF9mMzJfY3B5KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjMyWzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbMF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4YlsxXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbM107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZUZsb2F0X2YzMl9yZXYodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmMzJbMF0gPSB2YWw7XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgICAgXSA9IGY4YlszXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDFdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMl0gPSBmOGJbMV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAzXSA9IGY4YlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZUZsb2F0TEUgPSBsZSA/IHdyaXRlRmxvYXRfZjMyX2NweSA6IHdyaXRlRmxvYXRfZjMyX3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdEJFID0gbGUgPyB3cml0ZUZsb2F0X2YzMl9yZXYgOiB3cml0ZUZsb2F0X2YzMl9jcHk7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGbG9hdF9mMzJfY3B5KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzFdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbMl0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgcmV0dXJuIGYzMlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHJlYWRGbG9hdF9mMzJfcmV2KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzJdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbMV0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgcmV0dXJuIGYzMlswXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRmxvYXRMRSA9IGxlID8gcmVhZEZsb2F0X2YzMl9jcHkgOiByZWFkRmxvYXRfZjMyX3JldjtcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGV4cG9ydHMucmVhZEZsb2F0QkUgPSBsZSA/IHJlYWRGbG9hdF9mMzJfcmV2IDogcmVhZEZsb2F0X2YzMl9jcHk7XHJcblxyXG4gICAgLy8gZmxvYXQ6IGllZWU3NTRcclxuICAgIH0pKCk7IGVsc2UgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZUZsb2F0X2llZWU3NTQod3JpdGVVaW50LCB2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIHZhciBzaWduID0gdmFsIDwgMCA/IDEgOiAwO1xyXG4gICAgICAgICAgICBpZiAoc2lnbilcclxuICAgICAgICAgICAgICAgIHZhbCA9IC12YWw7XHJcbiAgICAgICAgICAgIGlmICh2YWwgPT09IDApXHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMSAvIHZhbCA+IDAgPyAvKiBwb3NpdGl2ZSAqLyAwIDogLyogbmVnYXRpdmUgMCAqLyAyMTQ3NDgzNjQ4LCBidWYsIHBvcyk7XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGlzTmFOKHZhbCkpXHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMjE0MzI4OTM0NCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2YWwgPiAzLjQwMjgyMzQ2NjM4NTI4ODZlKzM4KSAvLyArLUluZmluaXR5XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCAyMTM5MDk1MDQwKSA+Pj4gMCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIGlmICh2YWwgPCAxLjE3NTQ5NDM1MDgyMjI4NzVlLTM4KSAvLyBkZW5vcm1hbFxyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KChzaWduIDw8IDMxIHwgTWF0aC5yb3VuZCh2YWwgLyAxLjQwMTI5ODQ2NDMyNDgxN2UtNDUpKSA+Pj4gMCwgYnVmLCBwb3MpO1xyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHZhciBleHBvbmVudCA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsKSAvIE1hdGguTE4yKSxcclxuICAgICAgICAgICAgICAgICAgICBtYW50aXNzYSA9IE1hdGgucm91bmQodmFsICogTWF0aC5wb3coMiwgLWV4cG9uZW50KSAqIDgzODg2MDgpICYgODM4ODYwNztcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IGV4cG9uZW50ICsgMTI3IDw8IDIzIHwgbWFudGlzc2EpID4+PiAwLCBidWYsIHBvcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdExFID0gd3JpdGVGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgd3JpdGVVaW50TEUpO1xyXG4gICAgICAgIGV4cG9ydHMud3JpdGVGbG9hdEJFID0gd3JpdGVGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgd3JpdGVVaW50QkUpO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRmxvYXRfaWVlZTc1NChyZWFkVWludCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgdmFyIHVpbnQgPSByZWFkVWludChidWYsIHBvcyksXHJcbiAgICAgICAgICAgICAgICBzaWduID0gKHVpbnQgPj4gMzEpICogMiArIDEsXHJcbiAgICAgICAgICAgICAgICBleHBvbmVudCA9IHVpbnQgPj4+IDIzICYgMjU1LFxyXG4gICAgICAgICAgICAgICAgbWFudGlzc2EgPSB1aW50ICYgODM4ODYwNztcclxuICAgICAgICAgICAgcmV0dXJuIGV4cG9uZW50ID09PSAyNTVcclxuICAgICAgICAgICAgICAgID8gbWFudGlzc2FcclxuICAgICAgICAgICAgICAgID8gTmFOXHJcbiAgICAgICAgICAgICAgICA6IHNpZ24gKiBJbmZpbml0eVxyXG4gICAgICAgICAgICAgICAgOiBleHBvbmVudCA9PT0gMCAvLyBkZW5vcm1hbFxyXG4gICAgICAgICAgICAgICAgPyBzaWduICogMS40MDEyOTg0NjQzMjQ4MTdlLTQ1ICogbWFudGlzc2FcclxuICAgICAgICAgICAgICAgIDogc2lnbiAqIE1hdGgucG93KDIsIGV4cG9uZW50IC0gMTUwKSAqIChtYW50aXNzYSArIDgzODg2MDgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRmxvYXRMRSA9IHJlYWRGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgcmVhZFVpbnRMRSk7XHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRmxvYXRCRSA9IHJlYWRGbG9hdF9pZWVlNzU0LmJpbmQobnVsbCwgcmVhZFVpbnRCRSk7XHJcblxyXG4gICAgfSkoKTtcclxuXHJcbiAgICAvLyBkb3VibGU6IHR5cGVkIGFycmF5XHJcbiAgICBpZiAodHlwZW9mIEZsb2F0NjRBcnJheSAhPT0gXCJ1bmRlZmluZWRcIikgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICB2YXIgZjY0ID0gbmV3IEZsb2F0NjRBcnJheShbLTBdKSxcclxuICAgICAgICAgICAgZjhiID0gbmV3IFVpbnQ4QXJyYXkoZjY0LmJ1ZmZlciksXHJcbiAgICAgICAgICAgIGxlICA9IGY4Yls3XSA9PT0gMTI4O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZURvdWJsZV9mNjRfY3B5KHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICAgICAgZjY0WzBdID0gdmFsO1xyXG4gICAgICAgICAgICBidWZbcG9zICAgIF0gPSBmOGJbMF07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAxXSA9IGY4YlsxXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDJdID0gZjhiWzJdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgM10gPSBmOGJbM107XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA0XSA9IGY4Yls0XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDVdID0gZjhiWzVdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNl0gPSBmOGJbNl07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA3XSA9IGY4Yls3XTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIHdyaXRlRG91YmxlX2Y2NF9yZXYodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICBmNjRbMF0gPSB2YWw7XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgICAgXSA9IGY4Yls3XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDFdID0gZjhiWzZdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgMl0gPSBmOGJbNV07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyAzXSA9IGY4Yls0XTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDRdID0gZjhiWzNdO1xyXG4gICAgICAgICAgICBidWZbcG9zICsgNV0gPSBmOGJbMl07XHJcbiAgICAgICAgICAgIGJ1Zltwb3MgKyA2XSA9IGY4YlsxXTtcclxuICAgICAgICAgICAgYnVmW3BvcyArIDddID0gZjhiWzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLndyaXRlRG91YmxlTEUgPSBsZSA/IHdyaXRlRG91YmxlX2Y2NF9jcHkgOiB3cml0ZURvdWJsZV9mNjRfcmV2O1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUJFID0gbGUgPyB3cml0ZURvdWJsZV9mNjRfcmV2IDogd3JpdGVEb3VibGVfZjY0X2NweTtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZERvdWJsZV9mNjRfY3B5KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4YlswXSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzFdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbMl0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4YlszXSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgZjhiWzRdID0gYnVmW3BvcyArIDRdO1xyXG4gICAgICAgICAgICBmOGJbNV0gPSBidWZbcG9zICsgNV07XHJcbiAgICAgICAgICAgIGY4Yls2XSA9IGJ1Zltwb3MgKyA2XTtcclxuICAgICAgICAgICAgZjhiWzddID0gYnVmW3BvcyArIDddO1xyXG4gICAgICAgICAgICByZXR1cm4gZjY0WzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gcmVhZERvdWJsZV9mNjRfcmV2KGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIGY4Yls3XSA9IGJ1Zltwb3MgICAgXTtcclxuICAgICAgICAgICAgZjhiWzZdID0gYnVmW3BvcyArIDFdO1xyXG4gICAgICAgICAgICBmOGJbNV0gPSBidWZbcG9zICsgMl07XHJcbiAgICAgICAgICAgIGY4Yls0XSA9IGJ1Zltwb3MgKyAzXTtcclxuICAgICAgICAgICAgZjhiWzNdID0gYnVmW3BvcyArIDRdO1xyXG4gICAgICAgICAgICBmOGJbMl0gPSBidWZbcG9zICsgNV07XHJcbiAgICAgICAgICAgIGY4YlsxXSA9IGJ1Zltwb3MgKyA2XTtcclxuICAgICAgICAgICAgZjhiWzBdID0gYnVmW3BvcyArIDddO1xyXG4gICAgICAgICAgICByZXR1cm4gZjY0WzBdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBleHBvcnRzLnJlYWREb3VibGVMRSA9IGxlID8gcmVhZERvdWJsZV9mNjRfY3B5IDogcmVhZERvdWJsZV9mNjRfcmV2O1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgZXhwb3J0cy5yZWFkRG91YmxlQkUgPSBsZSA/IHJlYWREb3VibGVfZjY0X3JldiA6IHJlYWREb3VibGVfZjY0X2NweTtcclxuXHJcbiAgICAvLyBkb3VibGU6IGllZWU3NTRcclxuICAgIH0pKCk7IGVsc2UgKGZ1bmN0aW9uKCkge1xyXG5cclxuICAgICAgICBmdW5jdGlvbiB3cml0ZURvdWJsZV9pZWVlNzU0KHdyaXRlVWludCwgb2ZmMCwgb2ZmMSwgdmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgICAgICB2YXIgc2lnbiA9IHZhbCA8IDAgPyAxIDogMDtcclxuICAgICAgICAgICAgaWYgKHNpZ24pXHJcbiAgICAgICAgICAgICAgICB2YWwgPSAtdmFsO1xyXG4gICAgICAgICAgICBpZiAodmFsID09PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgxIC8gdmFsID4gMCA/IC8qIHBvc2l0aXZlICovIDAgOiAvKiBuZWdhdGl2ZSAwICovIDIxNDc0ODM2NDgsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaXNOYU4odmFsKSkge1xyXG4gICAgICAgICAgICAgICAgd3JpdGVVaW50KDAsIGJ1ZiwgcG9zICsgb2ZmMCk7XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMjE0Njk1OTM2MCwgYnVmLCBwb3MgKyBvZmYxKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh2YWwgPiAxLjc5NzY5MzEzNDg2MjMxNTdlKzMwOCkgeyAvLyArLUluZmluaXR5XHJcbiAgICAgICAgICAgICAgICB3cml0ZVVpbnQoMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IDIxNDY0MzUwNzIpID4+PiAwLCBidWYsIHBvcyArIG9mZjEpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdmFyIG1hbnRpc3NhO1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbCA8IDIuMjI1MDczODU4NTA3MjAxNGUtMzA4KSB7IC8vIGRlbm9ybWFsXHJcbiAgICAgICAgICAgICAgICAgICAgbWFudGlzc2EgPSB2YWwgLyA1ZS0zMjQ7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50KG1hbnRpc3NhID4+PiAwLCBidWYsIHBvcyArIG9mZjApO1xyXG4gICAgICAgICAgICAgICAgICAgIHdyaXRlVWludCgoc2lnbiA8PCAzMSB8IG1hbnRpc3NhIC8gNDI5NDk2NzI5NikgPj4+IDAsIGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBleHBvbmVudCA9IE1hdGguZmxvb3IoTWF0aC5sb2codmFsKSAvIE1hdGguTE4yKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZXhwb25lbnQgPT09IDEwMjQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4cG9uZW50ID0gMTAyMztcclxuICAgICAgICAgICAgICAgICAgICBtYW50aXNzYSA9IHZhbCAqIE1hdGgucG93KDIsIC1leHBvbmVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgd3JpdGVVaW50KG1hbnRpc3NhICogNDUwMzU5OTYyNzM3MDQ5NiA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYwKTtcclxuICAgICAgICAgICAgICAgICAgICB3cml0ZVVpbnQoKHNpZ24gPDwgMzEgfCBleHBvbmVudCArIDEwMjMgPDwgMjAgfCBtYW50aXNzYSAqIDEwNDg1NzYgJiAxMDQ4NTc1KSA+Pj4gMCwgYnVmLCBwb3MgKyBvZmYxKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXhwb3J0cy53cml0ZURvdWJsZUxFID0gd3JpdGVEb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHdyaXRlVWludExFLCAwLCA0KTtcclxuICAgICAgICBleHBvcnRzLndyaXRlRG91YmxlQkUgPSB3cml0ZURvdWJsZV9pZWVlNzU0LmJpbmQobnVsbCwgd3JpdGVVaW50QkUsIDQsIDApO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiByZWFkRG91YmxlX2llZWU3NTQocmVhZFVpbnQsIG9mZjAsIG9mZjEsIGJ1ZiwgcG9zKSB7XHJcbiAgICAgICAgICAgIHZhciBsbyA9IHJlYWRVaW50KGJ1ZiwgcG9zICsgb2ZmMCksXHJcbiAgICAgICAgICAgICAgICBoaSA9IHJlYWRVaW50KGJ1ZiwgcG9zICsgb2ZmMSk7XHJcbiAgICAgICAgICAgIHZhciBzaWduID0gKGhpID4+IDMxKSAqIDIgKyAxLFxyXG4gICAgICAgICAgICAgICAgZXhwb25lbnQgPSBoaSA+Pj4gMjAgJiAyMDQ3LFxyXG4gICAgICAgICAgICAgICAgbWFudGlzc2EgPSA0Mjk0OTY3Mjk2ICogKGhpICYgMTA0ODU3NSkgKyBsbztcclxuICAgICAgICAgICAgcmV0dXJuIGV4cG9uZW50ID09PSAyMDQ3XHJcbiAgICAgICAgICAgICAgICA/IG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA/IE5hTlxyXG4gICAgICAgICAgICAgICAgOiBzaWduICogSW5maW5pdHlcclxuICAgICAgICAgICAgICAgIDogZXhwb25lbnQgPT09IDAgLy8gZGVub3JtYWxcclxuICAgICAgICAgICAgICAgID8gc2lnbiAqIDVlLTMyNCAqIG1hbnRpc3NhXHJcbiAgICAgICAgICAgICAgICA6IHNpZ24gKiBNYXRoLnBvdygyLCBleHBvbmVudCAtIDEwNzUpICogKG1hbnRpc3NhICsgNDUwMzU5OTYyNzM3MDQ5Nik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBleHBvcnRzLnJlYWREb3VibGVMRSA9IHJlYWREb3VibGVfaWVlZTc1NC5iaW5kKG51bGwsIHJlYWRVaW50TEUsIDAsIDQpO1xyXG4gICAgICAgIGV4cG9ydHMucmVhZERvdWJsZUJFID0gcmVhZERvdWJsZV9pZWVlNzU0LmJpbmQobnVsbCwgcmVhZFVpbnRCRSwgNCwgMCk7XHJcblxyXG4gICAgfSkoKTtcclxuXHJcbiAgICByZXR1cm4gZXhwb3J0cztcclxufVxyXG5cclxuLy8gdWludCBoZWxwZXJzXHJcblxyXG5mdW5jdGlvbiB3cml0ZVVpbnRMRSh2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICBidWZbcG9zICAgIF0gPSAgdmFsICAgICAgICAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAxXSA9ICB2YWwgPj4+IDggICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDJdID0gIHZhbCA+Pj4gMTYgJiAyNTU7XHJcbiAgICBidWZbcG9zICsgM10gPSAgdmFsID4+PiAyNDtcclxufVxyXG5cclxuZnVuY3Rpb24gd3JpdGVVaW50QkUodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCA+Pj4gMjQ7XHJcbiAgICBidWZbcG9zICsgMV0gPSAgdmFsID4+PiAxNiAmIDI1NTtcclxuICAgIGJ1Zltwb3MgKyAyXSA9ICB2YWwgPj4+IDggICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCAgICAgICAgJiAyNTU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlYWRVaW50TEUoYnVmLCBwb3MpIHtcclxuICAgIHJldHVybiAoYnVmW3BvcyAgICBdXHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAxXSA8PCA4XHJcbiAgICAgICAgICB8IGJ1Zltwb3MgKyAyXSA8PCAxNlxyXG4gICAgICAgICAgfCBidWZbcG9zICsgM10gPDwgMjQpID4+PiAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZWFkVWludEJFKGJ1ZiwgcG9zKSB7XHJcbiAgICByZXR1cm4gKGJ1Zltwb3MgICAgXSA8PCAyNFxyXG4gICAgICAgICAgfCBidWZbcG9zICsgMV0gPDwgMTZcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDJdIDw8IDhcclxuICAgICAgICAgIHwgYnVmW3BvcyArIDNdKSA+Pj4gMDtcclxufVxyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBpbnF1aXJlO1xyXG5cclxuLyoqXHJcbiAqIFJlcXVpcmVzIGEgbW9kdWxlIG9ubHkgaWYgYXZhaWxhYmxlLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlTmFtZSBNb2R1bGUgdG8gcmVxdWlyZVxyXG4gKiBAcmV0dXJucyB7P09iamVjdH0gUmVxdWlyZWQgbW9kdWxlIGlmIGF2YWlsYWJsZSBhbmQgbm90IGVtcHR5LCBvdGhlcndpc2UgYG51bGxgXHJcbiAqL1xyXG5mdW5jdGlvbiBpbnF1aXJlKG1vZHVsZU5hbWUpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgdmFyIG1vZCA9IGV2YWwoXCJxdWlyZVwiLnJlcGxhY2UoL14vLFwicmVcIikpKG1vZHVsZU5hbWUpOyAvLyBlc2xpbnQtZGlzYWJsZS1saW5lIG5vLWV2YWxcclxuICAgICAgICBpZiAobW9kICYmIChtb2QubGVuZ3RoIHx8IE9iamVjdC5rZXlzKG1vZCkubGVuZ3RoKSlcclxuICAgICAgICAgICAgcmV0dXJuIG1vZDtcclxuICAgIH0gY2F0Y2ggKGUpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHlcclxuICAgIHJldHVybiBudWxsO1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IHBvb2w7XHJcblxyXG4vKipcclxuICogQW4gYWxsb2NhdG9yIGFzIHVzZWQgYnkge0BsaW5rIHV0aWwucG9vbH0uXHJcbiAqIEB0eXBlZGVmIFBvb2xBbGxvY2F0b3JcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBCdWZmZXIgc2l6ZVxyXG4gKiBAcmV0dXJucyB7VWludDhBcnJheX0gQnVmZmVyXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEEgc2xpY2VyIGFzIHVzZWQgYnkge0BsaW5rIHV0aWwucG9vbH0uXHJcbiAqIEB0eXBlZGVmIFBvb2xTbGljZXJcclxuICogQHR5cGUge2Z1bmN0aW9ufVxyXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgU3RhcnQgb2Zmc2V0XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgRW5kIG9mZnNldFxyXG4gKiBAcmV0dXJucyB7VWludDhBcnJheX0gQnVmZmVyIHNsaWNlXHJcbiAqIEB0aGlzIHtVaW50OEFycmF5fVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBBIGdlbmVyYWwgcHVycG9zZSBidWZmZXIgcG9vbC5cclxuICogQG1lbWJlcm9mIHV0aWxcclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7UG9vbEFsbG9jYXRvcn0gYWxsb2MgQWxsb2NhdG9yXHJcbiAqIEBwYXJhbSB7UG9vbFNsaWNlcn0gc2xpY2UgU2xpY2VyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBbc2l6ZT04MTkyXSBTbGFiIHNpemVcclxuICogQHJldHVybnMge1Bvb2xBbGxvY2F0b3J9IFBvb2xlZCBhbGxvY2F0b3JcclxuICovXHJcbmZ1bmN0aW9uIHBvb2woYWxsb2MsIHNsaWNlLCBzaXplKSB7XHJcbiAgICB2YXIgU0laRSAgID0gc2l6ZSB8fCA4MTkyO1xyXG4gICAgdmFyIE1BWCAgICA9IFNJWkUgPj4+IDE7XHJcbiAgICB2YXIgc2xhYiAgID0gbnVsbDtcclxuICAgIHZhciBvZmZzZXQgPSBTSVpFO1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uIHBvb2xfYWxsb2Moc2l6ZSkge1xyXG4gICAgICAgIGlmIChzaXplIDwgMSB8fCBzaXplID4gTUFYKVxyXG4gICAgICAgICAgICByZXR1cm4gYWxsb2Moc2l6ZSk7XHJcbiAgICAgICAgaWYgKG9mZnNldCArIHNpemUgPiBTSVpFKSB7XHJcbiAgICAgICAgICAgIHNsYWIgPSBhbGxvYyhTSVpFKTtcclxuICAgICAgICAgICAgb2Zmc2V0ID0gMDtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGJ1ZiA9IHNsaWNlLmNhbGwoc2xhYiwgb2Zmc2V0LCBvZmZzZXQgKz0gc2l6ZSk7XHJcbiAgICAgICAgaWYgKG9mZnNldCAmIDcpIC8vIGFsaWduIHRvIDMyIGJpdFxyXG4gICAgICAgICAgICBvZmZzZXQgPSAob2Zmc2V0IHwgNykgKyAxO1xyXG4gICAgICAgIHJldHVybiBidWY7XHJcbiAgICB9O1xyXG59XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5cclxuLyoqXHJcbiAqIEEgbWluaW1hbCBVVEY4IGltcGxlbWVudGF0aW9uIGZvciBudW1iZXIgYXJyYXlzLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAbmFtZXNwYWNlXHJcbiAqL1xyXG52YXIgdXRmOCA9IGV4cG9ydHM7XHJcblxyXG4vKipcclxuICogQ2FsY3VsYXRlcyB0aGUgVVRGOCBieXRlIGxlbmd0aCBvZiBhIHN0cmluZy5cclxuICogQHBhcmFtIHtzdHJpbmd9IHN0cmluZyBTdHJpbmdcclxuICogQHJldHVybnMge251bWJlcn0gQnl0ZSBsZW5ndGhcclxuICovXHJcbnV0ZjgubGVuZ3RoID0gZnVuY3Rpb24gdXRmOF9sZW5ndGgoc3RyaW5nKSB7XHJcbiAgICB2YXIgbGVuID0gMCxcclxuICAgICAgICBjID0gMDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYyA9IHN0cmluZy5jaGFyQ29kZUF0KGkpO1xyXG4gICAgICAgIGlmIChjIDwgMTI4KVxyXG4gICAgICAgICAgICBsZW4gKz0gMTtcclxuICAgICAgICBlbHNlIGlmIChjIDwgMjA0OClcclxuICAgICAgICAgICAgbGVuICs9IDI7XHJcbiAgICAgICAgZWxzZSBpZiAoKGMgJiAweEZDMDApID09PSAweEQ4MDAgJiYgKHN0cmluZy5jaGFyQ29kZUF0KGkgKyAxKSAmIDB4RkMwMCkgPT09IDB4REMwMCkge1xyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIGxlbiArPSA0O1xyXG4gICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICBsZW4gKz0gMztcclxuICAgIH1cclxuICAgIHJldHVybiBsZW47XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgVVRGOCBieXRlcyBhcyBhIHN0cmluZy5cclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWZmZXIgU291cmNlIGJ1ZmZlclxyXG4gKiBAcGFyYW0ge251bWJlcn0gc3RhcnQgU291cmNlIHN0YXJ0XHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBlbmQgU291cmNlIGVuZFxyXG4gKiBAcmV0dXJucyB7c3RyaW5nfSBTdHJpbmcgcmVhZFxyXG4gKi9cclxudXRmOC5yZWFkID0gZnVuY3Rpb24gdXRmOF9yZWFkKGJ1ZmZlciwgc3RhcnQsIGVuZCkge1xyXG4gICAgdmFyIGxlbiA9IGVuZCAtIHN0YXJ0O1xyXG4gICAgaWYgKGxlbiA8IDEpXHJcbiAgICAgICAgcmV0dXJuIFwiXCI7XHJcbiAgICB2YXIgcGFydHMgPSBudWxsLFxyXG4gICAgICAgIGNodW5rID0gW10sXHJcbiAgICAgICAgaSA9IDAsIC8vIGNoYXIgb2Zmc2V0XHJcbiAgICAgICAgdDsgICAgIC8vIHRlbXBvcmFyeVxyXG4gICAgd2hpbGUgKHN0YXJ0IDwgZW5kKSB7XHJcbiAgICAgICAgdCA9IGJ1ZmZlcltzdGFydCsrXTtcclxuICAgICAgICBpZiAodCA8IDEyOClcclxuICAgICAgICAgICAgY2h1bmtbaSsrXSA9IHQ7XHJcbiAgICAgICAgZWxzZSBpZiAodCA+IDE5MSAmJiB0IDwgMjI0KVxyXG4gICAgICAgICAgICBjaHVua1tpKytdID0gKHQgJiAzMSkgPDwgNiB8IGJ1ZmZlcltzdGFydCsrXSAmIDYzO1xyXG4gICAgICAgIGVsc2UgaWYgKHQgPiAyMzkgJiYgdCA8IDM2NSkge1xyXG4gICAgICAgICAgICB0ID0gKCh0ICYgNykgPDwgMTggfCAoYnVmZmVyW3N0YXJ0KytdICYgNjMpIDw8IDEyIHwgKGJ1ZmZlcltzdGFydCsrXSAmIDYzKSA8PCA2IHwgYnVmZmVyW3N0YXJ0KytdICYgNjMpIC0gMHgxMDAwMDtcclxuICAgICAgICAgICAgY2h1bmtbaSsrXSA9IDB4RDgwMCArICh0ID4+IDEwKTtcclxuICAgICAgICAgICAgY2h1bmtbaSsrXSA9IDB4REMwMCArICh0ICYgMTAyMyk7XHJcbiAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgIGNodW5rW2krK10gPSAodCAmIDE1KSA8PCAxMiB8IChidWZmZXJbc3RhcnQrK10gJiA2MykgPDwgNiB8IGJ1ZmZlcltzdGFydCsrXSAmIDYzO1xyXG4gICAgICAgIGlmIChpID4gODE5MSkge1xyXG4gICAgICAgICAgICAocGFydHMgfHwgKHBhcnRzID0gW10pKS5wdXNoKFN0cmluZy5mcm9tQ2hhckNvZGUuYXBwbHkoU3RyaW5nLCBjaHVuaykpO1xyXG4gICAgICAgICAgICBpID0gMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAocGFydHMpIHtcclxuICAgICAgICBpZiAoaSlcclxuICAgICAgICAgICAgcGFydHMucHVzaChTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY2h1bmsuc2xpY2UoMCwgaSkpKTtcclxuICAgICAgICByZXR1cm4gcGFydHMuam9pbihcIlwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiBTdHJpbmcuZnJvbUNoYXJDb2RlLmFwcGx5KFN0cmluZywgY2h1bmsuc2xpY2UoMCwgaSkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHN0cmluZyBhcyBVVEY4IGJ5dGVzLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyaW5nIFNvdXJjZSBzdHJpbmdcclxuICogQHBhcmFtIHtVaW50OEFycmF5fSBidWZmZXIgRGVzdGluYXRpb24gYnVmZmVyXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgRGVzdGluYXRpb24gb2Zmc2V0XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IEJ5dGVzIHdyaXR0ZW5cclxuICovXHJcbnV0Zjgud3JpdGUgPSBmdW5jdGlvbiB1dGY4X3dyaXRlKHN0cmluZywgYnVmZmVyLCBvZmZzZXQpIHtcclxuICAgIHZhciBzdGFydCA9IG9mZnNldCxcclxuICAgICAgICBjMSwgLy8gY2hhcmFjdGVyIDFcclxuICAgICAgICBjMjsgLy8gY2hhcmFjdGVyIDJcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyaW5nLmxlbmd0aDsgKytpKSB7XHJcbiAgICAgICAgYzEgPSBzdHJpbmcuY2hhckNvZGVBdChpKTtcclxuICAgICAgICBpZiAoYzEgPCAxMjgpIHtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxO1xyXG4gICAgICAgIH0gZWxzZSBpZiAoYzEgPCAyMDQ4KSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiA2ICAgICAgIHwgMTkyO1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgICAgICAgJiA2MyB8IDEyODtcclxuICAgICAgICB9IGVsc2UgaWYgKChjMSAmIDB4RkMwMCkgPT09IDB4RDgwMCAmJiAoKGMyID0gc3RyaW5nLmNoYXJDb2RlQXQoaSArIDEpKSAmIDB4RkMwMCkgPT09IDB4REMwMCkge1xyXG4gICAgICAgICAgICBjMSA9IDB4MTAwMDAgKyAoKGMxICYgMHgwM0ZGKSA8PCAxMCkgKyAoYzIgJiAweDAzRkYpO1xyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiAxOCAgICAgIHwgMjQwO1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gMTIgJiA2MyB8IDEyODtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxID4+IDYgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSAgICAgICAmIDYzIHwgMTI4O1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGJ1ZmZlcltvZmZzZXQrK10gPSBjMSA+PiAxMiAgICAgIHwgMjI0O1xyXG4gICAgICAgICAgICBidWZmZXJbb2Zmc2V0KytdID0gYzEgPj4gNiAgJiA2MyB8IDEyODtcclxuICAgICAgICAgICAgYnVmZmVyW29mZnNldCsrXSA9IGMxICAgICAgICYgNjMgfCAxMjg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG9mZnNldCAtIHN0YXJ0O1xyXG59O1xyXG4iLCIvLyBtaW5pbWFsIGxpYnJhcnkgZW50cnkgcG9pbnQuXHJcblxyXG5cInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwiLi9zcmMvaW5kZXgtbWluaW1hbFwiKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbnZhciBwcm90b2J1ZiA9IGV4cG9ydHM7XHJcblxyXG4vKipcclxuICogQnVpbGQgdHlwZSwgb25lIG9mIGBcImZ1bGxcImAsIGBcImxpZ2h0XCJgIG9yIGBcIm1pbmltYWxcImAuXHJcbiAqIEBuYW1lIGJ1aWxkXHJcbiAqIEB0eXBlIHtzdHJpbmd9XHJcbiAqIEBjb25zdFxyXG4gKi9cclxucHJvdG9idWYuYnVpbGQgPSBcIm1pbmltYWxcIjtcclxuXHJcbi8vIFNlcmlhbGl6YXRpb25cclxucHJvdG9idWYuV3JpdGVyICAgICAgID0gcmVxdWlyZShcIi4vd3JpdGVyXCIpO1xyXG5wcm90b2J1Zi5CdWZmZXJXcml0ZXIgPSByZXF1aXJlKFwiLi93cml0ZXJfYnVmZmVyXCIpO1xyXG5wcm90b2J1Zi5SZWFkZXIgICAgICAgPSByZXF1aXJlKFwiLi9yZWFkZXJcIik7XHJcbnByb3RvYnVmLkJ1ZmZlclJlYWRlciA9IHJlcXVpcmUoXCIuL3JlYWRlcl9idWZmZXJcIik7XHJcblxyXG4vLyBVdGlsaXR5XHJcbnByb3RvYnVmLnV0aWwgICAgICAgICA9IHJlcXVpcmUoXCIuL3V0aWwvbWluaW1hbFwiKTtcclxucHJvdG9idWYucnBjICAgICAgICAgID0gcmVxdWlyZShcIi4vcnBjXCIpO1xyXG5wcm90b2J1Zi5yb290cyAgICAgICAgPSByZXF1aXJlKFwiLi9yb290c1wiKTtcclxucHJvdG9idWYuY29uZmlndXJlICAgID0gY29uZmlndXJlO1xyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuLyoqXHJcbiAqIFJlY29uZmlndXJlcyB0aGUgbGlicmFyeSBhY2NvcmRpbmcgdG8gdGhlIGVudmlyb25tZW50LlxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuZnVuY3Rpb24gY29uZmlndXJlKCkge1xyXG4gICAgcHJvdG9idWYuUmVhZGVyLl9jb25maWd1cmUocHJvdG9idWYuQnVmZmVyUmVhZGVyKTtcclxuICAgIHByb3RvYnVmLnV0aWwuX2NvbmZpZ3VyZSgpO1xyXG59XHJcblxyXG4vLyBTZXQgdXAgYnVmZmVyIHV0aWxpdHkgYWNjb3JkaW5nIHRvIHRoZSBlbnZpcm9ubWVudFxyXG5wcm90b2J1Zi5Xcml0ZXIuX2NvbmZpZ3VyZShwcm90b2J1Zi5CdWZmZXJXcml0ZXIpO1xyXG5jb25maWd1cmUoKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gUmVhZGVyO1xyXG5cclxudmFyIHV0aWwgICAgICA9IHJlcXVpcmUoXCIuL3V0aWwvbWluaW1hbFwiKTtcclxuXHJcbnZhciBCdWZmZXJSZWFkZXI7IC8vIGN5Y2xpY1xyXG5cclxudmFyIExvbmdCaXRzICA9IHV0aWwuTG9uZ0JpdHMsXHJcbiAgICB1dGY4ICAgICAgPSB1dGlsLnV0Zjg7XHJcblxyXG4vKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG5mdW5jdGlvbiBpbmRleE91dE9mUmFuZ2UocmVhZGVyLCB3cml0ZUxlbmd0aCkge1xyXG4gICAgcmV0dXJuIFJhbmdlRXJyb3IoXCJpbmRleCBvdXQgb2YgcmFuZ2U6IFwiICsgcmVhZGVyLnBvcyArIFwiICsgXCIgKyAod3JpdGVMZW5ndGggfHwgMSkgKyBcIiA+IFwiICsgcmVhZGVyLmxlbik7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHJlYWRlciBpbnN0YW5jZSB1c2luZyB0aGUgc3BlY2lmaWVkIGJ1ZmZlci5cclxuICogQGNsYXNzZGVzYyBXaXJlIGZvcm1hdCByZWFkZXIgdXNpbmcgYFVpbnQ4QXJyYXlgIGlmIGF2YWlsYWJsZSwgb3RoZXJ3aXNlIGBBcnJheWAuXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IGJ1ZmZlciBCdWZmZXIgdG8gcmVhZCBmcm9tXHJcbiAqL1xyXG5mdW5jdGlvbiBSZWFkZXIoYnVmZmVyKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBSZWFkIGJ1ZmZlci5cclxuICAgICAqIEB0eXBlIHtVaW50OEFycmF5fVxyXG4gICAgICovXHJcbiAgICB0aGlzLmJ1ZiA9IGJ1ZmZlcjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFJlYWQgYnVmZmVyIHBvc2l0aW9uLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5wb3MgPSAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSBidWZmZXIubGVuZ3RoO1xyXG59XHJcblxyXG52YXIgY3JlYXRlX2FycmF5ID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09IFwidW5kZWZpbmVkXCJcclxuICAgID8gZnVuY3Rpb24gY3JlYXRlX3R5cGVkX2FycmF5KGJ1ZmZlcikge1xyXG4gICAgICAgIGlmIChidWZmZXIgaW5zdGFuY2VvZiBVaW50OEFycmF5IHx8IEFycmF5LmlzQXJyYXkoYnVmZmVyKSlcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBSZWFkZXIoYnVmZmVyKTtcclxuICAgICAgICB0aHJvdyBFcnJvcihcImlsbGVnYWwgYnVmZmVyXCIpO1xyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIDogZnVuY3Rpb24gY3JlYXRlX2FycmF5KGJ1ZmZlcikge1xyXG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGJ1ZmZlcikpXHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgUmVhZGVyKGJ1ZmZlcik7XHJcbiAgICAgICAgdGhyb3cgRXJyb3IoXCJpbGxlZ2FsIGJ1ZmZlclwiKTtcclxuICAgIH07XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyByZWFkZXIgdXNpbmcgdGhlIHNwZWNpZmllZCBidWZmZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl8QnVmZmVyfSBidWZmZXIgQnVmZmVyIHRvIHJlYWQgZnJvbVxyXG4gKiBAcmV0dXJucyB7UmVhZGVyfEJ1ZmZlclJlYWRlcn0gQSB7QGxpbmsgQnVmZmVyUmVhZGVyfSBpZiBgYnVmZmVyYCBpcyBhIEJ1ZmZlciwgb3RoZXJ3aXNlIGEge0BsaW5rIFJlYWRlcn1cclxuICogQHRocm93cyB7RXJyb3J9IElmIGBidWZmZXJgIGlzIG5vdCBhIHZhbGlkIGJ1ZmZlclxyXG4gKi9cclxuUmVhZGVyLmNyZWF0ZSA9IHV0aWwuQnVmZmVyXHJcbiAgICA/IGZ1bmN0aW9uIGNyZWF0ZV9idWZmZXJfc2V0dXAoYnVmZmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIChSZWFkZXIuY3JlYXRlID0gZnVuY3Rpb24gY3JlYXRlX2J1ZmZlcihidWZmZXIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHV0aWwuQnVmZmVyLmlzQnVmZmVyKGJ1ZmZlcilcclxuICAgICAgICAgICAgICAgID8gbmV3IEJ1ZmZlclJlYWRlcihidWZmZXIpXHJcbiAgICAgICAgICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgICAgICAgICAgOiBjcmVhdGVfYXJyYXkoYnVmZmVyKTtcclxuICAgICAgICB9KShidWZmZXIpO1xyXG4gICAgfVxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgIDogY3JlYXRlX2FycmF5O1xyXG5cclxuUmVhZGVyLnByb3RvdHlwZS5fc2xpY2UgPSB1dGlsLkFycmF5LnByb3RvdHlwZS5zdWJhcnJheSB8fCAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyB1dGlsLkFycmF5LnByb3RvdHlwZS5zbGljZTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHZhcmludCBhcyBhbiB1bnNpZ25lZCAzMiBiaXQgdmFsdWUuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLnVpbnQzMiA9IChmdW5jdGlvbiByZWFkX3VpbnQzMl9zZXR1cCgpIHtcclxuICAgIHZhciB2YWx1ZSA9IDQyOTQ5NjcyOTU7IC8vIG9wdGltaXplciB0eXBlLWhpbnQsIHRlbmRzIHRvIGRlb3B0IG90aGVyd2lzZSAoPyEpXHJcbiAgICByZXR1cm4gZnVuY3Rpb24gcmVhZF91aW50MzIoKSB7XHJcbiAgICAgICAgdmFsdWUgPSAoICAgICAgICAgdGhpcy5idWZbdGhpcy5wb3NdICYgMTI3ICAgICAgICkgPj4+IDA7IGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOCkgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIHZhbHVlID0gKHZhbHVlIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPDwgIDcpID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuICAgICAgICB2YWx1ZSA9ICh2YWx1ZSB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IDE0KSA+Pj4gMDsgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KSByZXR1cm4gdmFsdWU7XHJcbiAgICAgICAgdmFsdWUgPSAodmFsdWUgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCAyMSkgPj4+IDA7IGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOCkgcmV0dXJuIHZhbHVlO1xyXG4gICAgICAgIHZhbHVlID0gKHZhbHVlIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmICAxNSkgPDwgMjgpID4+PiAwOyBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpIHJldHVybiB2YWx1ZTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgaWYgKCh0aGlzLnBvcyArPSA1KSA+IHRoaXMubGVuKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zID0gdGhpcy5sZW47XHJcbiAgICAgICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCAxMCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB2YWx1ZTtcclxuICAgIH07XHJcbn0pKCk7XHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYSBzaWduZWQgMzIgYml0IHZhbHVlLlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmludDMyID0gZnVuY3Rpb24gcmVhZF9pbnQzMigpIHtcclxuICAgIHJldHVybiB0aGlzLnVpbnQzMigpIHwgMDtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHppZy16YWcgZW5jb2RlZCB2YXJpbnQgYXMgYSBzaWduZWQgMzIgYml0IHZhbHVlLlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLnNpbnQzMiA9IGZ1bmN0aW9uIHJlYWRfc2ludDMyKCkge1xyXG4gICAgdmFyIHZhbHVlID0gdGhpcy51aW50MzIoKTtcclxuICAgIHJldHVybiB2YWx1ZSA+Pj4gMSBeIC0odmFsdWUgJiAxKSB8IDA7XHJcbn07XHJcblxyXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cclxuXHJcbmZ1bmN0aW9uIHJlYWRMb25nVmFyaW50KCkge1xyXG4gICAgLy8gdGVuZHMgdG8gZGVvcHQgd2l0aCBsb2NhbCB2YXJzIGZvciBvY3RldCBldGMuXHJcbiAgICB2YXIgYml0cyA9IG5ldyBMb25nQml0cygwLCAwKTtcclxuICAgIHZhciBpID0gMDtcclxuICAgIGlmICh0aGlzLmxlbiAtIHRoaXMucG9zID4gNCkgeyAvLyBmYXN0IHJvdXRlIChsbylcclxuICAgICAgICBmb3IgKDsgaSA8IDQ7ICsraSkge1xyXG4gICAgICAgICAgICAvLyAxc3QuLjR0aFxyXG4gICAgICAgICAgICBiaXRzLmxvID0gKGJpdHMubG8gfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCBpICogNykgPj4+IDA7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOClcclxuICAgICAgICAgICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyA1dGhcclxuICAgICAgICBiaXRzLmxvID0gKGJpdHMubG8gfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCAyOCkgPj4+IDA7XHJcbiAgICAgICAgYml0cy5oaSA9IChiaXRzLmhpIHwgKHRoaXMuYnVmW3RoaXMucG9zXSAmIDEyNykgPj4gIDQpID4+PiAwO1xyXG4gICAgICAgIGlmICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSA8IDEyOClcclxuICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgaSA9IDA7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZvciAoOyBpIDwgMzsgKytpKSB7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5sZW4pXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcyk7XHJcbiAgICAgICAgICAgIC8vIDFzdC4uM3RoXHJcbiAgICAgICAgICAgIGJpdHMubG8gPSAoYml0cy5sbyB8ICh0aGlzLmJ1Zlt0aGlzLnBvc10gJiAxMjcpIDw8IGkgKiA3KSA+Pj4gMDtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmW3RoaXMucG9zKytdIDwgMTI4KVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGJpdHM7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIDR0aFxyXG4gICAgICAgIGJpdHMubG8gPSAoYml0cy5sbyB8ICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSAmIDEyNykgPDwgaSAqIDcpID4+PiAwO1xyXG4gICAgICAgIHJldHVybiBiaXRzO1xyXG4gICAgfVxyXG4gICAgaWYgKHRoaXMubGVuIC0gdGhpcy5wb3MgPiA0KSB7IC8vIGZhc3Qgcm91dGUgKGhpKVxyXG4gICAgICAgIGZvciAoOyBpIDwgNTsgKytpKSB7XHJcbiAgICAgICAgICAgIC8vIDZ0aC4uMTB0aFxyXG4gICAgICAgICAgICBiaXRzLmhpID0gKGJpdHMuaGkgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCBpICogNyArIDMpID4+PiAwO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYml0cztcclxuICAgICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGZvciAoOyBpIDwgNTsgKytpKSB7XHJcbiAgICAgICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgICAgICBpZiAodGhpcy5wb3MgPj0gdGhpcy5sZW4pXHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcyk7XHJcbiAgICAgICAgICAgIC8vIDZ0aC4uMTB0aFxyXG4gICAgICAgICAgICBiaXRzLmhpID0gKGJpdHMuaGkgfCAodGhpcy5idWZbdGhpcy5wb3NdICYgMTI3KSA8PCBpICogNyArIDMpID4+PiAwO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZbdGhpcy5wb3MrK10gPCAxMjgpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYml0cztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgdGhyb3cgRXJyb3IoXCJpbnZhbGlkIHZhcmludCBlbmNvZGluZ1wiKTtcclxufVxyXG5cclxuLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHZhcmludCBhcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUuXHJcbiAqIEBuYW1lIFJlYWRlciNpbnQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSB2YXJpbnQgYXMgYW4gdW5zaWduZWQgNjQgYml0IHZhbHVlLlxyXG4gKiBAbmFtZSBSZWFkZXIjdWludDY0XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7TG9uZ30gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHppZy16YWcgZW5jb2RlZCB2YXJpbnQgYXMgYSBzaWduZWQgNjQgYml0IHZhbHVlLlxyXG4gKiBAbmFtZSBSZWFkZXIjc2ludDY0XHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7TG9uZ30gVmFsdWUgcmVhZFxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBhIHZhcmludCBhcyBhIGJvb2xlYW4uXHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLmJvb2wgPSBmdW5jdGlvbiByZWFkX2Jvb2woKSB7XHJcbiAgICByZXR1cm4gdGhpcy51aW50MzIoKSAhPT0gMDtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHJlYWRGaXhlZDMyX2VuZChidWYsIGVuZCkgeyAvLyBub3RlIHRoYXQgdGhpcyB1c2VzIGBlbmRgLCBub3QgYHBvc2BcclxuICAgIHJldHVybiAoYnVmW2VuZCAtIDRdXHJcbiAgICAgICAgICB8IGJ1ZltlbmQgLSAzXSA8PCA4XHJcbiAgICAgICAgICB8IGJ1ZltlbmQgLSAyXSA8PCAxNlxyXG4gICAgICAgICAgfCBidWZbZW5kIC0gMV0gPDwgMjQpID4+PiAwO1xyXG59XHJcblxyXG4vKipcclxuICogUmVhZHMgZml4ZWQgMzIgYml0cyBhcyBhbiB1bnNpZ25lZCAzMiBiaXQgaW50ZWdlci5cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5maXhlZDMyID0gZnVuY3Rpb24gcmVhZF9maXhlZDMyKCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMucG9zICsgNCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCA0KTtcclxuXHJcbiAgICByZXR1cm4gcmVhZEZpeGVkMzJfZW5kKHRoaXMuYnVmLCB0aGlzLnBvcyArPSA0KTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBmaXhlZCAzMiBiaXRzIGFzIGEgc2lnbmVkIDMyIGJpdCBpbnRlZ2VyLlxyXG4gKiBAcmV0dXJucyB7bnVtYmVyfSBWYWx1ZSByZWFkXHJcbiAqL1xyXG5SZWFkZXIucHJvdG90eXBlLnNmaXhlZDMyID0gZnVuY3Rpb24gcmVhZF9zZml4ZWQzMigpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDQgPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgNCk7XHJcblxyXG4gICAgcmV0dXJuIHJlYWRGaXhlZDMyX2VuZCh0aGlzLmJ1ZiwgdGhpcy5wb3MgKz0gNCkgfCAwO1xyXG59O1xyXG5cclxuLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXHJcblxyXG5mdW5jdGlvbiByZWFkRml4ZWQ2NCgvKiB0aGlzOiBSZWFkZXIgKi8pIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDggPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgOCk7XHJcblxyXG4gICAgcmV0dXJuIG5ldyBMb25nQml0cyhyZWFkRml4ZWQzMl9lbmQodGhpcy5idWYsIHRoaXMucG9zICs9IDQpLCByZWFkRml4ZWQzMl9lbmQodGhpcy5idWYsIHRoaXMucG9zICs9IDQpKTtcclxufVxyXG5cclxuLyogZXNsaW50LWVuYWJsZSBuby1pbnZhbGlkLXRoaXMgKi9cclxuXHJcbi8qKlxyXG4gKiBSZWFkcyBmaXhlZCA2NCBiaXRzLlxyXG4gKiBAbmFtZSBSZWFkZXIjZml4ZWQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgemlnLXphZyBlbmNvZGVkIGZpeGVkIDY0IGJpdHMuXHJcbiAqIEBuYW1lIFJlYWRlciNzZml4ZWQ2NFxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0xvbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblxyXG4vKipcclxuICogUmVhZHMgYSBmbG9hdCAoMzIgYml0KSBhcyBhIG51bWJlci5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuZmxvYXQgPSBmdW5jdGlvbiByZWFkX2Zsb2F0KCkge1xyXG5cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgaWYgKHRoaXMucG9zICsgNCA+IHRoaXMubGVuKVxyXG4gICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzLCA0KTtcclxuXHJcbiAgICB2YXIgdmFsdWUgPSB1dGlsLmZsb2F0LnJlYWRGbG9hdExFKHRoaXMuYnVmLCB0aGlzLnBvcyk7XHJcbiAgICB0aGlzLnBvcyArPSA0O1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgZG91YmxlICg2NCBiaXQgZmxvYXQpIGFzIGEgbnVtYmVyLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge251bWJlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5kb3VibGUgPSBmdW5jdGlvbiByZWFkX2RvdWJsZSgpIHtcclxuXHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICh0aGlzLnBvcyArIDggPiB0aGlzLmxlbilcclxuICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgNCk7XHJcblxyXG4gICAgdmFyIHZhbHVlID0gdXRpbC5mbG9hdC5yZWFkRG91YmxlTEUodGhpcy5idWYsIHRoaXMucG9zKTtcclxuICAgIHRoaXMucG9zICs9IDg7XHJcbiAgICByZXR1cm4gdmFsdWU7XHJcbn07XHJcblxyXG4vKipcclxuICogUmVhZHMgYSBzZXF1ZW5jZSBvZiBieXRlcyBwcmVjZWVkZWQgYnkgaXRzIGxlbmd0aCBhcyBhIHZhcmludC5cclxuICogQHJldHVybnMge1VpbnQ4QXJyYXl9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuYnl0ZXMgPSBmdW5jdGlvbiByZWFkX2J5dGVzKCkge1xyXG4gICAgdmFyIGxlbmd0aCA9IHRoaXMudWludDMyKCksXHJcbiAgICAgICAgc3RhcnQgID0gdGhpcy5wb3MsXHJcbiAgICAgICAgZW5kICAgID0gdGhpcy5wb3MgKyBsZW5ndGg7XHJcblxyXG4gICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICBpZiAoZW5kID4gdGhpcy5sZW4pXHJcbiAgICAgICAgdGhyb3cgaW5kZXhPdXRPZlJhbmdlKHRoaXMsIGxlbmd0aCk7XHJcblxyXG4gICAgdGhpcy5wb3MgKz0gbGVuZ3RoO1xyXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcy5idWYpKSAvLyBwbGFpbiBhcnJheVxyXG4gICAgICAgIHJldHVybiB0aGlzLmJ1Zi5zbGljZShzdGFydCwgZW5kKTtcclxuICAgIHJldHVybiBzdGFydCA9PT0gZW5kIC8vIGZpeCBmb3IgSUUgMTAvV2luOCBhbmQgb3RoZXJzJyBzdWJhcnJheSByZXR1cm5pbmcgYXJyYXkgb2Ygc2l6ZSAxXHJcbiAgICAgICAgPyBuZXcgdGhpcy5idWYuY29uc3RydWN0b3IoMClcclxuICAgICAgICA6IHRoaXMuX3NsaWNlLmNhbGwodGhpcy5idWYsIHN0YXJ0LCBlbmQpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc3RyaW5nIHByZWNlZWRlZCBieSBpdHMgYnl0ZSBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IFZhbHVlIHJlYWRcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gcmVhZF9zdHJpbmcoKSB7XHJcbiAgICB2YXIgYnl0ZXMgPSB0aGlzLmJ5dGVzKCk7XHJcbiAgICByZXR1cm4gdXRmOC5yZWFkKGJ5dGVzLCAwLCBieXRlcy5sZW5ndGgpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFNraXBzIHRoZSBzcGVjaWZpZWQgbnVtYmVyIG9mIGJ5dGVzIGlmIHNwZWNpZmllZCwgb3RoZXJ3aXNlIHNraXBzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge251bWJlcn0gW2xlbmd0aF0gTGVuZ3RoIGlmIGtub3duLCBvdGhlcndpc2UgYSB2YXJpbnQgaXMgYXNzdW1lZFxyXG4gKiBAcmV0dXJucyB7UmVhZGVyfSBgdGhpc2BcclxuICovXHJcblJlYWRlci5wcm90b3R5cGUuc2tpcCA9IGZ1bmN0aW9uIHNraXAobGVuZ3RoKSB7XHJcbiAgICBpZiAodHlwZW9mIGxlbmd0aCA9PT0gXCJudW1iZXJcIikge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBpZiAqL1xyXG4gICAgICAgIGlmICh0aGlzLnBvcyArIGxlbmd0aCA+IHRoaXMubGVuKVxyXG4gICAgICAgICAgICB0aHJvdyBpbmRleE91dE9mUmFuZ2UodGhpcywgbGVuZ3RoKTtcclxuICAgICAgICB0aGlzLnBvcyArPSBsZW5ndGg7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGRvIHtcclxuICAgICAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIGlmICovXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnBvcyA+PSB0aGlzLmxlbilcclxuICAgICAgICAgICAgICAgIHRocm93IGluZGV4T3V0T2ZSYW5nZSh0aGlzKTtcclxuICAgICAgICB9IHdoaWxlICh0aGlzLmJ1Zlt0aGlzLnBvcysrXSAmIDEyOCk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBTa2lwcyB0aGUgbmV4dCBlbGVtZW50IG9mIHRoZSBzcGVjaWZpZWQgd2lyZSB0eXBlLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gd2lyZVR5cGUgV2lyZSB0eXBlIHJlY2VpdmVkXHJcbiAqIEByZXR1cm5zIHtSZWFkZXJ9IGB0aGlzYFxyXG4gKi9cclxuUmVhZGVyLnByb3RvdHlwZS5za2lwVHlwZSA9IGZ1bmN0aW9uKHdpcmVUeXBlKSB7XHJcbiAgICBzd2l0Y2ggKHdpcmVUeXBlKSB7XHJcbiAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICB0aGlzLnNraXAoKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICB0aGlzLnNraXAoOCk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgdGhpcy5za2lwKHRoaXMudWludDMyKCkpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgIHdoaWxlICgod2lyZVR5cGUgPSB0aGlzLnVpbnQzMigpICYgNykgIT09IDQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2tpcFR5cGUod2lyZVR5cGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgdGhpcy5za2lwKDQpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyBFcnJvcihcImludmFsaWQgd2lyZSB0eXBlIFwiICsgd2lyZVR5cGUgKyBcIiBhdCBvZmZzZXQgXCIgKyB0aGlzLnBvcyk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcblJlYWRlci5fY29uZmlndXJlID0gZnVuY3Rpb24oQnVmZmVyUmVhZGVyXykge1xyXG4gICAgQnVmZmVyUmVhZGVyID0gQnVmZmVyUmVhZGVyXztcclxuXHJcbiAgICB2YXIgZm4gPSB1dGlsLkxvbmcgPyBcInRvTG9uZ1wiIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gXCJ0b051bWJlclwiO1xyXG4gICAgdXRpbC5tZXJnZShSZWFkZXIucHJvdG90eXBlLCB7XHJcblxyXG4gICAgICAgIGludDY0OiBmdW5jdGlvbiByZWFkX2ludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKVtmbl0oZmFsc2UpO1xyXG4gICAgICAgIH0sXHJcblxyXG4gICAgICAgIHVpbnQ2NDogZnVuY3Rpb24gcmVhZF91aW50NjQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWFkTG9uZ1ZhcmludC5jYWxsKHRoaXMpW2ZuXSh0cnVlKTtcclxuICAgICAgICB9LFxyXG5cclxuICAgICAgICBzaW50NjQ6IGZ1bmN0aW9uIHJlYWRfc2ludDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZExvbmdWYXJpbnQuY2FsbCh0aGlzKS56ekRlY29kZSgpW2ZuXShmYWxzZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgZml4ZWQ2NDogZnVuY3Rpb24gcmVhZF9maXhlZDY0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVhZEZpeGVkNjQuY2FsbCh0aGlzKVtmbl0odHJ1ZSk7XHJcbiAgICAgICAgfSxcclxuXHJcbiAgICAgICAgc2ZpeGVkNjQ6IGZ1bmN0aW9uIHJlYWRfc2ZpeGVkNjQoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiByZWFkRml4ZWQ2NC5jYWxsKHRoaXMpW2ZuXShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH0pO1xyXG59O1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBCdWZmZXJSZWFkZXI7XHJcblxyXG4vLyBleHRlbmRzIFJlYWRlclxyXG52YXIgUmVhZGVyID0gcmVxdWlyZShcIi4vcmVhZGVyXCIpO1xyXG4oQnVmZmVyUmVhZGVyLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoUmVhZGVyLnByb3RvdHlwZSkpLmNvbnN0cnVjdG9yID0gQnVmZmVyUmVhZGVyO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyBidWZmZXIgcmVhZGVyIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFdpcmUgZm9ybWF0IHJlYWRlciB1c2luZyBub2RlIGJ1ZmZlcnMuXHJcbiAqIEBleHRlbmRzIFJlYWRlclxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtCdWZmZXJ9IGJ1ZmZlciBCdWZmZXIgdG8gcmVhZCBmcm9tXHJcbiAqL1xyXG5mdW5jdGlvbiBCdWZmZXJSZWFkZXIoYnVmZmVyKSB7XHJcbiAgICBSZWFkZXIuY2FsbCh0aGlzLCBidWZmZXIpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUmVhZCBidWZmZXIuXHJcbiAgICAgKiBAbmFtZSBCdWZmZXJSZWFkZXIjYnVmXHJcbiAgICAgKiBAdHlwZSB7QnVmZmVyfVxyXG4gICAgICovXHJcbn1cclxuXHJcbi8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbmlmICh1dGlsLkJ1ZmZlcilcclxuICAgIEJ1ZmZlclJlYWRlci5wcm90b3R5cGUuX3NsaWNlID0gdXRpbC5CdWZmZXIucHJvdG90eXBlLnNsaWNlO1xyXG5cclxuLyoqXHJcbiAqIEBvdmVycmlkZVxyXG4gKi9cclxuQnVmZmVyUmVhZGVyLnByb3RvdHlwZS5zdHJpbmcgPSBmdW5jdGlvbiByZWFkX3N0cmluZ19idWZmZXIoKSB7XHJcbiAgICB2YXIgbGVuID0gdGhpcy51aW50MzIoKTsgLy8gbW9kaWZpZXMgcG9zXHJcbiAgICByZXR1cm4gdGhpcy5idWYudXRmOFNsaWNlKHRoaXMucG9zLCB0aGlzLnBvcyA9IE1hdGgubWluKHRoaXMucG9zICsgbGVuLCB0aGlzLmxlbikpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFJlYWRzIGEgc2VxdWVuY2Ugb2YgYnl0ZXMgcHJlY2VlZGVkIGJ5IGl0cyBsZW5ndGggYXMgYSB2YXJpbnQuXHJcbiAqIEBuYW1lIEJ1ZmZlclJlYWRlciNieXRlc1xyXG4gKiBAZnVuY3Rpb25cclxuICogQHJldHVybnMge0J1ZmZlcn0gVmFsdWUgcmVhZFxyXG4gKi9cclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0ge307XHJcblxyXG4vKipcclxuICogTmFtZWQgcm9vdHMuXHJcbiAqIFRoaXMgaXMgd2hlcmUgcGJqcyBzdG9yZXMgZ2VuZXJhdGVkIHN0cnVjdHVyZXMgKHRoZSBvcHRpb24gYC1yLCAtLXJvb3RgIHNwZWNpZmllcyBhIG5hbWUpLlxyXG4gKiBDYW4gYWxzbyBiZSB1c2VkIG1hbnVhbGx5IHRvIG1ha2Ugcm9vdHMgYXZhaWxhYmxlIGFjY3Jvc3MgbW9kdWxlcy5cclxuICogQG5hbWUgcm9vdHNcclxuICogQHR5cGUge09iamVjdC48c3RyaW5nLFJvb3Q+fVxyXG4gKiBAZXhhbXBsZVxyXG4gKiAvLyBwYmpzIC1yIG15cm9vdCAtbyBjb21waWxlZC5qcyAuLi5cclxuICpcclxuICogLy8gaW4gYW5vdGhlciBtb2R1bGU6XHJcbiAqIHJlcXVpcmUoXCIuL2NvbXBpbGVkLmpzXCIpO1xyXG4gKlxyXG4gKiAvLyBpbiBhbnkgc3Vic2VxdWVudCBtb2R1bGU6XHJcbiAqIHZhciByb290ID0gcHJvdG9idWYucm9vdHNbXCJteXJvb3RcIl07XHJcbiAqL1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxuXHJcbi8qKlxyXG4gKiBTdHJlYW1pbmcgUlBDIGhlbHBlcnMuXHJcbiAqIEBuYW1lc3BhY2VcclxuICovXHJcbnZhciBycGMgPSBleHBvcnRzO1xyXG5cclxuLyoqXHJcbiAqIFJQQyBpbXBsZW1lbnRhdGlvbiBwYXNzZWQgdG8ge0BsaW5rIFNlcnZpY2UjY3JlYXRlfSBwZXJmb3JtaW5nIGEgc2VydmljZSByZXF1ZXN0IG9uIG5ldHdvcmsgbGV2ZWwsIGkuZS4gYnkgdXRpbGl6aW5nIGh0dHAgcmVxdWVzdHMgb3Igd2Vic29ja2V0cy5cclxuICogQHR5cGVkZWYgUlBDSW1wbFxyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7TWV0aG9kfHJwYy5TZXJ2aWNlTWV0aG9kPE1lc3NhZ2U8e30+LE1lc3NhZ2U8e30+Pn0gbWV0aG9kIFJlZmxlY3RlZCBvciBzdGF0aWMgbWV0aG9kIGJlaW5nIGNhbGxlZFxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl9IHJlcXVlc3REYXRhIFJlcXVlc3QgZGF0YVxyXG4gKiBAcGFyYW0ge1JQQ0ltcGxDYWxsYmFja30gY2FsbGJhY2sgQ2FsbGJhY2sgZnVuY3Rpb25cclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICogQGV4YW1wbGVcclxuICogZnVuY3Rpb24gcnBjSW1wbChtZXRob2QsIHJlcXVlc3REYXRhLCBjYWxsYmFjaykge1xyXG4gKiAgICAgaWYgKHByb3RvYnVmLnV0aWwubGNGaXJzdChtZXRob2QubmFtZSkgIT09IFwibXlNZXRob2RcIikgLy8gY29tcGF0aWJsZSB3aXRoIHN0YXRpYyBjb2RlXHJcbiAqICAgICAgICAgdGhyb3cgRXJyb3IoXCJubyBzdWNoIG1ldGhvZFwiKTtcclxuICogICAgIGFzeW5jaHJvbm91c2x5T2J0YWluQVJlc3BvbnNlKHJlcXVlc3REYXRhLCBmdW5jdGlvbihlcnIsIHJlc3BvbnNlRGF0YSkge1xyXG4gKiAgICAgICAgIGNhbGxiYWNrKGVyciwgcmVzcG9uc2VEYXRhKTtcclxuICogICAgIH0pO1xyXG4gKiB9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIE5vZGUtc3R5bGUgY2FsbGJhY2sgYXMgdXNlZCBieSB7QGxpbmsgUlBDSW1wbH0uXHJcbiAqIEB0eXBlZGVmIFJQQ0ltcGxDYWxsYmFja1xyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7RXJyb3J8bnVsbH0gZXJyb3IgRXJyb3IsIGlmIGFueSwgb3RoZXJ3aXNlIGBudWxsYFxyXG4gKiBAcGFyYW0ge1VpbnQ4QXJyYXl8bnVsbH0gW3Jlc3BvbnNlXSBSZXNwb25zZSBkYXRhIG9yIGBudWxsYCB0byBzaWduYWwgZW5kIG9mIHN0cmVhbSwgaWYgdGhlcmUgaGFzbid0IGJlZW4gYW4gZXJyb3JcclxuICogQHJldHVybnMge3VuZGVmaW5lZH1cclxuICovXHJcblxyXG5ycGMuU2VydmljZSA9IHJlcXVpcmUoXCIuL3JwYy9zZXJ2aWNlXCIpO1xyXG4iLCJcInVzZSBzdHJpY3RcIjtcclxubW9kdWxlLmV4cG9ydHMgPSBTZXJ2aWNlO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxuLy8gRXh0ZW5kcyBFdmVudEVtaXR0ZXJcclxuKFNlcnZpY2UucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZSh1dGlsLkV2ZW50RW1pdHRlci5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IFNlcnZpY2U7XHJcblxyXG4vKipcclxuICogQSBzZXJ2aWNlIG1ldGhvZCBjYWxsYmFjayBhcyB1c2VkIGJ5IHtAbGluayBycGMuU2VydmljZU1ldGhvZHxTZXJ2aWNlTWV0aG9kfS5cclxuICpcclxuICogRGlmZmVycyBmcm9tIHtAbGluayBSUENJbXBsQ2FsbGJhY2t9IGluIHRoYXQgaXQgaXMgYW4gYWN0dWFsIGNhbGxiYWNrIG9mIGEgc2VydmljZSBtZXRob2Qgd2hpY2ggbWF5IG5vdCByZXR1cm4gYHJlc3BvbnNlID0gbnVsbGAuXHJcbiAqIEB0eXBlZGVmIHJwYy5TZXJ2aWNlTWV0aG9kQ2FsbGJhY2tcclxuICogQHRlbXBsYXRlIFRSZXMgZXh0ZW5kcyBNZXNzYWdlPFRSZXM+XHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtFcnJvcnxudWxsfSBlcnJvciBFcnJvciwgaWYgYW55XHJcbiAqIEBwYXJhbSB7VFJlc30gW3Jlc3BvbnNlXSBSZXNwb25zZSBtZXNzYWdlXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEEgc2VydmljZSBtZXRob2QgcGFydCBvZiBhIHtAbGluayBycGMuU2VydmljZX0gYXMgY3JlYXRlZCBieSB7QGxpbmsgU2VydmljZS5jcmVhdGV9LlxyXG4gKiBAdHlwZWRlZiBycGMuU2VydmljZU1ldGhvZFxyXG4gKiBAdGVtcGxhdGUgVFJlcSBleHRlbmRzIE1lc3NhZ2U8VFJlcT5cclxuICogQHRlbXBsYXRlIFRSZXMgZXh0ZW5kcyBNZXNzYWdlPFRSZXM+XHJcbiAqIEB0eXBlIHtmdW5jdGlvbn1cclxuICogQHBhcmFtIHtUUmVxfFByb3BlcnRpZXM8VFJlcT59IHJlcXVlc3QgUmVxdWVzdCBtZXNzYWdlIG9yIHBsYWluIG9iamVjdFxyXG4gKiBAcGFyYW0ge3JwYy5TZXJ2aWNlTWV0aG9kQ2FsbGJhY2s8VFJlcz59IFtjYWxsYmFja10gTm9kZS1zdHlsZSBjYWxsYmFjayBjYWxsZWQgd2l0aCB0aGUgZXJyb3IsIGlmIGFueSwgYW5kIHRoZSByZXNwb25zZSBtZXNzYWdlXHJcbiAqIEByZXR1cm5zIHtQcm9taXNlPE1lc3NhZ2U8VFJlcz4+fSBQcm9taXNlIGlmIGBjYWxsYmFja2AgaGFzIGJlZW4gb21pdHRlZCwgb3RoZXJ3aXNlIGB1bmRlZmluZWRgXHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgUlBDIHNlcnZpY2UgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgQW4gUlBDIHNlcnZpY2UgYXMgcmV0dXJuZWQgYnkge0BsaW5rIFNlcnZpY2UjY3JlYXRlfS5cclxuICogQGV4cG9ydHMgcnBjLlNlcnZpY2VcclxuICogQGV4dGVuZHMgdXRpbC5FdmVudEVtaXR0ZXJcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7UlBDSW1wbH0gcnBjSW1wbCBSUEMgaW1wbGVtZW50YXRpb25cclxuICogQHBhcmFtIHtib29sZWFufSBbcmVxdWVzdERlbGltaXRlZD1mYWxzZV0gV2hldGhlciByZXF1ZXN0cyBhcmUgbGVuZ3RoLWRlbGltaXRlZFxyXG4gKiBAcGFyYW0ge2Jvb2xlYW59IFtyZXNwb25zZURlbGltaXRlZD1mYWxzZV0gV2hldGhlciByZXNwb25zZXMgYXJlIGxlbmd0aC1kZWxpbWl0ZWRcclxuICovXHJcbmZ1bmN0aW9uIFNlcnZpY2UocnBjSW1wbCwgcmVxdWVzdERlbGltaXRlZCwgcmVzcG9uc2VEZWxpbWl0ZWQpIHtcclxuXHJcbiAgICBpZiAodHlwZW9mIHJwY0ltcGwgIT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICB0aHJvdyBUeXBlRXJyb3IoXCJycGNJbXBsIG11c3QgYmUgYSBmdW5jdGlvblwiKTtcclxuXHJcbiAgICB1dGlsLkV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogUlBDIGltcGxlbWVudGF0aW9uLiBCZWNvbWVzIGBudWxsYCBvbmNlIHRoZSBzZXJ2aWNlIGlzIGVuZGVkLlxyXG4gICAgICogQHR5cGUge1JQQ0ltcGx8bnVsbH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5ycGNJbXBsID0gcnBjSW1wbDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVxdWVzdHMgYXJlIGxlbmd0aC1kZWxpbWl0ZWQuXHJcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5yZXF1ZXN0RGVsaW1pdGVkID0gQm9vbGVhbihyZXF1ZXN0RGVsaW1pdGVkKTtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgcmVzcG9uc2VzIGFyZSBsZW5ndGgtZGVsaW1pdGVkLlxyXG4gICAgICogQHR5cGUge2Jvb2xlYW59XHJcbiAgICAgKi9cclxuICAgIHRoaXMucmVzcG9uc2VEZWxpbWl0ZWQgPSBCb29sZWFuKHJlc3BvbnNlRGVsaW1pdGVkKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENhbGxzIGEgc2VydmljZSBtZXRob2QgdGhyb3VnaCB7QGxpbmsgcnBjLlNlcnZpY2UjcnBjSW1wbHxycGNJbXBsfS5cclxuICogQHBhcmFtIHtNZXRob2R8cnBjLlNlcnZpY2VNZXRob2Q8VFJlcSxUUmVzPn0gbWV0aG9kIFJlZmxlY3RlZCBvciBzdGF0aWMgbWV0aG9kXHJcbiAqIEBwYXJhbSB7Q29uc3RydWN0b3I8VFJlcT59IHJlcXVlc3RDdG9yIFJlcXVlc3QgY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtDb25zdHJ1Y3RvcjxUUmVzPn0gcmVzcG9uc2VDdG9yIFJlc3BvbnNlIGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7VFJlcXxQcm9wZXJ0aWVzPFRSZXE+fSByZXF1ZXN0IFJlcXVlc3QgbWVzc2FnZSBvciBwbGFpbiBvYmplY3RcclxuICogQHBhcmFtIHtycGMuU2VydmljZU1ldGhvZENhbGxiYWNrPFRSZXM+fSBjYWxsYmFjayBTZXJ2aWNlIGNhbGxiYWNrXHJcbiAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAqIEB0ZW1wbGF0ZSBUUmVxIGV4dGVuZHMgTWVzc2FnZTxUUmVxPlxyXG4gKiBAdGVtcGxhdGUgVFJlcyBleHRlbmRzIE1lc3NhZ2U8VFJlcz5cclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLnJwY0NhbGwgPSBmdW5jdGlvbiBycGNDYWxsKG1ldGhvZCwgcmVxdWVzdEN0b3IsIHJlc3BvbnNlQ3RvciwgcmVxdWVzdCwgY2FsbGJhY2spIHtcclxuXHJcbiAgICBpZiAoIXJlcXVlc3QpXHJcbiAgICAgICAgdGhyb3cgVHlwZUVycm9yKFwicmVxdWVzdCBtdXN0IGJlIHNwZWNpZmllZFwiKTtcclxuXHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICBpZiAoIWNhbGxiYWNrKVxyXG4gICAgICAgIHJldHVybiB1dGlsLmFzUHJvbWlzZShycGNDYWxsLCBzZWxmLCBtZXRob2QsIHJlcXVlc3RDdG9yLCByZXNwb25zZUN0b3IsIHJlcXVlc3QpO1xyXG5cclxuICAgIGlmICghc2VsZi5ycGNJbXBsKSB7XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHsgY2FsbGJhY2soRXJyb3IoXCJhbHJlYWR5IGVuZGVkXCIpKTsgfSwgMCk7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAgIHJldHVybiBzZWxmLnJwY0ltcGwoXHJcbiAgICAgICAgICAgIG1ldGhvZCxcclxuICAgICAgICAgICAgcmVxdWVzdEN0b3Jbc2VsZi5yZXF1ZXN0RGVsaW1pdGVkID8gXCJlbmNvZGVEZWxpbWl0ZWRcIiA6IFwiZW5jb2RlXCJdKHJlcXVlc3QpLmZpbmlzaCgpLFxyXG4gICAgICAgICAgICBmdW5jdGlvbiBycGNDYWxsYmFjayhlcnIsIHJlc3BvbnNlKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmVuZCgvKiBlbmRlZEJ5UlBDICovIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCEocmVzcG9uc2UgaW5zdGFuY2VvZiByZXNwb25zZUN0b3IpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UgPSByZXNwb25zZUN0b3Jbc2VsZi5yZXNwb25zZURlbGltaXRlZCA/IFwiZGVjb2RlRGVsaW1pdGVkXCIgOiBcImRlY29kZVwiXShyZXNwb25zZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHNlbGYuZW1pdChcImRhdGFcIiwgcmVzcG9uc2UsIG1ldGhvZCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgcmVzcG9uc2UpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgKTtcclxuICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgIHNlbGYuZW1pdChcImVycm9yXCIsIGVyciwgbWV0aG9kKTtcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkgeyBjYWxsYmFjayhlcnIpOyB9LCAwKTtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIEVuZHMgdGhpcyBzZXJ2aWNlIGFuZCBlbWl0cyB0aGUgYGVuZGAgZXZlbnQuXHJcbiAqIEBwYXJhbSB7Ym9vbGVhbn0gW2VuZGVkQnlSUEM9ZmFsc2VdIFdoZXRoZXIgdGhlIHNlcnZpY2UgaGFzIGJlZW4gZW5kZWQgYnkgdGhlIFJQQyBpbXBsZW1lbnRhdGlvbi5cclxuICogQHJldHVybnMge3JwYy5TZXJ2aWNlfSBgdGhpc2BcclxuICovXHJcblNlcnZpY2UucHJvdG90eXBlLmVuZCA9IGZ1bmN0aW9uIGVuZChlbmRlZEJ5UlBDKSB7XHJcbiAgICBpZiAodGhpcy5ycGNJbXBsKSB7XHJcbiAgICAgICAgaWYgKCFlbmRlZEJ5UlBDKSAvLyBzaWduYWwgZW5kIHRvIHJwY0ltcGxcclxuICAgICAgICAgICAgdGhpcy5ycGNJbXBsKG51bGwsIG51bGwsIG51bGwpO1xyXG4gICAgICAgIHRoaXMucnBjSW1wbCA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5lbWl0KFwiZW5kXCIpLm9mZigpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IExvbmdCaXRzO1xyXG5cclxudmFyIHV0aWwgPSByZXF1aXJlKFwiLi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cy5cclxuICogQGNsYXNzZGVzYyBIZWxwZXIgY2xhc3MgZm9yIHdvcmtpbmcgd2l0aCB0aGUgbG93IGFuZCBoaWdoIGJpdHMgb2YgYSA2NCBiaXQgdmFsdWUuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge251bWJlcn0gbG8gTG93IDMyIGJpdHMsIHVuc2lnbmVkXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBoaSBIaWdoIDMyIGJpdHMsIHVuc2lnbmVkXHJcbiAqL1xyXG5mdW5jdGlvbiBMb25nQml0cyhsbywgaGkpIHtcclxuXHJcbiAgICAvLyBub3RlIHRoYXQgdGhlIGNhc3RzIGJlbG93IGFyZSB0aGVvcmV0aWNhbGx5IHVubmVjZXNzYXJ5IGFzIG9mIHRvZGF5LCBidXQgb2xkZXIgc3RhdGljYWxseVxyXG4gICAgLy8gZ2VuZXJhdGVkIGNvbnZlcnRlciBjb2RlIG1pZ2h0IHN0aWxsIGNhbGwgdGhlIGN0b3Igd2l0aCBzaWduZWQgMzJiaXRzLiBrZXB0IGZvciBjb21wYXQuXHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMb3cgYml0cy5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMubG8gPSBsbyA+Pj4gMDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEhpZ2ggYml0cy5cclxuICAgICAqIEB0eXBlIHtudW1iZXJ9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuaGkgPSBoaSA+Pj4gMDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFplcm8gYml0cy5cclxuICogQG1lbWJlcm9mIHV0aWwuTG9uZ0JpdHNcclxuICogQHR5cGUge3V0aWwuTG9uZ0JpdHN9XHJcbiAqL1xyXG52YXIgemVybyA9IExvbmdCaXRzLnplcm8gPSBuZXcgTG9uZ0JpdHMoMCwgMCk7XHJcblxyXG56ZXJvLnRvTnVtYmVyID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xyXG56ZXJvLnp6RW5jb2RlID0gemVyby56ekRlY29kZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfTtcclxuemVyby5sZW5ndGggPSBmdW5jdGlvbigpIHsgcmV0dXJuIDE7IH07XHJcblxyXG4vKipcclxuICogWmVybyBoYXNoLlxyXG4gKiBAbWVtYmVyb2YgdXRpbC5Mb25nQml0c1xyXG4gKiBAdHlwZSB7c3RyaW5nfVxyXG4gKi9cclxudmFyIHplcm9IYXNoID0gTG9uZ0JpdHMuemVyb0hhc2ggPSBcIlxcMFxcMFxcMFxcMFxcMFxcMFxcMFxcMFwiO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgbmV3IGxvbmcgYml0cyBmcm9tIHRoZSBzcGVjaWZpZWQgbnVtYmVyLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWVcclxuICogQHJldHVybnMge3V0aWwuTG9uZ0JpdHN9IEluc3RhbmNlXHJcbiAqL1xyXG5Mb25nQml0cy5mcm9tTnVtYmVyID0gZnVuY3Rpb24gZnJvbU51bWJlcih2YWx1ZSkge1xyXG4gICAgaWYgKHZhbHVlID09PSAwKVxyXG4gICAgICAgIHJldHVybiB6ZXJvO1xyXG4gICAgdmFyIHNpZ24gPSB2YWx1ZSA8IDA7XHJcbiAgICBpZiAoc2lnbilcclxuICAgICAgICB2YWx1ZSA9IC12YWx1ZTtcclxuICAgIHZhciBsbyA9IHZhbHVlID4+PiAwLFxyXG4gICAgICAgIGhpID0gKHZhbHVlIC0gbG8pIC8gNDI5NDk2NzI5NiA+Pj4gMDtcclxuICAgIGlmIChzaWduKSB7XHJcbiAgICAgICAgaGkgPSB+aGkgPj4+IDA7XHJcbiAgICAgICAgbG8gPSB+bG8gPj4+IDA7XHJcbiAgICAgICAgaWYgKCsrbG8gPiA0Mjk0OTY3Mjk1KSB7XHJcbiAgICAgICAgICAgIGxvID0gMDtcclxuICAgICAgICAgICAgaWYgKCsraGkgPiA0Mjk0OTY3Mjk1KVxyXG4gICAgICAgICAgICAgICAgaGkgPSAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMobG8sIGhpKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIG5ldyBsb25nIGJpdHMgZnJvbSBhIG51bWJlciwgbG9uZyBvciBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZVxyXG4gKiBAcmV0dXJucyB7dXRpbC5Mb25nQml0c30gSW5zdGFuY2VcclxuICovXHJcbkxvbmdCaXRzLmZyb20gPSBmdW5jdGlvbiBmcm9tKHZhbHVlKSB7XHJcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcIm51bWJlclwiKVxyXG4gICAgICAgIHJldHVybiBMb25nQml0cy5mcm9tTnVtYmVyKHZhbHVlKTtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSkge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBlbHNlICovXHJcbiAgICAgICAgaWYgKHV0aWwuTG9uZylcclxuICAgICAgICAgICAgdmFsdWUgPSB1dGlsLkxvbmcuZnJvbVN0cmluZyh2YWx1ZSk7XHJcbiAgICAgICAgZWxzZVxyXG4gICAgICAgICAgICByZXR1cm4gTG9uZ0JpdHMuZnJvbU51bWJlcihwYXJzZUludCh2YWx1ZSwgMTApKTtcclxuICAgIH1cclxuICAgIHJldHVybiB2YWx1ZS5sb3cgfHwgdmFsdWUuaGlnaCA/IG5ldyBMb25nQml0cyh2YWx1ZS5sb3cgPj4+IDAsIHZhbHVlLmhpZ2ggPj4+IDApIDogemVybztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGxvbmcgYml0cyB0byBhIHBvc3NpYmx5IHVuc2FmZSBKYXZhU2NyaXB0IG51bWJlci5cclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtudW1iZXJ9IFBvc3NpYmx5IHVuc2FmZSBudW1iZXJcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b051bWJlciA9IGZ1bmN0aW9uIHRvTnVtYmVyKHVuc2lnbmVkKSB7XHJcbiAgICBpZiAoIXVuc2lnbmVkICYmIHRoaXMuaGkgPj4+IDMxKSB7XHJcbiAgICAgICAgdmFyIGxvID0gfnRoaXMubG8gKyAxID4+PiAwLFxyXG4gICAgICAgICAgICBoaSA9IH50aGlzLmhpICAgICA+Pj4gMDtcclxuICAgICAgICBpZiAoIWxvKVxyXG4gICAgICAgICAgICBoaSA9IGhpICsgMSA+Pj4gMDtcclxuICAgICAgICByZXR1cm4gLShsbyArIGhpICogNDI5NDk2NzI5Nik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcy5sbyArIHRoaXMuaGkgKiA0Mjk0OTY3Mjk2O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIHRoaXMgbG9uZyBiaXRzIHRvIGEgbG9uZy5cclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtMb25nfSBMb25nXHJcbiAqL1xyXG5Mb25nQml0cy5wcm90b3R5cGUudG9Mb25nID0gZnVuY3Rpb24gdG9Mb25nKHVuc2lnbmVkKSB7XHJcbiAgICByZXR1cm4gdXRpbC5Mb25nXHJcbiAgICAgICAgPyBuZXcgdXRpbC5Mb25nKHRoaXMubG8gfCAwLCB0aGlzLmhpIHwgMCwgQm9vbGVhbih1bnNpZ25lZCkpXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICA6IHsgbG93OiB0aGlzLmxvIHwgMCwgaGlnaDogdGhpcy5oaSB8IDAsIHVuc2lnbmVkOiBCb29sZWFuKHVuc2lnbmVkKSB9O1xyXG59O1xyXG5cclxudmFyIGNoYXJDb2RlQXQgPSBTdHJpbmcucHJvdG90eXBlLmNoYXJDb2RlQXQ7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBuZXcgbG9uZyBiaXRzIGZyb20gdGhlIHNwZWNpZmllZCA4IGNoYXJhY3RlcnMgbG9uZyBoYXNoLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gaGFzaCBIYXNoXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBCaXRzXHJcbiAqL1xyXG5Mb25nQml0cy5mcm9tSGFzaCA9IGZ1bmN0aW9uIGZyb21IYXNoKGhhc2gpIHtcclxuICAgIGlmIChoYXNoID09PSB6ZXJvSGFzaClcclxuICAgICAgICByZXR1cm4gemVybztcclxuICAgIHJldHVybiBuZXcgTG9uZ0JpdHMoXHJcbiAgICAgICAgKCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgMClcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAxKSA8PCA4XHJcbiAgICAgICAgfCBjaGFyQ29kZUF0LmNhbGwoaGFzaCwgMikgPDwgMTZcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCAzKSA8PCAyNCkgPj4+IDBcclxuICAgICxcclxuICAgICAgICAoIGNoYXJDb2RlQXQuY2FsbChoYXNoLCA0KVxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDUpIDw8IDhcclxuICAgICAgICB8IGNoYXJDb2RlQXQuY2FsbChoYXNoLCA2KSA8PCAxNlxyXG4gICAgICAgIHwgY2hhckNvZGVBdC5jYWxsKGhhc2gsIDcpIDw8IDI0KSA+Pj4gMFxyXG4gICAgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGlzIGxvbmcgYml0cyB0byBhIDggY2hhcmFjdGVycyBsb25nIGhhc2guXHJcbiAqIEByZXR1cm5zIHtzdHJpbmd9IEhhc2hcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS50b0hhc2ggPSBmdW5jdGlvbiB0b0hhc2goKSB7XHJcbiAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShcclxuICAgICAgICB0aGlzLmxvICAgICAgICAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiA4ICAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiAxNiAmIDI1NSxcclxuICAgICAgICB0aGlzLmxvID4+PiAyNCAgICAgICxcclxuICAgICAgICB0aGlzLmhpICAgICAgICAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiA4ICAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiAxNiAmIDI1NSxcclxuICAgICAgICB0aGlzLmhpID4+PiAyNFxyXG4gICAgKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBaaWctemFnIGVuY29kZXMgdGhpcyBsb25nIGJpdHMuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBgdGhpc2BcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS56ekVuY29kZSA9IGZ1bmN0aW9uIHp6RW5jb2RlKCkge1xyXG4gICAgdmFyIG1hc2sgPSAgIHRoaXMuaGkgPj4gMzE7XHJcbiAgICB0aGlzLmhpICA9ICgodGhpcy5oaSA8PCAxIHwgdGhpcy5sbyA+Pj4gMzEpIF4gbWFzaykgPj4+IDA7XHJcbiAgICB0aGlzLmxvICA9ICggdGhpcy5sbyA8PCAxICAgICAgICAgICAgICAgICAgIF4gbWFzaykgPj4+IDA7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBaaWctemFnIGRlY29kZXMgdGhpcyBsb25nIGJpdHMuXHJcbiAqIEByZXR1cm5zIHt1dGlsLkxvbmdCaXRzfSBgdGhpc2BcclxuICovXHJcbkxvbmdCaXRzLnByb3RvdHlwZS56ekRlY29kZSA9IGZ1bmN0aW9uIHp6RGVjb2RlKCkge1xyXG4gICAgdmFyIG1hc2sgPSAtKHRoaXMubG8gJiAxKTtcclxuICAgIHRoaXMubG8gID0gKCh0aGlzLmxvID4+PiAxIHwgdGhpcy5oaSA8PCAzMSkgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHRoaXMuaGkgID0gKCB0aGlzLmhpID4+PiAxICAgICAgICAgICAgICAgICAgXiBtYXNrKSA+Pj4gMDtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENhbGN1bGF0ZXMgdGhlIGxlbmd0aCBvZiB0aGlzIGxvbmdiaXRzIHdoZW4gZW5jb2RlZCBhcyBhIHZhcmludC5cclxuICogQHJldHVybnMge251bWJlcn0gTGVuZ3RoXHJcbiAqL1xyXG5Mb25nQml0cy5wcm90b3R5cGUubGVuZ3RoID0gZnVuY3Rpb24gbGVuZ3RoKCkge1xyXG4gICAgdmFyIHBhcnQwID0gIHRoaXMubG8sXHJcbiAgICAgICAgcGFydDEgPSAodGhpcy5sbyA+Pj4gMjggfCB0aGlzLmhpIDw8IDQpID4+PiAwLFxyXG4gICAgICAgIHBhcnQyID0gIHRoaXMuaGkgPj4+IDI0O1xyXG4gICAgcmV0dXJuIHBhcnQyID09PSAwXHJcbiAgICAgICAgID8gcGFydDEgPT09IDBcclxuICAgICAgICAgICA/IHBhcnQwIDwgMTYzODRcclxuICAgICAgICAgICAgID8gcGFydDAgPCAxMjggPyAxIDogMlxyXG4gICAgICAgICAgICAgOiBwYXJ0MCA8IDIwOTcxNTIgPyAzIDogNFxyXG4gICAgICAgICAgIDogcGFydDEgPCAxNjM4NFxyXG4gICAgICAgICAgICAgPyBwYXJ0MSA8IDEyOCA/IDUgOiA2XHJcbiAgICAgICAgICAgICA6IHBhcnQxIDwgMjA5NzE1MiA/IDcgOiA4XHJcbiAgICAgICAgIDogcGFydDIgPCAxMjggPyA5IDogMTA7XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG52YXIgdXRpbCA9IGV4cG9ydHM7XHJcblxyXG4vLyB1c2VkIHRvIHJldHVybiBhIFByb21pc2Ugd2hlcmUgY2FsbGJhY2sgaXMgb21pdHRlZFxyXG51dGlsLmFzUHJvbWlzZSA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9hc3Byb21pc2VcIik7XHJcblxyXG4vLyBjb252ZXJ0cyB0byAvIGZyb20gYmFzZTY0IGVuY29kZWQgc3RyaW5nc1xyXG51dGlsLmJhc2U2NCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9iYXNlNjRcIik7XHJcblxyXG4vLyBiYXNlIGNsYXNzIG9mIHJwYy5TZXJ2aWNlXHJcbnV0aWwuRXZlbnRFbWl0dGVyID0gcmVxdWlyZShcIkBwcm90b2J1ZmpzL2V2ZW50ZW1pdHRlclwiKTtcclxuXHJcbi8vIGZsb2F0IGhhbmRsaW5nIGFjY3Jvc3MgYnJvd3NlcnNcclxudXRpbC5mbG9hdCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9mbG9hdFwiKTtcclxuXHJcbi8vIHJlcXVpcmVzIG1vZHVsZXMgb3B0aW9uYWxseSBhbmQgaGlkZXMgdGhlIGNhbGwgZnJvbSBidW5kbGVyc1xyXG51dGlsLmlucXVpcmUgPSByZXF1aXJlKFwiQHByb3RvYnVmanMvaW5xdWlyZVwiKTtcclxuXHJcbi8vIGNvbnZlcnRzIHRvIC8gZnJvbSB1dGY4IGVuY29kZWQgc3RyaW5nc1xyXG51dGlsLnV0ZjggPSByZXF1aXJlKFwiQHByb3RvYnVmanMvdXRmOFwiKTtcclxuXHJcbi8vIHByb3ZpZGVzIGEgbm9kZS1saWtlIGJ1ZmZlciBwb29sIGluIHRoZSBicm93c2VyXHJcbnV0aWwucG9vbCA9IHJlcXVpcmUoXCJAcHJvdG9idWZqcy9wb29sXCIpO1xyXG5cclxuLy8gdXRpbGl0eSB0byB3b3JrIHdpdGggdGhlIGxvdyBhbmQgaGlnaCBiaXRzIG9mIGEgNjQgYml0IHZhbHVlXHJcbnV0aWwuTG9uZ0JpdHMgPSByZXF1aXJlKFwiLi9sb25nYml0c1wiKTtcclxuXHJcbi8vIGdsb2JhbCBvYmplY3QgcmVmZXJlbmNlXHJcbnV0aWwuZ2xvYmFsID0gdHlwZW9mIHdpbmRvdyAhPT0gXCJ1bmRlZmluZWRcIiAmJiB3aW5kb3dcclxuICAgICAgICAgICB8fCB0eXBlb2YgZ2xvYmFsICE9PSBcInVuZGVmaW5lZFwiICYmIGdsb2JhbFxyXG4gICAgICAgICAgIHx8IHR5cGVvZiBzZWxmICAgIT09IFwidW5kZWZpbmVkXCIgJiYgc2VsZlxyXG4gICAgICAgICAgIHx8IHRoaXM7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8taW52YWxpZC10aGlzXHJcblxyXG4vKipcclxuICogQW4gaW1tdWFibGUgZW1wdHkgYXJyYXkuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEB0eXBlIHtBcnJheS48Kj59XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5lbXB0eUFycmF5ID0gT2JqZWN0LmZyZWV6ZSA/IE9iamVjdC5mcmVlemUoW10pIDogLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gW107IC8vIHVzZWQgb24gcHJvdG90eXBlc1xyXG5cclxuLyoqXHJcbiAqIEFuIGltbXV0YWJsZSBlbXB0eSBvYmplY3QuXHJcbiAqIEB0eXBlIHtPYmplY3R9XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5lbXB0eU9iamVjdCA9IE9iamVjdC5mcmVlemUgPyBPYmplY3QuZnJlZXplKHt9KSA6IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIHt9OyAvLyB1c2VkIG9uIHByb3RvdHlwZXNcclxuXHJcbi8qKlxyXG4gKiBXaGV0aGVyIHJ1bm5pbmcgd2l0aGluIG5vZGUgb3Igbm90LlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAdHlwZSB7Ym9vbGVhbn1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmlzTm9kZSA9IEJvb2xlYW4odXRpbC5nbG9iYWwucHJvY2VzcyAmJiB1dGlsLmdsb2JhbC5wcm9jZXNzLnZlcnNpb25zICYmIHV0aWwuZ2xvYmFsLnByb2Nlc3MudmVyc2lvbnMubm9kZSk7XHJcblxyXG4vKipcclxuICogVGVzdHMgaWYgdGhlIHNwZWNpZmllZCB2YWx1ZSBpcyBhbiBpbnRlZ2VyLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHsqfSB2YWx1ZSBWYWx1ZSB0byB0ZXN0XHJcbiAqIEByZXR1cm5zIHtib29sZWFufSBgdHJ1ZWAgaWYgdGhlIHZhbHVlIGlzIGFuIGludGVnZXJcclxuICovXHJcbnV0aWwuaXNJbnRlZ2VyID0gTnVtYmVyLmlzSW50ZWdlciB8fCAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBmdW5jdGlvbiBpc0ludGVnZXIodmFsdWUpIHtcclxuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09IFwibnVtYmVyXCIgJiYgaXNGaW5pdGUodmFsdWUpICYmIE1hdGguZmxvb3IodmFsdWUpID09PSB2YWx1ZTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUZXN0cyBpZiB0aGUgc3BlY2lmaWVkIHZhbHVlIGlzIGEgc3RyaW5nLlxyXG4gKiBAcGFyYW0geyp9IHZhbHVlIFZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgdmFsdWUgaXMgYSBzdHJpbmdcclxuICovXHJcbnV0aWwuaXNTdHJpbmcgPSBmdW5jdGlvbiBpc1N0cmluZyh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiB8fCB2YWx1ZSBpbnN0YW5jZW9mIFN0cmluZztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBUZXN0cyBpZiB0aGUgc3BlY2lmaWVkIHZhbHVlIGlzIGEgbm9uLW51bGwgb2JqZWN0LlxyXG4gKiBAcGFyYW0geyp9IHZhbHVlIFZhbHVlIHRvIHRlc3RcclxuICogQHJldHVybnMge2Jvb2xlYW59IGB0cnVlYCBpZiB0aGUgdmFsdWUgaXMgYSBub24tbnVsbCBvYmplY3RcclxuICovXHJcbnV0aWwuaXNPYmplY3QgPSBmdW5jdGlvbiBpc09iamVjdCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHZhbHVlICYmIHR5cGVvZiB2YWx1ZSA9PT0gXCJvYmplY3RcIjtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBDaGVja3MgaWYgYSBwcm9wZXJ0eSBvbiBhIG1lc3NhZ2UgaXMgY29uc2lkZXJlZCB0byBiZSBwcmVzZW50LlxyXG4gKiBUaGlzIGlzIGFuIGFsaWFzIG9mIHtAbGluayB1dGlsLmlzU2V0fS5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogUGxhaW4gb2JqZWN0IG9yIG1lc3NhZ2UgaW5zdGFuY2VcclxuICogQHBhcmFtIHtzdHJpbmd9IHByb3AgUHJvcGVydHkgbmFtZVxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIGNvbnNpZGVyZWQgdG8gYmUgcHJlc2VudCwgb3RoZXJ3aXNlIGBmYWxzZWBcclxuICovXHJcbnV0aWwuaXNzZXQgPVxyXG5cclxuLyoqXHJcbiAqIENoZWNrcyBpZiBhIHByb3BlcnR5IG9uIGEgbWVzc2FnZSBpcyBjb25zaWRlcmVkIHRvIGJlIHByZXNlbnQuXHJcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogUGxhaW4gb2JqZWN0IG9yIG1lc3NhZ2UgaW5zdGFuY2VcclxuICogQHBhcmFtIHtzdHJpbmd9IHByb3AgUHJvcGVydHkgbmFtZVxyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gYHRydWVgIGlmIGNvbnNpZGVyZWQgdG8gYmUgcHJlc2VudCwgb3RoZXJ3aXNlIGBmYWxzZWBcclxuICovXHJcbnV0aWwuaXNTZXQgPSBmdW5jdGlvbiBpc1NldChvYmosIHByb3ApIHtcclxuICAgIHZhciB2YWx1ZSA9IG9ialtwcm9wXTtcclxuICAgIGlmICh2YWx1ZSAhPSBudWxsICYmIG9iai5oYXNPd25Qcm9wZXJ0eShwcm9wKSkgLy8gZXNsaW50LWRpc2FibGUtbGluZSBlcWVxZXEsIG5vLXByb3RvdHlwZS1idWlsdGluc1xyXG4gICAgICAgIHJldHVybiB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIgfHwgKEFycmF5LmlzQXJyYXkodmFsdWUpID8gdmFsdWUubGVuZ3RoIDogT2JqZWN0LmtleXModmFsdWUpLmxlbmd0aCkgPiAwO1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFueSBjb21wYXRpYmxlIEJ1ZmZlciBpbnN0YW5jZS5cclxuICogVGhpcyBpcyBhIG1pbmltYWwgc3RhbmQtYWxvbmUgZGVmaW5pdGlvbiBvZiBhIEJ1ZmZlciBpbnN0YW5jZS4gVGhlIGFjdHVhbCB0eXBlIGlzIHRoYXQgZXhwb3J0ZWQgYnkgbm9kZSdzIHR5cGluZ3MuXHJcbiAqIEBpbnRlcmZhY2UgQnVmZmVyXHJcbiAqIEBleHRlbmRzIFVpbnQ4QXJyYXlcclxuICovXHJcblxyXG4vKipcclxuICogTm9kZSdzIEJ1ZmZlciBjbGFzcyBpZiBhdmFpbGFibGUuXHJcbiAqIEB0eXBlIHtDb25zdHJ1Y3RvcjxCdWZmZXI+fVxyXG4gKi9cclxudXRpbC5CdWZmZXIgPSAoZnVuY3Rpb24oKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHZhciBCdWZmZXIgPSB1dGlsLmlucXVpcmUoXCJidWZmZXJcIikuQnVmZmVyO1xyXG4gICAgICAgIC8vIHJlZnVzZSB0byB1c2Ugbm9uLW5vZGUgYnVmZmVycyBpZiBub3QgZXhwbGljaXRseSBhc3NpZ25lZCAocGVyZiByZWFzb25zKTpcclxuICAgICAgICByZXR1cm4gQnVmZmVyLnByb3RvdHlwZS51dGY4V3JpdGUgPyBCdWZmZXIgOiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyBudWxsO1xyXG4gICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0pKCk7XHJcblxyXG4vLyBJbnRlcm5hbCBhbGlhcyBvZiBvciBwb2x5ZnVsbCBmb3IgQnVmZmVyLmZyb20uXHJcbnV0aWwuX0J1ZmZlcl9mcm9tID0gbnVsbDtcclxuXHJcbi8vIEludGVybmFsIGFsaWFzIG9mIG9yIHBvbHlmaWxsIGZvciBCdWZmZXIuYWxsb2NVbnNhZmUuXHJcbnV0aWwuX0J1ZmZlcl9hbGxvY1Vuc2FmZSA9IG51bGw7XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyBidWZmZXIgb2Ygd2hhdGV2ZXIgdHlwZSBzdXBwb3J0ZWQgYnkgdGhlIGVudmlyb25tZW50LlxyXG4gKiBAcGFyYW0ge251bWJlcnxudW1iZXJbXX0gW3NpemVPckFycmF5PTBdIEJ1ZmZlciBzaXplIG9yIG51bWJlciBhcnJheVxyXG4gKiBAcmV0dXJucyB7VWludDhBcnJheXxCdWZmZXJ9IEJ1ZmZlclxyXG4gKi9cclxudXRpbC5uZXdCdWZmZXIgPSBmdW5jdGlvbiBuZXdCdWZmZXIoc2l6ZU9yQXJyYXkpIHtcclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICByZXR1cm4gdHlwZW9mIHNpemVPckFycmF5ID09PSBcIm51bWJlclwiXHJcbiAgICAgICAgPyB1dGlsLkJ1ZmZlclxyXG4gICAgICAgICAgICA/IHV0aWwuX0J1ZmZlcl9hbGxvY1Vuc2FmZShzaXplT3JBcnJheSlcclxuICAgICAgICAgICAgOiBuZXcgdXRpbC5BcnJheShzaXplT3JBcnJheSlcclxuICAgICAgICA6IHV0aWwuQnVmZmVyXHJcbiAgICAgICAgICAgID8gdXRpbC5fQnVmZmVyX2Zyb20oc2l6ZU9yQXJyYXkpXHJcbiAgICAgICAgICAgIDogdHlwZW9mIFVpbnQ4QXJyYXkgPT09IFwidW5kZWZpbmVkXCJcclxuICAgICAgICAgICAgICAgID8gc2l6ZU9yQXJyYXlcclxuICAgICAgICAgICAgICAgIDogbmV3IFVpbnQ4QXJyYXkoc2l6ZU9yQXJyYXkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEFycmF5IGltcGxlbWVudGF0aW9uIHVzZWQgaW4gdGhlIGJyb3dzZXIuIGBVaW50OEFycmF5YCBpZiBzdXBwb3J0ZWQsIG90aGVyd2lzZSBgQXJyYXlgLlxyXG4gKiBAdHlwZSB7Q29uc3RydWN0b3I8VWludDhBcnJheT59XHJcbiAqL1xyXG51dGlsLkFycmF5ID0gdHlwZW9mIFVpbnQ4QXJyYXkgIT09IFwidW5kZWZpbmVkXCIgPyBVaW50OEFycmF5IC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovIDogQXJyYXk7XHJcblxyXG4vKipcclxuICogQW55IGNvbXBhdGlibGUgTG9uZyBpbnN0YW5jZS5cclxuICogVGhpcyBpcyBhIG1pbmltYWwgc3RhbmQtYWxvbmUgZGVmaW5pdGlvbiBvZiBhIExvbmcgaW5zdGFuY2UuIFRoZSBhY3R1YWwgdHlwZSBpcyB0aGF0IGV4cG9ydGVkIGJ5IGxvbmcuanMuXHJcbiAqIEBpbnRlcmZhY2UgTG9uZ1xyXG4gKiBAcHJvcGVydHkge251bWJlcn0gbG93IExvdyBiaXRzXHJcbiAqIEBwcm9wZXJ0eSB7bnVtYmVyfSBoaWdoIEhpZ2ggYml0c1xyXG4gKiBAcHJvcGVydHkge2Jvb2xlYW59IHVuc2lnbmVkIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIExvbmcuanMncyBMb25nIGNsYXNzIGlmIGF2YWlsYWJsZS5cclxuICogQHR5cGUge0NvbnN0cnVjdG9yPExvbmc+fVxyXG4gKi9cclxudXRpbC5Mb25nID0gLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gdXRpbC5nbG9iYWwuZGNvZGVJTyAmJiAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqLyB1dGlsLmdsb2JhbC5kY29kZUlPLkxvbmdcclxuICAgICAgICAgfHwgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi8gdXRpbC5nbG9iYWwuTG9uZ1xyXG4gICAgICAgICB8fCB1dGlsLmlucXVpcmUoXCJsb25nXCIpO1xyXG5cclxuLyoqXHJcbiAqIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHZlcmlmeSAyIGJpdCAoYGJvb2xgKSBtYXAga2V5cy5cclxuICogQHR5cGUge1JlZ0V4cH1cclxuICogQGNvbnN0XHJcbiAqL1xyXG51dGlsLmtleTJSZSA9IC9edHJ1ZXxmYWxzZXwwfDEkLztcclxuXHJcbi8qKlxyXG4gKiBSZWd1bGFyIGV4cHJlc3Npb24gdXNlZCB0byB2ZXJpZnkgMzIgYml0IChgaW50MzJgIGV0Yy4pIG1hcCBrZXlzLlxyXG4gKiBAdHlwZSB7UmVnRXhwfVxyXG4gKiBAY29uc3RcclxuICovXHJcbnV0aWwua2V5MzJSZSA9IC9eLT8oPzowfFsxLTldWzAtOV0qKSQvO1xyXG5cclxuLyoqXHJcbiAqIFJlZ3VsYXIgZXhwcmVzc2lvbiB1c2VkIHRvIHZlcmlmeSA2NCBiaXQgKGBpbnQ2NGAgZXRjLikgbWFwIGtleXMuXHJcbiAqIEB0eXBlIHtSZWdFeHB9XHJcbiAqIEBjb25zdFxyXG4gKi9cclxudXRpbC5rZXk2NFJlID0gL14oPzpbXFxcXHgwMC1cXFxceGZmXXs4fXwtPyg/OjB8WzEtOV1bMC05XSopKSQvO1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIGEgbnVtYmVyIG9yIGxvbmcgdG8gYW4gOCBjaGFyYWN0ZXJzIGxvbmcgaGFzaCBzdHJpbmcuXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIGNvbnZlcnRcclxuICogQHJldHVybnMge3N0cmluZ30gSGFzaFxyXG4gKi9cclxudXRpbC5sb25nVG9IYXNoID0gZnVuY3Rpb24gbG9uZ1RvSGFzaCh2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHZhbHVlXHJcbiAgICAgICAgPyB1dGlsLkxvbmdCaXRzLmZyb20odmFsdWUpLnRvSGFzaCgpXHJcbiAgICAgICAgOiB1dGlsLkxvbmdCaXRzLnplcm9IYXNoO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENvbnZlcnRzIGFuIDggY2hhcmFjdGVycyBsb25nIGhhc2ggc3RyaW5nIHRvIGEgbG9uZyBvciBudW1iZXIuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBoYXNoIEhhc2hcclxuICogQHBhcmFtIHtib29sZWFufSBbdW5zaWduZWQ9ZmFsc2VdIFdoZXRoZXIgdW5zaWduZWQgb3Igbm90XHJcbiAqIEByZXR1cm5zIHtMb25nfG51bWJlcn0gT3JpZ2luYWwgdmFsdWVcclxuICovXHJcbnV0aWwubG9uZ0Zyb21IYXNoID0gZnVuY3Rpb24gbG9uZ0Zyb21IYXNoKGhhc2gsIHVuc2lnbmVkKSB7XHJcbiAgICB2YXIgYml0cyA9IHV0aWwuTG9uZ0JpdHMuZnJvbUhhc2goaGFzaCk7XHJcbiAgICBpZiAodXRpbC5Mb25nKVxyXG4gICAgICAgIHJldHVybiB1dGlsLkxvbmcuZnJvbUJpdHMoYml0cy5sbywgYml0cy5oaSwgdW5zaWduZWQpO1xyXG4gICAgcmV0dXJuIGJpdHMudG9OdW1iZXIoQm9vbGVhbih1bnNpZ25lZCkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIE1lcmdlcyB0aGUgcHJvcGVydGllcyBvZiB0aGUgc291cmNlIG9iamVjdCBpbnRvIHRoZSBkZXN0aW5hdGlvbiBvYmplY3QuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBwYXJhbSB7T2JqZWN0LjxzdHJpbmcsKj59IGRzdCBEZXN0aW5hdGlvbiBvYmplY3RcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gc3JjIFNvdXJjZSBvYmplY3RcclxuICogQHBhcmFtIHtib29sZWFufSBbaWZOb3RTZXQ9ZmFsc2VdIE1lcmdlcyBvbmx5IGlmIHRoZSBrZXkgaXMgbm90IGFscmVhZHkgc2V0XHJcbiAqIEByZXR1cm5zIHtPYmplY3QuPHN0cmluZywqPn0gRGVzdGluYXRpb24gb2JqZWN0XHJcbiAqL1xyXG5mdW5jdGlvbiBtZXJnZShkc3QsIHNyYywgaWZOb3RTZXQpIHsgLy8gdXNlZCBieSBjb252ZXJ0ZXJzXHJcbiAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXMoc3JjKSwgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgKytpKVxyXG4gICAgICAgIGlmIChkc3Rba2V5c1tpXV0gPT09IHVuZGVmaW5lZCB8fCAhaWZOb3RTZXQpXHJcbiAgICAgICAgICAgIGRzdFtrZXlzW2ldXSA9IHNyY1trZXlzW2ldXTtcclxuICAgIHJldHVybiBkc3Q7XHJcbn1cclxuXHJcbnV0aWwubWVyZ2UgPSBtZXJnZTtcclxuXHJcbi8qKlxyXG4gKiBDb252ZXJ0cyB0aGUgZmlyc3QgY2hhcmFjdGVyIG9mIGEgc3RyaW5nIHRvIGxvd2VyIGNhc2UuXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHIgU3RyaW5nIHRvIGNvbnZlcnRcclxuICogQHJldHVybnMge3N0cmluZ30gQ29udmVydGVkIHN0cmluZ1xyXG4gKi9cclxudXRpbC5sY0ZpcnN0ID0gZnVuY3Rpb24gbGNGaXJzdChzdHIpIHtcclxuICAgIHJldHVybiBzdHIuY2hhckF0KDApLnRvTG93ZXJDYXNlKCkgKyBzdHIuc3Vic3RyaW5nKDEpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBjdXN0b20gZXJyb3IgY29uc3RydWN0b3IuXHJcbiAqIEBtZW1iZXJvZiB1dGlsXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEVycm9yIG5hbWVcclxuICogQHJldHVybnMge0NvbnN0cnVjdG9yPEVycm9yPn0gQ3VzdG9tIGVycm9yIGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBuZXdFcnJvcihuYW1lKSB7XHJcblxyXG4gICAgZnVuY3Rpb24gQ3VzdG9tRXJyb3IobWVzc2FnZSwgcHJvcGVydGllcykge1xyXG5cclxuICAgICAgICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQ3VzdG9tRXJyb3IpKVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEN1c3RvbUVycm9yKG1lc3NhZ2UsIHByb3BlcnRpZXMpO1xyXG5cclxuICAgICAgICAvLyBFcnJvci5jYWxsKHRoaXMsIG1lc3NhZ2UpO1xyXG4gICAgICAgIC8vIF4ganVzdCByZXR1cm5zIGEgbmV3IGVycm9yIGluc3RhbmNlIGJlY2F1c2UgdGhlIGN0b3IgY2FuIGJlIGNhbGxlZCBhcyBhIGZ1bmN0aW9uXHJcblxyXG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLCBcIm1lc3NhZ2VcIiwgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbWVzc2FnZTsgfSB9KTtcclxuXHJcbiAgICAgICAgLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuICAgICAgICBpZiAoRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UpIC8vIG5vZGVcclxuICAgICAgICAgICAgRXJyb3IuY2FwdHVyZVN0YWNrVHJhY2UodGhpcywgQ3VzdG9tRXJyb3IpO1xyXG4gICAgICAgIGVsc2VcclxuICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRoaXMsIFwic3RhY2tcIiwgeyB2YWx1ZTogKG5ldyBFcnJvcigpKS5zdGFjayB8fCBcIlwiIH0pO1xyXG5cclxuICAgICAgICBpZiAocHJvcGVydGllcylcclxuICAgICAgICAgICAgbWVyZ2UodGhpcywgcHJvcGVydGllcyk7XHJcbiAgICB9XHJcblxyXG4gICAgKEN1c3RvbUVycm9yLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoRXJyb3IucHJvdG90eXBlKSkuY29uc3RydWN0b3IgPSBDdXN0b21FcnJvcjtcclxuXHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQ3VzdG9tRXJyb3IucHJvdG90eXBlLCBcIm5hbWVcIiwgeyBnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gbmFtZTsgfSB9KTtcclxuXHJcbiAgICBDdXN0b21FcnJvci5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiB0b1N0cmluZygpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5uYW1lICsgXCI6IFwiICsgdGhpcy5tZXNzYWdlO1xyXG4gICAgfTtcclxuXHJcbiAgICByZXR1cm4gQ3VzdG9tRXJyb3I7XHJcbn1cclxuXHJcbnV0aWwubmV3RXJyb3IgPSBuZXdFcnJvcjtcclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHByb3RvY29sIGVycm9yLlxyXG4gKiBAY2xhc3NkZXNjIEVycm9yIHN1YmNsYXNzIGluZGljYXRpbmcgYSBwcm90b2NvbCBzcGVjaWZjIGVycm9yLlxyXG4gKiBAbWVtYmVyb2YgdXRpbFxyXG4gKiBAZXh0ZW5kcyBFcnJvclxyXG4gKiBAdGVtcGxhdGUgVCBleHRlbmRzIE1lc3NhZ2U8VD5cclxuICogQGNvbnN0cnVjdG9yXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBtZXNzYWdlIEVycm9yIG1lc3NhZ2VcclxuICogQHBhcmFtIHtPYmplY3QuPHN0cmluZywqPn0gW3Byb3BlcnRpZXNdIEFkZGl0aW9uYWwgcHJvcGVydGllc1xyXG4gKiBAZXhhbXBsZVxyXG4gKiB0cnkge1xyXG4gKiAgICAgTXlNZXNzYWdlLmRlY29kZShzb21lQnVmZmVyKTsgLy8gdGhyb3dzIGlmIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xyXG4gKiB9IGNhdGNoIChlKSB7XHJcbiAqICAgICBpZiAoZSBpbnN0YW5jZW9mIFByb3RvY29sRXJyb3IgJiYgZS5pbnN0YW5jZSlcclxuICogICAgICAgICBjb25zb2xlLmxvZyhcImRlY29kZWQgc28gZmFyOiBcIiArIEpTT04uc3RyaW5naWZ5KGUuaW5zdGFuY2UpKTtcclxuICogfVxyXG4gKi9cclxudXRpbC5Qcm90b2NvbEVycm9yID0gbmV3RXJyb3IoXCJQcm90b2NvbEVycm9yXCIpO1xyXG5cclxuLyoqXHJcbiAqIFNvIGZhciBkZWNvZGVkIG1lc3NhZ2UgaW5zdGFuY2UuXHJcbiAqIEBuYW1lIHV0aWwuUHJvdG9jb2xFcnJvciNpbnN0YW5jZVxyXG4gKiBAdHlwZSB7TWVzc2FnZTxUPn1cclxuICovXHJcblxyXG4vKipcclxuICogQSBPbmVPZiBnZXR0ZXIgYXMgcmV0dXJuZWQgYnkge0BsaW5rIHV0aWwub25lT2ZHZXR0ZXJ9LlxyXG4gKiBAdHlwZWRlZiBPbmVPZkdldHRlclxyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEByZXR1cm5zIHtzdHJpbmd8dW5kZWZpbmVkfSBTZXQgZmllbGQgbmFtZSwgaWYgYW55XHJcbiAqL1xyXG5cclxuLyoqXHJcbiAqIEJ1aWxkcyBhIGdldHRlciBmb3IgYSBvbmVvZidzIHByZXNlbnQgZmllbGQgbmFtZS5cclxuICogQHBhcmFtIHtzdHJpbmdbXX0gZmllbGROYW1lcyBGaWVsZCBuYW1lc1xyXG4gKiBAcmV0dXJucyB7T25lT2ZHZXR0ZXJ9IFVuYm91bmQgZ2V0dGVyXHJcbiAqL1xyXG51dGlsLm9uZU9mR2V0dGVyID0gZnVuY3Rpb24gZ2V0T25lT2YoZmllbGROYW1lcykge1xyXG4gICAgdmFyIGZpZWxkTWFwID0ge307XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkTmFtZXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgZmllbGRNYXBbZmllbGROYW1lc1tpXV0gPSAxO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQHJldHVybnMge3N0cmluZ3x1bmRlZmluZWR9IFNldCBmaWVsZCBuYW1lLCBpZiBhbnlcclxuICAgICAqIEB0aGlzIE9iamVjdFxyXG4gICAgICogQGlnbm9yZVxyXG4gICAgICovXHJcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgY29uc2lzdGVudC1yZXR1cm5cclxuICAgICAgICBmb3IgKHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcyksIGkgPSBrZXlzLmxlbmd0aCAtIDE7IGkgPiAtMTsgLS1pKVxyXG4gICAgICAgICAgICBpZiAoZmllbGRNYXBba2V5c1tpXV0gPT09IDEgJiYgdGhpc1trZXlzW2ldXSAhPT0gdW5kZWZpbmVkICYmIHRoaXNba2V5c1tpXV0gIT09IG51bGwpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4ga2V5c1tpXTtcclxuICAgIH07XHJcbn07XHJcblxyXG4vKipcclxuICogQSBPbmVPZiBzZXR0ZXIgYXMgcmV0dXJuZWQgYnkge0BsaW5rIHV0aWwub25lT2ZTZXR0ZXJ9LlxyXG4gKiBAdHlwZWRlZiBPbmVPZlNldHRlclxyXG4gKiBAdHlwZSB7ZnVuY3Rpb259XHJcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gdmFsdWUgRmllbGQgbmFtZVxyXG4gKiBAcmV0dXJucyB7dW5kZWZpbmVkfVxyXG4gKi9cclxuXHJcbi8qKlxyXG4gKiBCdWlsZHMgYSBzZXR0ZXIgZm9yIGEgb25lb2YncyBwcmVzZW50IGZpZWxkIG5hbWUuXHJcbiAqIEBwYXJhbSB7c3RyaW5nW119IGZpZWxkTmFtZXMgRmllbGQgbmFtZXNcclxuICogQHJldHVybnMge09uZU9mU2V0dGVyfSBVbmJvdW5kIHNldHRlclxyXG4gKi9cclxudXRpbC5vbmVPZlNldHRlciA9IGZ1bmN0aW9uIHNldE9uZU9mKGZpZWxkTmFtZXMpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuYW1lIEZpZWxkIG5hbWVcclxuICAgICAqIEByZXR1cm5zIHt1bmRlZmluZWR9XHJcbiAgICAgKiBAdGhpcyBPYmplY3RcclxuICAgICAqIEBpZ25vcmVcclxuICAgICAqL1xyXG4gICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGZpZWxkTmFtZXMubGVuZ3RoOyArK2kpXHJcbiAgICAgICAgICAgIGlmIChmaWVsZE5hbWVzW2ldICE9PSBuYW1lKVxyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHRoaXNbZmllbGROYW1lc1tpXV07XHJcbiAgICB9O1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIERlZmF1bHQgY29udmVyc2lvbiBvcHRpb25zIHVzZWQgZm9yIHtAbGluayBNZXNzYWdlI3RvSlNPTn0gaW1wbGVtZW50YXRpb25zLlxyXG4gKlxyXG4gKiBUaGVzZSBvcHRpb25zIGFyZSBjbG9zZSB0byBwcm90bzMncyBKU09OIG1hcHBpbmcgd2l0aCB0aGUgZXhjZXB0aW9uIHRoYXQgaW50ZXJuYWwgdHlwZXMgbGlrZSBBbnkgYXJlIGhhbmRsZWQganVzdCBsaWtlIG1lc3NhZ2VzLiBNb3JlIHByZWNpc2VseTpcclxuICpcclxuICogLSBMb25ncyBiZWNvbWUgc3RyaW5nc1xyXG4gKiAtIEVudW1zIGJlY29tZSBzdHJpbmcga2V5c1xyXG4gKiAtIEJ5dGVzIGJlY29tZSBiYXNlNjQgZW5jb2RlZCBzdHJpbmdzXHJcbiAqIC0gKFN1Yi0pTWVzc2FnZXMgYmVjb21lIHBsYWluIG9iamVjdHNcclxuICogLSBNYXBzIGJlY29tZSBwbGFpbiBvYmplY3RzIHdpdGggYWxsIHN0cmluZyBrZXlzXHJcbiAqIC0gUmVwZWF0ZWQgZmllbGRzIGJlY29tZSBhcnJheXNcclxuICogLSBOYU4gYW5kIEluZmluaXR5IGZvciBmbG9hdCBhbmQgZG91YmxlIGZpZWxkcyBiZWNvbWUgc3RyaW5nc1xyXG4gKlxyXG4gKiBAdHlwZSB7SUNvbnZlcnNpb25PcHRpb25zfVxyXG4gKiBAc2VlIGh0dHBzOi8vZGV2ZWxvcGVycy5nb29nbGUuY29tL3Byb3RvY29sLWJ1ZmZlcnMvZG9jcy9wcm90bzM/aGw9ZW4janNvblxyXG4gKi9cclxudXRpbC50b0pTT05PcHRpb25zID0ge1xyXG4gICAgbG9uZ3M6IFN0cmluZyxcclxuICAgIGVudW1zOiBTdHJpbmcsXHJcbiAgICBieXRlczogU3RyaW5nLFxyXG4gICAganNvbjogdHJ1ZVxyXG59O1xyXG5cclxuLy8gU2V0cyB1cCBidWZmZXIgdXRpbGl0eSBhY2NvcmRpbmcgdG8gdGhlIGVudmlyb25tZW50IChjYWxsZWQgaW4gaW5kZXgtbWluaW1hbClcclxudXRpbC5fY29uZmlndXJlID0gZnVuY3Rpb24oKSB7XHJcbiAgICB2YXIgQnVmZmVyID0gdXRpbC5CdWZmZXI7XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgaWYgKi9cclxuICAgIGlmICghQnVmZmVyKSB7XHJcbiAgICAgICAgdXRpbC5fQnVmZmVyX2Zyb20gPSB1dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUgPSBudWxsO1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIC8vIGJlY2F1c2Ugbm9kZSA0LnggYnVmZmVycyBhcmUgaW5jb21wYXRpYmxlICYgaW1tdXRhYmxlXHJcbiAgICAvLyBzZWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9kY29kZUlPL3Byb3RvYnVmLmpzL3B1bGwvNjY1XHJcbiAgICB1dGlsLl9CdWZmZXJfZnJvbSA9IEJ1ZmZlci5mcm9tICE9PSBVaW50OEFycmF5LmZyb20gJiYgQnVmZmVyLmZyb20gfHxcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIEJ1ZmZlcl9mcm9tKHZhbHVlLCBlbmNvZGluZykge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZlcih2YWx1ZSwgZW5jb2RpbmcpO1xyXG4gICAgICAgIH07XHJcbiAgICB1dGlsLl9CdWZmZXJfYWxsb2NVbnNhZmUgPSBCdWZmZXIuYWxsb2NVbnNhZmUgfHxcclxuICAgICAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgICAgIGZ1bmN0aW9uIEJ1ZmZlcl9hbGxvY1Vuc2FmZShzaXplKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZmVyKHNpemUpO1xyXG4gICAgICAgIH07XHJcbn07XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG5tb2R1bGUuZXhwb3J0cyA9IFdyaXRlcjtcclxuXHJcbnZhciB1dGlsICAgICAgPSByZXF1aXJlKFwiLi91dGlsL21pbmltYWxcIik7XHJcblxyXG52YXIgQnVmZmVyV3JpdGVyOyAvLyBjeWNsaWNcclxuXHJcbnZhciBMb25nQml0cyAgPSB1dGlsLkxvbmdCaXRzLFxyXG4gICAgYmFzZTY0ICAgID0gdXRpbC5iYXNlNjQsXHJcbiAgICB1dGY4ICAgICAgPSB1dGlsLnV0Zjg7XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgb3BlcmF0aW9uIGluc3RhbmNlLlxyXG4gKiBAY2xhc3NkZXNjIFNjaGVkdWxlZCB3cml0ZXIgb3BlcmF0aW9uLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICogQHBhcmFtIHtmdW5jdGlvbigqLCBVaW50OEFycmF5LCBudW1iZXIpfSBmbiBGdW5jdGlvbiB0byBjYWxsXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBsZW4gVmFsdWUgYnl0ZSBsZW5ndGhcclxuICogQHBhcmFtIHsqfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gT3AoZm4sIGxlbiwgdmFsKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBGdW5jdGlvbiB0byBjYWxsLlxyXG4gICAgICogQHR5cGUge2Z1bmN0aW9uKFVpbnQ4QXJyYXksIG51bWJlciwgKil9XHJcbiAgICAgKi9cclxuICAgIHRoaXMuZm4gPSBmbjtcclxuXHJcbiAgICAvKipcclxuICAgICAqIFZhbHVlIGJ5dGUgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSBsZW47XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBOZXh0IG9wZXJhdGlvbi5cclxuICAgICAqIEB0eXBlIHtXcml0ZXIuT3B8dW5kZWZpbmVkfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5leHQgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBWYWx1ZSB0byB3cml0ZS5cclxuICAgICAqIEB0eXBlIHsqfVxyXG4gICAgICovXHJcbiAgICB0aGlzLnZhbCA9IHZhbDsgLy8gdHlwZSB2YXJpZXNcclxufVxyXG5cclxuLyogaXN0YW5idWwgaWdub3JlIG5leHQgKi9cclxuZnVuY3Rpb24gbm9vcCgpIHt9IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbm8tZW1wdHktZnVuY3Rpb25cclxuXHJcbi8qKlxyXG4gKiBDb25zdHJ1Y3RzIGEgbmV3IHdyaXRlciBzdGF0ZSBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBDb3BpZWQgd3JpdGVyIHN0YXRlLlxyXG4gKiBAbWVtYmVyb2YgV3JpdGVyXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge1dyaXRlcn0gd3JpdGVyIFdyaXRlciB0byBjb3B5IHN0YXRlIGZyb21cclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gU3RhdGUod3JpdGVyKSB7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBDdXJyZW50IGhlYWQuXHJcbiAgICAgKiBAdHlwZSB7V3JpdGVyLk9wfVxyXG4gICAgICovXHJcbiAgICB0aGlzLmhlYWQgPSB3cml0ZXIuaGVhZDtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgdGFpbC5cclxuICAgICAqIEB0eXBlIHtXcml0ZXIuT3B9XHJcbiAgICAgKi9cclxuICAgIHRoaXMudGFpbCA9IHdyaXRlci50YWlsO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ3VycmVudCBidWZmZXIgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSB3cml0ZXIubGVuO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogTmV4dCBzdGF0ZS5cclxuICAgICAqIEB0eXBlIHtTdGF0ZXxudWxsfVxyXG4gICAgICovXHJcbiAgICB0aGlzLm5leHQgPSB3cml0ZXIuc3RhdGVzO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB3cml0ZXIgaW5zdGFuY2UuXHJcbiAqIEBjbGFzc2Rlc2MgV2lyZSBmb3JtYXQgd3JpdGVyIHVzaW5nIGBVaW50OEFycmF5YCBpZiBhdmFpbGFibGUsIG90aGVyd2lzZSBgQXJyYXlgLlxyXG4gKiBAY29uc3RydWN0b3JcclxuICovXHJcbmZ1bmN0aW9uIFdyaXRlcigpIHtcclxuXHJcbiAgICAvKipcclxuICAgICAqIEN1cnJlbnQgbGVuZ3RoLlxyXG4gICAgICogQHR5cGUge251bWJlcn1cclxuICAgICAqL1xyXG4gICAgdGhpcy5sZW4gPSAwO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3BlcmF0aW9ucyBoZWFkLlxyXG4gICAgICogQHR5cGUge09iamVjdH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5oZWFkID0gbmV3IE9wKG5vb3AsIDAsIDApO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogT3BlcmF0aW9ucyB0YWlsXHJcbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxyXG4gICAgICovXHJcbiAgICB0aGlzLnRhaWwgPSB0aGlzLmhlYWQ7XHJcblxyXG4gICAgLyoqXHJcbiAgICAgKiBMaW5rZWQgZm9ya2VkIHN0YXRlcy5cclxuICAgICAqIEB0eXBlIHtPYmplY3R8bnVsbH1cclxuICAgICAqL1xyXG4gICAgdGhpcy5zdGF0ZXMgPSBudWxsO1xyXG5cclxuICAgIC8vIFdoZW4gYSB2YWx1ZSBpcyB3cml0dGVuLCB0aGUgd3JpdGVyIGNhbGN1bGF0ZXMgaXRzIGJ5dGUgbGVuZ3RoIGFuZCBwdXRzIGl0IGludG8gYSBsaW5rZWRcclxuICAgIC8vIGxpc3Qgb2Ygb3BlcmF0aW9ucyB0byBwZXJmb3JtIHdoZW4gZmluaXNoKCkgaXMgY2FsbGVkLiBUaGlzIGJvdGggYWxsb3dzIHVzIHRvIGFsbG9jYXRlXHJcbiAgICAvLyBidWZmZXJzIG9mIHRoZSBleGFjdCByZXF1aXJlZCBzaXplIGFuZCByZWR1Y2VzIHRoZSBhbW91bnQgb2Ygd29yayB3ZSBoYXZlIHRvIGRvIGNvbXBhcmVkXHJcbiAgICAvLyB0byBmaXJzdCBjYWxjdWxhdGluZyBvdmVyIG9iamVjdHMgYW5kIHRoZW4gZW5jb2Rpbmcgb3ZlciBvYmplY3RzLiBJbiBvdXIgY2FzZSwgdGhlIGVuY29kaW5nXHJcbiAgICAvLyBwYXJ0IGlzIGp1c3QgYSBsaW5rZWQgbGlzdCB3YWxrIGNhbGxpbmcgb3BlcmF0aW9ucyB3aXRoIGFscmVhZHkgcHJlcGFyZWQgdmFsdWVzLlxyXG59XHJcblxyXG4vKipcclxuICogQ3JlYXRlcyBhIG5ldyB3cml0ZXIuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcmV0dXJucyB7QnVmZmVyV3JpdGVyfFdyaXRlcn0gQSB7QGxpbmsgQnVmZmVyV3JpdGVyfSB3aGVuIEJ1ZmZlcnMgYXJlIHN1cHBvcnRlZCwgb3RoZXJ3aXNlIGEge0BsaW5rIFdyaXRlcn1cclxuICovXHJcbldyaXRlci5jcmVhdGUgPSB1dGlsLkJ1ZmZlclxyXG4gICAgPyBmdW5jdGlvbiBjcmVhdGVfYnVmZmVyX3NldHVwKCkge1xyXG4gICAgICAgIHJldHVybiAoV3JpdGVyLmNyZWF0ZSA9IGZ1bmN0aW9uIGNyZWF0ZV9idWZmZXIoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZmVyV3JpdGVyKCk7XHJcbiAgICAgICAgfSkoKTtcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGZ1bmN0aW9uIGNyZWF0ZV9hcnJheSgpIHtcclxuICAgICAgICByZXR1cm4gbmV3IFdyaXRlcigpO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBBbGxvY2F0ZXMgYSBidWZmZXIgb2YgdGhlIHNwZWNpZmllZCBzaXplLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gc2l6ZSBCdWZmZXIgc2l6ZVxyXG4gKiBAcmV0dXJucyB7VWludDhBcnJheX0gQnVmZmVyXHJcbiAqL1xyXG5Xcml0ZXIuYWxsb2MgPSBmdW5jdGlvbiBhbGxvYyhzaXplKSB7XHJcbiAgICByZXR1cm4gbmV3IHV0aWwuQXJyYXkoc2l6ZSk7XHJcbn07XHJcblxyXG4vLyBVc2UgVWludDhBcnJheSBidWZmZXIgcG9vbCBpbiB0aGUgYnJvd3NlciwganVzdCBsaWtlIG5vZGUgZG9lcyB3aXRoIGJ1ZmZlcnNcclxuLyogaXN0YW5idWwgaWdub3JlIGVsc2UgKi9cclxuaWYgKHV0aWwuQXJyYXkgIT09IEFycmF5KVxyXG4gICAgV3JpdGVyLmFsbG9jID0gdXRpbC5wb29sKFdyaXRlci5hbGxvYywgdXRpbC5BcnJheS5wcm90b3R5cGUuc3ViYXJyYXkpO1xyXG5cclxuLyoqXHJcbiAqIFB1c2hlcyBhIG5ldyBvcGVyYXRpb24gdG8gdGhlIHF1ZXVlLlxyXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKFVpbnQ4QXJyYXksIG51bWJlciwgKil9IGZuIEZ1bmN0aW9uIHRvIGNhbGxcclxuICogQHBhcmFtIHtudW1iZXJ9IGxlbiBWYWx1ZSBieXRlIGxlbmd0aFxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKiBAcHJpdmF0ZVxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5fcHVzaCA9IGZ1bmN0aW9uIHB1c2goZm4sIGxlbiwgdmFsKSB7XHJcbiAgICB0aGlzLnRhaWwgPSB0aGlzLnRhaWwubmV4dCA9IG5ldyBPcChmbiwgbGVuLCB2YWwpO1xyXG4gICAgdGhpcy5sZW4gKz0gbGVuO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5mdW5jdGlvbiB3cml0ZUJ5dGUodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3Bvc10gPSB2YWwgJiAyNTU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdyaXRlVmFyaW50MzIodmFsLCBidWYsIHBvcykge1xyXG4gICAgd2hpbGUgKHZhbCA+IDEyNykge1xyXG4gICAgICAgIGJ1Zltwb3MrK10gPSB2YWwgJiAxMjcgfCAxMjg7XHJcbiAgICAgICAgdmFsID4+Pj0gNztcclxuICAgIH1cclxuICAgIGJ1Zltwb3NdID0gdmFsO1xyXG59XHJcblxyXG4vKipcclxuICogQ29uc3RydWN0cyBhIG5ldyB2YXJpbnQgd3JpdGVyIG9wZXJhdGlvbiBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBTY2hlZHVsZWQgdmFyaW50IHdyaXRlciBvcGVyYXRpb24uXHJcbiAqIEBleHRlbmRzIE9wXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAcGFyYW0ge251bWJlcn0gbGVuIFZhbHVlIGJ5dGUgbGVuZ3RoXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWwgVmFsdWUgdG8gd3JpdGVcclxuICogQGlnbm9yZVxyXG4gKi9cclxuZnVuY3Rpb24gVmFyaW50T3AobGVuLCB2YWwpIHtcclxuICAgIHRoaXMubGVuID0gbGVuO1xyXG4gICAgdGhpcy5uZXh0ID0gdW5kZWZpbmVkO1xyXG4gICAgdGhpcy52YWwgPSB2YWw7XHJcbn1cclxuXHJcblZhcmludE9wLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoT3AucHJvdG90eXBlKTtcclxuVmFyaW50T3AucHJvdG90eXBlLmZuID0gd3JpdGVWYXJpbnQzMjtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnVpbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX3VpbnQzMih2YWx1ZSkge1xyXG4gICAgLy8gaGVyZSwgdGhlIGNhbGwgdG8gdGhpcy5wdXNoIGhhcyBiZWVuIGlubGluZWQgYW5kIGEgdmFyaW50IHNwZWNpZmljIE9wIHN1YmNsYXNzIGlzIHVzZWQuXHJcbiAgICAvLyB1aW50MzIgaXMgYnkgZmFyIHRoZSBtb3N0IGZyZXF1ZW50bHkgdXNlZCBvcGVyYXRpb24gYW5kIGJlbmVmaXRzIHNpZ25pZmljYW50bHkgZnJvbSB0aGlzLlxyXG4gICAgdGhpcy5sZW4gKz0gKHRoaXMudGFpbCA9IHRoaXMudGFpbC5uZXh0ID0gbmV3IFZhcmludE9wKFxyXG4gICAgICAgICh2YWx1ZSA9IHZhbHVlID4+PiAwKVxyXG4gICAgICAgICAgICAgICAgPCAxMjggICAgICAgPyAxXHJcbiAgICAgICAgOiB2YWx1ZSA8IDE2Mzg0ICAgICA/IDJcclxuICAgICAgICA6IHZhbHVlIDwgMjA5NzE1MiAgID8gM1xyXG4gICAgICAgIDogdmFsdWUgPCAyNjg0MzU0NTYgPyA0XHJcbiAgICAgICAgOiAgICAgICAgICAgICAgICAgICAgIDUsXHJcbiAgICB2YWx1ZSkpLmxlbjtcclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCAzMiBiaXQgdmFsdWUgYXMgYSB2YXJpbnQuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmludDMyID0gZnVuY3Rpb24gd3JpdGVfaW50MzIodmFsdWUpIHtcclxuICAgIHJldHVybiB2YWx1ZSA8IDBcclxuICAgICAgICA/IHRoaXMuX3B1c2god3JpdGVWYXJpbnQ2NCwgMTAsIExvbmdCaXRzLmZyb21OdW1iZXIodmFsdWUpKSAvLyAxMCBieXRlcyBwZXIgc3BlY1xyXG4gICAgICAgIDogdGhpcy51aW50MzIodmFsdWUpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIDMyIGJpdCB2YWx1ZSBhcyBhIHZhcmludCwgemlnLXphZyBlbmNvZGVkLlxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnNpbnQzMiA9IGZ1bmN0aW9uIHdyaXRlX3NpbnQzMih2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKCh2YWx1ZSA8PCAxIF4gdmFsdWUgPj4gMzEpID4+PiAwKTtcclxufTtcclxuXHJcbmZ1bmN0aW9uIHdyaXRlVmFyaW50NjQodmFsLCBidWYsIHBvcykge1xyXG4gICAgd2hpbGUgKHZhbC5oaSkge1xyXG4gICAgICAgIGJ1Zltwb3MrK10gPSB2YWwubG8gJiAxMjcgfCAxMjg7XHJcbiAgICAgICAgdmFsLmxvID0gKHZhbC5sbyA+Pj4gNyB8IHZhbC5oaSA8PCAyNSkgPj4+IDA7XHJcbiAgICAgICAgdmFsLmhpID4+Pj0gNztcclxuICAgIH1cclxuICAgIHdoaWxlICh2YWwubG8gPiAxMjcpIHtcclxuICAgICAgICBidWZbcG9zKytdID0gdmFsLmxvICYgMTI3IHwgMTI4O1xyXG4gICAgICAgIHZhbC5sbyA9IHZhbC5sbyA+Pj4gNztcclxuICAgIH1cclxuICAgIGJ1Zltwb3MrK10gPSB2YWwubG87XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgNjQgYml0IHZhbHVlIGFzIGEgdmFyaW50LlxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfHN0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYHZhbHVlYCBpcyBhIHN0cmluZyBhbmQgbm8gbG9uZyBsaWJyYXJ5IGlzIHByZXNlbnQuXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnVpbnQ2NCA9IGZ1bmN0aW9uIHdyaXRlX3VpbnQ2NCh2YWx1ZSkge1xyXG4gICAgdmFyIGJpdHMgPSBMb25nQml0cy5mcm9tKHZhbHVlKTtcclxuICAgIHJldHVybiB0aGlzLl9wdXNoKHdyaXRlVmFyaW50NjQsIGJpdHMubGVuZ3RoKCksIGJpdHMpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgYSB2YXJpbnQuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfHN0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYHZhbHVlYCBpcyBhIHN0cmluZyBhbmQgbm8gbG9uZyBsaWJyYXJ5IGlzIHByZXNlbnQuXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmludDY0ID0gV3JpdGVyLnByb3RvdHlwZS51aW50NjQ7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc2lnbmVkIDY0IGJpdCB2YWx1ZSBhcyBhIHZhcmludCwgemlnLXphZyBlbmNvZGVkLlxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfHN0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYHZhbHVlYCBpcyBhIHN0cmluZyBhbmQgbm8gbG9uZyBsaWJyYXJ5IGlzIHByZXNlbnQuXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnNpbnQ2NCA9IGZ1bmN0aW9uIHdyaXRlX3NpbnQ2NCh2YWx1ZSkge1xyXG4gICAgdmFyIGJpdHMgPSBMb25nQml0cy5mcm9tKHZhbHVlKS56ekVuY29kZSgpO1xyXG4gICAgcmV0dXJuIHRoaXMuX3B1c2god3JpdGVWYXJpbnQ2NCwgYml0cy5sZW5ndGgoKSwgYml0cyk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgYm9vbGlzaCB2YWx1ZSBhcyBhIHZhcmludC5cclxuICogQHBhcmFtIHtib29sZWFufSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuYm9vbCA9IGZ1bmN0aW9uIHdyaXRlX2Jvb2wodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLl9wdXNoKHdyaXRlQnl0ZSwgMSwgdmFsdWUgPyAxIDogMCk7XHJcbn07XHJcblxyXG5mdW5jdGlvbiB3cml0ZUZpeGVkMzIodmFsLCBidWYsIHBvcykge1xyXG4gICAgYnVmW3BvcyAgICBdID0gIHZhbCAgICAgICAgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDFdID0gIHZhbCA+Pj4gOCAgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDJdID0gIHZhbCA+Pj4gMTYgICYgMjU1O1xyXG4gICAgYnVmW3BvcyArIDNdID0gIHZhbCA+Pj4gMjQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYW4gdW5zaWduZWQgMzIgYml0IHZhbHVlIGFzIGZpeGVkIDMyIGJpdHMuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZml4ZWQzMiA9IGZ1bmN0aW9uIHdyaXRlX2ZpeGVkMzIodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLl9wdXNoKHdyaXRlRml4ZWQzMiwgNCwgdmFsdWUgPj4+IDApO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCAzMiBiaXQgdmFsdWUgYXMgZml4ZWQgMzIgYml0cy5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ZpeGVkMzIgPSBXcml0ZXIucHJvdG90eXBlLmZpeGVkMzI7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGFuIHVuc2lnbmVkIDY0IGJpdCB2YWx1ZSBhcyBmaXhlZCA2NCBiaXRzLlxyXG4gKiBAcGFyYW0ge0xvbmd8bnVtYmVyfHN0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqIEB0aHJvd3Mge1R5cGVFcnJvcn0gSWYgYHZhbHVlYCBpcyBhIHN0cmluZyBhbmQgbm8gbG9uZyBsaWJyYXJ5IGlzIHByZXNlbnQuXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZpeGVkNjQgPSBmdW5jdGlvbiB3cml0ZV9maXhlZDY0KHZhbHVlKSB7XHJcbiAgICB2YXIgYml0cyA9IExvbmdCaXRzLmZyb20odmFsdWUpO1xyXG4gICAgcmV0dXJuIHRoaXMuX3B1c2god3JpdGVGaXhlZDMyLCA0LCBiaXRzLmxvKS5fcHVzaCh3cml0ZUZpeGVkMzIsIDQsIGJpdHMuaGkpO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIFdyaXRlcyBhIHNpZ25lZCA2NCBiaXQgdmFsdWUgYXMgZml4ZWQgNjQgYml0cy5cclxuICogQGZ1bmN0aW9uXHJcbiAqIEBwYXJhbSB7TG9uZ3xudW1iZXJ8c3RyaW5nfSB2YWx1ZSBWYWx1ZSB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICogQHRocm93cyB7VHlwZUVycm9yfSBJZiBgdmFsdWVgIGlzIGEgc3RyaW5nIGFuZCBubyBsb25nIGxpYnJhcnkgaXMgcHJlc2VudC5cclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuc2ZpeGVkNjQgPSBXcml0ZXIucHJvdG90eXBlLmZpeGVkNjQ7XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgZmxvYXQgKDMyIGJpdCkuXHJcbiAqIEBmdW5jdGlvblxyXG4gKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZsb2F0ID0gZnVuY3Rpb24gd3JpdGVfZmxvYXQodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLl9wdXNoKHV0aWwuZmxvYXQud3JpdGVGbG9hdExFLCA0LCB2YWx1ZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgZG91YmxlICg2NCBiaXQgZmxvYXQpLlxyXG4gKiBAZnVuY3Rpb25cclxuICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIFZhbHVlIHRvIHdyaXRlXHJcbiAqIEByZXR1cm5zIHtXcml0ZXJ9IGB0aGlzYFxyXG4gKi9cclxuV3JpdGVyLnByb3RvdHlwZS5kb3VibGUgPSBmdW5jdGlvbiB3cml0ZV9kb3VibGUodmFsdWUpIHtcclxuICAgIHJldHVybiB0aGlzLl9wdXNoKHV0aWwuZmxvYXQud3JpdGVEb3VibGVMRSwgOCwgdmFsdWUpO1xyXG59O1xyXG5cclxudmFyIHdyaXRlQnl0ZXMgPSB1dGlsLkFycmF5LnByb3RvdHlwZS5zZXRcclxuICAgID8gZnVuY3Rpb24gd3JpdGVCeXRlc19zZXQodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGJ1Zi5zZXQodmFsLCBwb3MpOyAvLyBhbHNvIHdvcmtzIGZvciBwbGFpbiBhcnJheSB2YWx1ZXNcclxuICAgIH1cclxuICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXHJcbiAgICA6IGZ1bmN0aW9uIHdyaXRlQnl0ZXNfZm9yKHZhbCwgYnVmLCBwb3MpIHtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7ICsraSlcclxuICAgICAgICAgICAgYnVmW3BvcyArIGldID0gdmFsW2ldO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBXcml0ZXMgYSBzZXF1ZW5jZSBvZiBieXRlcy5cclxuICogQHBhcmFtIHtVaW50OEFycmF5fHN0cmluZ30gdmFsdWUgQnVmZmVyIG9yIGJhc2U2NCBlbmNvZGVkIHN0cmluZyB0byB3cml0ZVxyXG4gKiBAcmV0dXJucyB7V3JpdGVyfSBgdGhpc2BcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuYnl0ZXMgPSBmdW5jdGlvbiB3cml0ZV9ieXRlcyh2YWx1ZSkge1xyXG4gICAgdmFyIGxlbiA9IHZhbHVlLmxlbmd0aCA+Pj4gMDtcclxuICAgIGlmICghbGVuKVxyXG4gICAgICAgIHJldHVybiB0aGlzLl9wdXNoKHdyaXRlQnl0ZSwgMSwgMCk7XHJcbiAgICBpZiAodXRpbC5pc1N0cmluZyh2YWx1ZSkpIHtcclxuICAgICAgICB2YXIgYnVmID0gV3JpdGVyLmFsbG9jKGxlbiA9IGJhc2U2NC5sZW5ndGgodmFsdWUpKTtcclxuICAgICAgICBiYXNlNjQuZGVjb2RlKHZhbHVlLCBidWYsIDApO1xyXG4gICAgICAgIHZhbHVlID0gYnVmO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXMudWludDMyKGxlbikuX3B1c2god3JpdGVCeXRlcywgbGVuLCB2YWx1ZSk7XHJcbn07XHJcblxyXG4vKipcclxuICogV3JpdGVzIGEgc3RyaW5nLlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgVmFsdWUgdG8gd3JpdGVcclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnN0cmluZyA9IGZ1bmN0aW9uIHdyaXRlX3N0cmluZyh2YWx1ZSkge1xyXG4gICAgdmFyIGxlbiA9IHV0ZjgubGVuZ3RoKHZhbHVlKTtcclxuICAgIHJldHVybiBsZW5cclxuICAgICAgICA/IHRoaXMudWludDMyKGxlbikuX3B1c2godXRmOC53cml0ZSwgbGVuLCB2YWx1ZSlcclxuICAgICAgICA6IHRoaXMuX3B1c2god3JpdGVCeXRlLCAxLCAwKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBGb3JrcyB0aGlzIHdyaXRlcidzIHN0YXRlIGJ5IHB1c2hpbmcgaXQgdG8gYSBzdGFjay5cclxuICogQ2FsbGluZyB7QGxpbmsgV3JpdGVyI3Jlc2V0fHJlc2V0fSBvciB7QGxpbmsgV3JpdGVyI2xkZWxpbXxsZGVsaW19IHJlc2V0cyB0aGUgd3JpdGVyIHRvIHRoZSBwcmV2aW91cyBzdGF0ZS5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmZvcmsgPSBmdW5jdGlvbiBmb3JrKCkge1xyXG4gICAgdGhpcy5zdGF0ZXMgPSBuZXcgU3RhdGUodGhpcyk7XHJcbiAgICB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBuZXcgT3Aobm9vcCwgMCwgMCk7XHJcbiAgICB0aGlzLmxlbiA9IDA7XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNldHMgdGhpcyBpbnN0YW5jZSB0byB0aGUgbGFzdCBzdGF0ZS5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24gcmVzZXQoKSB7XHJcbiAgICBpZiAodGhpcy5zdGF0ZXMpIHtcclxuICAgICAgICB0aGlzLmhlYWQgICA9IHRoaXMuc3RhdGVzLmhlYWQ7XHJcbiAgICAgICAgdGhpcy50YWlsICAgPSB0aGlzLnN0YXRlcy50YWlsO1xyXG4gICAgICAgIHRoaXMubGVuICAgID0gdGhpcy5zdGF0ZXMubGVuO1xyXG4gICAgICAgIHRoaXMuc3RhdGVzID0gdGhpcy5zdGF0ZXMubmV4dDtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhpcy5oZWFkID0gdGhpcy50YWlsID0gbmV3IE9wKG5vb3AsIDAsIDApO1xyXG4gICAgICAgIHRoaXMubGVuICA9IDA7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbi8qKlxyXG4gKiBSZXNldHMgdG8gdGhlIGxhc3Qgc3RhdGUgYW5kIGFwcGVuZHMgdGhlIGZvcmsgc3RhdGUncyBjdXJyZW50IHdyaXRlIGxlbmd0aCBhcyBhIHZhcmludCBmb2xsb3dlZCBieSBpdHMgb3BlcmF0aW9ucy5cclxuICogQHJldHVybnMge1dyaXRlcn0gYHRoaXNgXHJcbiAqL1xyXG5Xcml0ZXIucHJvdG90eXBlLmxkZWxpbSA9IGZ1bmN0aW9uIGxkZWxpbSgpIHtcclxuICAgIHZhciBoZWFkID0gdGhpcy5oZWFkLFxyXG4gICAgICAgIHRhaWwgPSB0aGlzLnRhaWwsXHJcbiAgICAgICAgbGVuICA9IHRoaXMubGVuO1xyXG4gICAgdGhpcy5yZXNldCgpLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbikge1xyXG4gICAgICAgIHRoaXMudGFpbC5uZXh0ID0gaGVhZC5uZXh0OyAvLyBza2lwIG5vb3BcclxuICAgICAgICB0aGlzLnRhaWwgPSB0YWlsO1xyXG4gICAgICAgIHRoaXMubGVuICs9IGxlbjtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuLyoqXHJcbiAqIEZpbmlzaGVzIHRoZSB3cml0ZSBvcGVyYXRpb24uXHJcbiAqIEByZXR1cm5zIHtVaW50OEFycmF5fSBGaW5pc2hlZCBidWZmZXJcclxuICovXHJcbldyaXRlci5wcm90b3R5cGUuZmluaXNoID0gZnVuY3Rpb24gZmluaXNoKCkge1xyXG4gICAgdmFyIGhlYWQgPSB0aGlzLmhlYWQubmV4dCwgLy8gc2tpcCBub29wXHJcbiAgICAgICAgYnVmICA9IHRoaXMuY29uc3RydWN0b3IuYWxsb2ModGhpcy5sZW4pLFxyXG4gICAgICAgIHBvcyAgPSAwO1xyXG4gICAgd2hpbGUgKGhlYWQpIHtcclxuICAgICAgICBoZWFkLmZuKGhlYWQudmFsLCBidWYsIHBvcyk7XHJcbiAgICAgICAgcG9zICs9IGhlYWQubGVuO1xyXG4gICAgICAgIGhlYWQgPSBoZWFkLm5leHQ7XHJcbiAgICB9XHJcbiAgICAvLyB0aGlzLmhlYWQgPSB0aGlzLnRhaWwgPSBudWxsO1xyXG4gICAgcmV0dXJuIGJ1ZjtcclxufTtcclxuXHJcbldyaXRlci5fY29uZmlndXJlID0gZnVuY3Rpb24oQnVmZmVyV3JpdGVyXykge1xyXG4gICAgQnVmZmVyV3JpdGVyID0gQnVmZmVyV3JpdGVyXztcclxufTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbm1vZHVsZS5leHBvcnRzID0gQnVmZmVyV3JpdGVyO1xyXG5cclxuLy8gZXh0ZW5kcyBXcml0ZXJcclxudmFyIFdyaXRlciA9IHJlcXVpcmUoXCIuL3dyaXRlclwiKTtcclxuKEJ1ZmZlcldyaXRlci5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKFdyaXRlci5wcm90b3R5cGUpKS5jb25zdHJ1Y3RvciA9IEJ1ZmZlcldyaXRlcjtcclxuXHJcbnZhciB1dGlsID0gcmVxdWlyZShcIi4vdXRpbC9taW5pbWFsXCIpO1xyXG5cclxudmFyIEJ1ZmZlciA9IHV0aWwuQnVmZmVyO1xyXG5cclxuLyoqXHJcbiAqIENvbnN0cnVjdHMgYSBuZXcgYnVmZmVyIHdyaXRlciBpbnN0YW5jZS5cclxuICogQGNsYXNzZGVzYyBXaXJlIGZvcm1hdCB3cml0ZXIgdXNpbmcgbm9kZSBidWZmZXJzLlxyXG4gKiBAZXh0ZW5kcyBXcml0ZXJcclxuICogQGNvbnN0cnVjdG9yXHJcbiAqL1xyXG5mdW5jdGlvbiBCdWZmZXJXcml0ZXIoKSB7XHJcbiAgICBXcml0ZXIuY2FsbCh0aGlzKTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEFsbG9jYXRlcyBhIGJ1ZmZlciBvZiB0aGUgc3BlY2lmaWVkIHNpemUuXHJcbiAqIEBwYXJhbSB7bnVtYmVyfSBzaXplIEJ1ZmZlciBzaXplXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IEJ1ZmZlclxyXG4gKi9cclxuQnVmZmVyV3JpdGVyLmFsbG9jID0gZnVuY3Rpb24gYWxsb2NfYnVmZmVyKHNpemUpIHtcclxuICAgIHJldHVybiAoQnVmZmVyV3JpdGVyLmFsbG9jID0gdXRpbC5fQnVmZmVyX2FsbG9jVW5zYWZlKShzaXplKTtcclxufTtcclxuXHJcbnZhciB3cml0ZUJ5dGVzQnVmZmVyID0gQnVmZmVyICYmIEJ1ZmZlci5wcm90b3R5cGUgaW5zdGFuY2VvZiBVaW50OEFycmF5ICYmIEJ1ZmZlci5wcm90b3R5cGUuc2V0Lm5hbWUgPT09IFwic2V0XCJcclxuICAgID8gZnVuY3Rpb24gd3JpdGVCeXRlc0J1ZmZlcl9zZXQodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGJ1Zi5zZXQodmFsLCBwb3MpOyAvLyBmYXN0ZXIgdGhhbiBjb3B5IChyZXF1aXJlcyBub2RlID49IDQgd2hlcmUgQnVmZmVycyBleHRlbmQgVWludDhBcnJheSBhbmQgc2V0IGlzIHByb3Blcmx5IGluaGVyaXRlZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gYWxzbyB3b3JrcyBmb3IgcGxhaW4gYXJyYXkgdmFsdWVzXHJcbiAgICB9XHJcbiAgICAvKiBpc3RhbmJ1bCBpZ25vcmUgbmV4dCAqL1xyXG4gICAgOiBmdW5jdGlvbiB3cml0ZUJ5dGVzQnVmZmVyX2NvcHkodmFsLCBidWYsIHBvcykge1xyXG4gICAgICAgIGlmICh2YWwuY29weSkgLy8gQnVmZmVyIHZhbHVlc1xyXG4gICAgICAgICAgICB2YWwuY29weShidWYsIHBvcywgMCwgdmFsLmxlbmd0aCk7XHJcbiAgICAgICAgZWxzZSBmb3IgKHZhciBpID0gMDsgaSA8IHZhbC5sZW5ndGg7KSAvLyBwbGFpbiBhcnJheSB2YWx1ZXNcclxuICAgICAgICAgICAgYnVmW3BvcysrXSA9IHZhbFtpKytdO1xyXG4gICAgfTtcclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbkJ1ZmZlcldyaXRlci5wcm90b3R5cGUuYnl0ZXMgPSBmdW5jdGlvbiB3cml0ZV9ieXRlc19idWZmZXIodmFsdWUpIHtcclxuICAgIGlmICh1dGlsLmlzU3RyaW5nKHZhbHVlKSlcclxuICAgICAgICB2YWx1ZSA9IHV0aWwuX0J1ZmZlcl9mcm9tKHZhbHVlLCBcImJhc2U2NFwiKTtcclxuICAgIHZhciBsZW4gPSB2YWx1ZS5sZW5ndGggPj4+IDA7XHJcbiAgICB0aGlzLnVpbnQzMihsZW4pO1xyXG4gICAgaWYgKGxlbilcclxuICAgICAgICB0aGlzLl9wdXNoKHdyaXRlQnl0ZXNCdWZmZXIsIGxlbiwgdmFsdWUpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5mdW5jdGlvbiB3cml0ZVN0cmluZ0J1ZmZlcih2YWwsIGJ1ZiwgcG9zKSB7XHJcbiAgICBpZiAodmFsLmxlbmd0aCA8IDQwKSAvLyBwbGFpbiBqcyBpcyBmYXN0ZXIgZm9yIHNob3J0IHN0cmluZ3MgKHByb2JhYmx5IGR1ZSB0byByZWR1bmRhbnQgYXNzZXJ0aW9ucylcclxuICAgICAgICB1dGlsLnV0Zjgud3JpdGUodmFsLCBidWYsIHBvcyk7XHJcbiAgICBlbHNlXHJcbiAgICAgICAgYnVmLnV0ZjhXcml0ZSh2YWwsIHBvcyk7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBAb3ZlcnJpZGVcclxuICovXHJcbkJ1ZmZlcldyaXRlci5wcm90b3R5cGUuc3RyaW5nID0gZnVuY3Rpb24gd3JpdGVfc3RyaW5nX2J1ZmZlcih2YWx1ZSkge1xyXG4gICAgdmFyIGxlbiA9IEJ1ZmZlci5ieXRlTGVuZ3RoKHZhbHVlKTtcclxuICAgIHRoaXMudWludDMyKGxlbik7XHJcbiAgICBpZiAobGVuKVxyXG4gICAgICAgIHRoaXMuX3B1c2god3JpdGVTdHJpbmdCdWZmZXIsIGxlbiwgdmFsdWUpO1xyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5cclxuLyoqXHJcbiAqIEZpbmlzaGVzIHRoZSB3cml0ZSBvcGVyYXRpb24uXHJcbiAqIEBuYW1lIEJ1ZmZlcldyaXRlciNmaW5pc2hcclxuICogQGZ1bmN0aW9uXHJcbiAqIEByZXR1cm5zIHtCdWZmZXJ9IEZpbmlzaGVkIGJ1ZmZlclxyXG4gKi9cclxuIiwiKGZ1bmN0aW9uIChnbG9iYWwsIHVuZGVmaW5lZCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgaWYgKGdsb2JhbC5zZXRJbW1lZGlhdGUpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciBuZXh0SGFuZGxlID0gMTsgLy8gU3BlYyBzYXlzIGdyZWF0ZXIgdGhhbiB6ZXJvXG4gICAgdmFyIHRhc2tzQnlIYW5kbGUgPSB7fTtcbiAgICB2YXIgY3VycmVudGx5UnVubmluZ0FUYXNrID0gZmFsc2U7XG4gICAgdmFyIGRvYyA9IGdsb2JhbC5kb2N1bWVudDtcbiAgICB2YXIgc2V0SW1tZWRpYXRlO1xuXG4gICAgZnVuY3Rpb24gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmdzKSB7XG4gICAgICAgIHRhc2tzQnlIYW5kbGVbbmV4dEhhbmRsZV0gPSBwYXJ0aWFsbHlBcHBsaWVkLmFwcGx5KHVuZGVmaW5lZCwgYXJncyk7XG4gICAgICAgIHJldHVybiBuZXh0SGFuZGxlKys7XG4gICAgfVxuXG4gICAgLy8gVGhpcyBmdW5jdGlvbiBhY2NlcHRzIHRoZSBzYW1lIGFyZ3VtZW50cyBhcyBzZXRJbW1lZGlhdGUsIGJ1dFxuICAgIC8vIHJldHVybnMgYSBmdW5jdGlvbiB0aGF0IHJlcXVpcmVzIG5vIGFyZ3VtZW50cy5cbiAgICBmdW5jdGlvbiBwYXJ0aWFsbHlBcHBsaWVkKGhhbmRsZXIpIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgaGFuZGxlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlci5hcHBseSh1bmRlZmluZWQsIGFyZ3MpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAobmV3IEZ1bmN0aW9uKFwiXCIgKyBoYW5kbGVyKSkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBydW5JZlByZXNlbnQoaGFuZGxlKSB7XG4gICAgICAgIC8vIEZyb20gdGhlIHNwZWM6IFwiV2FpdCB1bnRpbCBhbnkgaW52b2NhdGlvbnMgb2YgdGhpcyBhbGdvcml0aG0gc3RhcnRlZCBiZWZvcmUgdGhpcyBvbmUgaGF2ZSBjb21wbGV0ZWQuXCJcbiAgICAgICAgLy8gU28gaWYgd2UncmUgY3VycmVudGx5IHJ1bm5pbmcgYSB0YXNrLCB3ZSdsbCBuZWVkIHRvIGRlbGF5IHRoaXMgaW52b2NhdGlvbi5cbiAgICAgICAgaWYgKGN1cnJlbnRseVJ1bm5pbmdBVGFzaykge1xuICAgICAgICAgICAgLy8gRGVsYXkgYnkgZG9pbmcgYSBzZXRUaW1lb3V0LiBzZXRJbW1lZGlhdGUgd2FzIHRyaWVkIGluc3RlYWQsIGJ1dCBpbiBGaXJlZm94IDcgaXQgZ2VuZXJhdGVkIGFcbiAgICAgICAgICAgIC8vIFwidG9vIG11Y2ggcmVjdXJzaW9uXCIgZXJyb3IuXG4gICAgICAgICAgICBzZXRUaW1lb3V0KHBhcnRpYWxseUFwcGxpZWQocnVuSWZQcmVzZW50LCBoYW5kbGUpLCAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciB0YXNrID0gdGFza3NCeUhhbmRsZVtoYW5kbGVdO1xuICAgICAgICAgICAgaWYgKHRhc2spIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIHRhc2soKTtcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICBjbGVhckltbWVkaWF0ZShoYW5kbGUpO1xuICAgICAgICAgICAgICAgICAgICBjdXJyZW50bHlSdW5uaW5nQVRhc2sgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBjbGVhckltbWVkaWF0ZShoYW5kbGUpIHtcbiAgICAgICAgZGVsZXRlIHRhc2tzQnlIYW5kbGVbaGFuZGxlXTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTmV4dFRpY2tJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgICAgICAgICAgcHJvY2Vzcy5uZXh0VGljayhwYXJ0aWFsbHlBcHBsaWVkKHJ1bklmUHJlc2VudCwgaGFuZGxlKSk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNhblVzZVBvc3RNZXNzYWdlKCkge1xuICAgICAgICAvLyBUaGUgdGVzdCBhZ2FpbnN0IGBpbXBvcnRTY3JpcHRzYCBwcmV2ZW50cyB0aGlzIGltcGxlbWVudGF0aW9uIGZyb20gYmVpbmcgaW5zdGFsbGVkIGluc2lkZSBhIHdlYiB3b3JrZXIsXG4gICAgICAgIC8vIHdoZXJlIGBnbG9iYWwucG9zdE1lc3NhZ2VgIG1lYW5zIHNvbWV0aGluZyBjb21wbGV0ZWx5IGRpZmZlcmVudCBhbmQgY2FuJ3QgYmUgdXNlZCBmb3IgdGhpcyBwdXJwb3NlLlxuICAgICAgICBpZiAoZ2xvYmFsLnBvc3RNZXNzYWdlICYmICFnbG9iYWwuaW1wb3J0U2NyaXB0cykge1xuICAgICAgICAgICAgdmFyIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXMgPSB0cnVlO1xuICAgICAgICAgICAgdmFyIG9sZE9uTWVzc2FnZSA9IGdsb2JhbC5vbm1lc3NhZ2U7XG4gICAgICAgICAgICBnbG9iYWwub25tZXNzYWdlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcG9zdE1lc3NhZ2VJc0FzeW5jaHJvbm91cyA9IGZhbHNlO1xuICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIGdsb2JhbC5wb3N0TWVzc2FnZShcIlwiLCBcIipcIik7XG4gICAgICAgICAgICBnbG9iYWwub25tZXNzYWdlID0gb2xkT25NZXNzYWdlO1xuICAgICAgICAgICAgcmV0dXJuIHBvc3RNZXNzYWdlSXNBc3luY2hyb25vdXM7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsUG9zdE1lc3NhZ2VJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgLy8gSW5zdGFsbHMgYW4gZXZlbnQgaGFuZGxlciBvbiBgZ2xvYmFsYCBmb3IgdGhlIGBtZXNzYWdlYCBldmVudDogc2VlXG4gICAgICAgIC8vICogaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4vRE9NL3dpbmRvdy5wb3N0TWVzc2FnZVxuICAgICAgICAvLyAqIGh0dHA6Ly93d3cud2hhdHdnLm9yZy9zcGVjcy93ZWItYXBwcy9jdXJyZW50LXdvcmsvbXVsdGlwYWdlL2NvbW1zLmh0bWwjY3Jvc3NEb2N1bWVudE1lc3NhZ2VzXG5cbiAgICAgICAgdmFyIG1lc3NhZ2VQcmVmaXggPSBcInNldEltbWVkaWF0ZSRcIiArIE1hdGgucmFuZG9tKCkgKyBcIiRcIjtcbiAgICAgICAgdmFyIG9uR2xvYmFsTWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgICAgICBpZiAoZXZlbnQuc291cmNlID09PSBnbG9iYWwgJiZcbiAgICAgICAgICAgICAgICB0eXBlb2YgZXZlbnQuZGF0YSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICAgICAgICAgIGV2ZW50LmRhdGEuaW5kZXhPZihtZXNzYWdlUHJlZml4KSA9PT0gMCkge1xuICAgICAgICAgICAgICAgIHJ1bklmUHJlc2VudCgrZXZlbnQuZGF0YS5zbGljZShtZXNzYWdlUHJlZml4Lmxlbmd0aCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuXG4gICAgICAgIGlmIChnbG9iYWwuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgICAgICAgICAgZ2xvYmFsLmFkZEV2ZW50TGlzdGVuZXIoXCJtZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSwgZmFsc2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZ2xvYmFsLmF0dGFjaEV2ZW50KFwib25tZXNzYWdlXCIsIG9uR2xvYmFsTWVzc2FnZSk7XG4gICAgICAgIH1cblxuICAgICAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBnbG9iYWwucG9zdE1lc3NhZ2UobWVzc2FnZVByZWZpeCArIGhhbmRsZSwgXCIqXCIpO1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbnN0YWxsTWVzc2FnZUNoYW5uZWxJbXBsZW1lbnRhdGlvbigpIHtcbiAgICAgICAgdmFyIGNoYW5uZWwgPSBuZXcgTWVzc2FnZUNoYW5uZWwoKTtcbiAgICAgICAgY2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSBmdW5jdGlvbihldmVudCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGV2ZW50LmRhdGE7XG4gICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgfTtcblxuICAgICAgICBzZXRJbW1lZGlhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHZhciBoYW5kbGUgPSBhZGRGcm9tU2V0SW1tZWRpYXRlQXJndW1lbnRzKGFyZ3VtZW50cyk7XG4gICAgICAgICAgICBjaGFubmVsLnBvcnQyLnBvc3RNZXNzYWdlKGhhbmRsZSk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxSZWFkeVN0YXRlQ2hhbmdlSW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHZhciBodG1sID0gZG9jLmRvY3VtZW50RWxlbWVudDtcbiAgICAgICAgc2V0SW1tZWRpYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICB2YXIgaGFuZGxlID0gYWRkRnJvbVNldEltbWVkaWF0ZUFyZ3VtZW50cyhhcmd1bWVudHMpO1xuICAgICAgICAgICAgLy8gQ3JlYXRlIGEgPHNjcmlwdD4gZWxlbWVudDsgaXRzIHJlYWR5c3RhdGVjaGFuZ2UgZXZlbnQgd2lsbCBiZSBmaXJlZCBhc3luY2hyb25vdXNseSBvbmNlIGl0IGlzIGluc2VydGVkXG4gICAgICAgICAgICAvLyBpbnRvIHRoZSBkb2N1bWVudC4gRG8gc28sIHRodXMgcXVldWluZyB1cCB0aGUgdGFzay4gUmVtZW1iZXIgdG8gY2xlYW4gdXAgb25jZSBpdCdzIGJlZW4gY2FsbGVkLlxuICAgICAgICAgICAgdmFyIHNjcmlwdCA9IGRvYy5jcmVhdGVFbGVtZW50KFwic2NyaXB0XCIpO1xuICAgICAgICAgICAgc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBydW5JZlByZXNlbnQoaGFuZGxlKTtcbiAgICAgICAgICAgICAgICBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBodG1sLnJlbW92ZUNoaWxkKHNjcmlwdCk7XG4gICAgICAgICAgICAgICAgc2NyaXB0ID0gbnVsbDtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICBodG1sLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgICAgICAgICByZXR1cm4gaGFuZGxlO1xuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluc3RhbGxTZXRUaW1lb3V0SW1wbGVtZW50YXRpb24oKSB7XG4gICAgICAgIHNldEltbWVkaWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgdmFyIGhhbmRsZSA9IGFkZEZyb21TZXRJbW1lZGlhdGVBcmd1bWVudHMoYXJndW1lbnRzKTtcbiAgICAgICAgICAgIHNldFRpbWVvdXQocGFydGlhbGx5QXBwbGllZChydW5JZlByZXNlbnQsIGhhbmRsZSksIDApO1xuICAgICAgICAgICAgcmV0dXJuIGhhbmRsZTtcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBJZiBzdXBwb3J0ZWQsIHdlIHNob3VsZCBhdHRhY2ggdG8gdGhlIHByb3RvdHlwZSBvZiBnbG9iYWwsIHNpbmNlIHRoYXQgaXMgd2hlcmUgc2V0VGltZW91dCBldCBhbC4gbGl2ZS5cbiAgICB2YXIgYXR0YWNoVG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YgJiYgT2JqZWN0LmdldFByb3RvdHlwZU9mKGdsb2JhbCk7XG4gICAgYXR0YWNoVG8gPSBhdHRhY2hUbyAmJiBhdHRhY2hUby5zZXRUaW1lb3V0ID8gYXR0YWNoVG8gOiBnbG9iYWw7XG5cbiAgICAvLyBEb24ndCBnZXQgZm9vbGVkIGJ5IGUuZy4gYnJvd3NlcmlmeSBlbnZpcm9ubWVudHMuXG4gICAgaWYgKHt9LnRvU3RyaW5nLmNhbGwoZ2xvYmFsLnByb2Nlc3MpID09PSBcIltvYmplY3QgcHJvY2Vzc11cIikge1xuICAgICAgICAvLyBGb3IgTm9kZS5qcyBiZWZvcmUgMC45XG4gICAgICAgIGluc3RhbGxOZXh0VGlja0ltcGxlbWVudGF0aW9uKCk7XG5cbiAgICB9IGVsc2UgaWYgKGNhblVzZVBvc3RNZXNzYWdlKCkpIHtcbiAgICAgICAgLy8gRm9yIG5vbi1JRTEwIG1vZGVybiBicm93c2Vyc1xuICAgICAgICBpbnN0YWxsUG9zdE1lc3NhZ2VJbXBsZW1lbnRhdGlvbigpO1xuXG4gICAgfSBlbHNlIGlmIChnbG9iYWwuTWVzc2FnZUNoYW5uZWwpIHtcbiAgICAgICAgLy8gRm9yIHdlYiB3b3JrZXJzLCB3aGVyZSBzdXBwb3J0ZWRcbiAgICAgICAgaW5zdGFsbE1lc3NhZ2VDaGFubmVsSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSBpZiAoZG9jICYmIFwib25yZWFkeXN0YXRlY2hhbmdlXCIgaW4gZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIikpIHtcbiAgICAgICAgLy8gRm9yIElFIDbigJM4XG4gICAgICAgIGluc3RhbGxSZWFkeVN0YXRlQ2hhbmdlSW1wbGVtZW50YXRpb24oKTtcblxuICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIEZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICBpbnN0YWxsU2V0VGltZW91dEltcGxlbWVudGF0aW9uKCk7XG4gICAgfVxuXG4gICAgYXR0YWNoVG8uc2V0SW1tZWRpYXRlID0gc2V0SW1tZWRpYXRlO1xuICAgIGF0dGFjaFRvLmNsZWFySW1tZWRpYXRlID0gY2xlYXJJbW1lZGlhdGU7XG59KG5ldyBGdW5jdGlvbihcInJldHVybiB0aGlzXCIpKCkpKTtcbiIsIi8qKiBAbGljZW5zZSB6bGliLmpzIDIwMTIgLSBpbWF5YSBbIGh0dHBzOi8vZ2l0aHViLmNvbS9pbWF5YS96bGliLmpzIF0gVGhlIE1JVCBMaWNlbnNlICovKGZ1bmN0aW9uKCkgeyd1c2Ugc3RyaWN0Jzt2YXIgbT10aGlzO2Z1bmN0aW9uIHEoYyxkKXt2YXIgYT1jLnNwbGl0KFwiLlwiKSxiPW07IShhWzBdaW4gYikmJmIuZXhlY1NjcmlwdCYmYi5leGVjU2NyaXB0KFwidmFyIFwiK2FbMF0pO2Zvcih2YXIgZTthLmxlbmd0aCYmKGU9YS5zaGlmdCgpKTspIWEubGVuZ3RoJiZ2b2lkIDAhPT1kP2JbZV09ZDpiPWJbZV0/YltlXTpiW2VdPXt9fTt2YXIgcz1cInVuZGVmaW5lZFwiIT09dHlwZW9mIFVpbnQ4QXJyYXkmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgVWludDE2QXJyYXkmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgVWludDMyQXJyYXkmJlwidW5kZWZpbmVkXCIhPT10eXBlb2YgRGF0YVZpZXc7ZnVuY3Rpb24gdChjKXt2YXIgZD1jLmxlbmd0aCxhPTAsYj1OdW1iZXIuUE9TSVRJVkVfSU5GSU5JVFksZSxmLGcsaCxrLGwscCxuLHIsSztmb3Iobj0wO248ZDsrK24pY1tuXT5hJiYoYT1jW25dKSxjW25dPGImJihiPWNbbl0pO2U9MTw8YTtmPW5ldyAocz9VaW50MzJBcnJheTpBcnJheSkoZSk7Zz0xO2g9MDtmb3Ioaz0yO2c8PWE7KXtmb3Iobj0wO248ZDsrK24paWYoY1tuXT09PWcpe2w9MDtwPWg7Zm9yKHI9MDtyPGc7KytyKWw9bDw8MXxwJjEscD4+PTE7Sz1nPDwxNnxuO2ZvcihyPWw7cjxlO3IrPWspZltyXT1LOysraH0rK2c7aDw8PTE7azw8PTF9cmV0dXJuW2YsYSxiXX07ZnVuY3Rpb24gdShjLGQpe3RoaXMuZz1bXTt0aGlzLmg9MzI3Njg7dGhpcy5kPXRoaXMuZj10aGlzLmE9dGhpcy5sPTA7dGhpcy5pbnB1dD1zP25ldyBVaW50OEFycmF5KGMpOmM7dGhpcy5tPSExO3RoaXMuaT12O3RoaXMucz0hMTtpZihkfHwhKGQ9e30pKWQuaW5kZXgmJih0aGlzLmE9ZC5pbmRleCksZC5idWZmZXJTaXplJiYodGhpcy5oPWQuYnVmZmVyU2l6ZSksZC5idWZmZXJUeXBlJiYodGhpcy5pPWQuYnVmZmVyVHlwZSksZC5yZXNpemUmJih0aGlzLnM9ZC5yZXNpemUpO3N3aXRjaCh0aGlzLmkpe2Nhc2Ugdzp0aGlzLmI9MzI3Njg7dGhpcy5jPW5ldyAocz9VaW50OEFycmF5OkFycmF5KSgzMjc2OCt0aGlzLmgrMjU4KTticmVhaztjYXNlIHY6dGhpcy5iPTA7dGhpcy5jPW5ldyAocz9VaW50OEFycmF5OkFycmF5KSh0aGlzLmgpO3RoaXMuZT10aGlzLkE7dGhpcy5uPXRoaXMudzt0aGlzLmo9dGhpcy56O2JyZWFrO2RlZmF1bHQ6dGhyb3cgRXJyb3IoXCJpbnZhbGlkIGluZmxhdGUgbW9kZVwiKTtcbn19dmFyIHc9MCx2PTEseD17dTp3LHQ6dn07XG51LnByb3RvdHlwZS5rPWZ1bmN0aW9uKCl7Zm9yKDshdGhpcy5tOyl7dmFyIGM9eSh0aGlzLDMpO2MmMSYmKHRoaXMubT0hMCk7Yz4+Pj0xO3N3aXRjaChjKXtjYXNlIDA6dmFyIGQ9dGhpcy5pbnB1dCxhPXRoaXMuYSxiPXRoaXMuYyxlPXRoaXMuYixmPWQubGVuZ3RoLGc9dm9pZCAwLGg9dm9pZCAwLGs9Yi5sZW5ndGgsbD12b2lkIDA7dGhpcy5kPXRoaXMuZj0wO2lmKGErMT49Zil0aHJvdyBFcnJvcihcImludmFsaWQgdW5jb21wcmVzc2VkIGJsb2NrIGhlYWRlcjogTEVOXCIpO2c9ZFthKytdfGRbYSsrXTw8ODtpZihhKzE+PWYpdGhyb3cgRXJyb3IoXCJpbnZhbGlkIHVuY29tcHJlc3NlZCBibG9jayBoZWFkZXI6IE5MRU5cIik7aD1kW2ErK118ZFthKytdPDw4O2lmKGc9PT1+aCl0aHJvdyBFcnJvcihcImludmFsaWQgdW5jb21wcmVzc2VkIGJsb2NrIGhlYWRlcjogbGVuZ3RoIHZlcmlmeVwiKTtpZihhK2c+ZC5sZW5ndGgpdGhyb3cgRXJyb3IoXCJpbnB1dCBidWZmZXIgaXMgYnJva2VuXCIpO3N3aXRjaCh0aGlzLmkpe2Nhc2Ugdzpmb3IoO2UrXG5nPmIubGVuZ3RoOyl7bD1rLWU7Zy09bDtpZihzKWIuc2V0KGQuc3ViYXJyYXkoYSxhK2wpLGUpLGUrPWwsYSs9bDtlbHNlIGZvcig7bC0tOyliW2UrK109ZFthKytdO3RoaXMuYj1lO2I9dGhpcy5lKCk7ZT10aGlzLmJ9YnJlYWs7Y2FzZSB2OmZvcig7ZStnPmIubGVuZ3RoOyliPXRoaXMuZSh7cDoyfSk7YnJlYWs7ZGVmYXVsdDp0aHJvdyBFcnJvcihcImludmFsaWQgaW5mbGF0ZSBtb2RlXCIpO31pZihzKWIuc2V0KGQuc3ViYXJyYXkoYSxhK2cpLGUpLGUrPWcsYSs9ZztlbHNlIGZvcig7Zy0tOyliW2UrK109ZFthKytdO3RoaXMuYT1hO3RoaXMuYj1lO3RoaXMuYz1iO2JyZWFrO2Nhc2UgMTp0aGlzLmooeixBKTticmVhaztjYXNlIDI6Qih0aGlzKTticmVhaztkZWZhdWx0OnRocm93IEVycm9yKFwidW5rbm93biBCVFlQRTogXCIrYyk7fX1yZXR1cm4gdGhpcy5uKCl9O1xudmFyIEM9WzE2LDE3LDE4LDAsOCw3LDksNiwxMCw1LDExLDQsMTIsMywxMywyLDE0LDEsMTVdLEQ9cz9uZXcgVWludDE2QXJyYXkoQyk6QyxFPVszLDQsNSw2LDcsOCw5LDEwLDExLDEzLDE1LDE3LDE5LDIzLDI3LDMxLDM1LDQzLDUxLDU5LDY3LDgzLDk5LDExNSwxMzEsMTYzLDE5NSwyMjcsMjU4LDI1OCwyNThdLEY9cz9uZXcgVWludDE2QXJyYXkoRSk6RSxHPVswLDAsMCwwLDAsMCwwLDAsMSwxLDEsMSwyLDIsMiwyLDMsMywzLDMsNCw0LDQsNCw1LDUsNSw1LDAsMCwwXSxIPXM/bmV3IFVpbnQ4QXJyYXkoRyk6RyxJPVsxLDIsMyw0LDUsNyw5LDEzLDE3LDI1LDMzLDQ5LDY1LDk3LDEyOSwxOTMsMjU3LDM4NSw1MTMsNzY5LDEwMjUsMTUzNywyMDQ5LDMwNzMsNDA5Nyw2MTQ1LDgxOTMsMTIyODksMTYzODUsMjQ1NzddLEo9cz9uZXcgVWludDE2QXJyYXkoSSk6SSxMPVswLDAsMCwwLDEsMSwyLDIsMywzLDQsNCw1LDUsNiw2LDcsNyw4LDgsOSw5LDEwLDEwLDExLDExLDEyLDEyLDEzLFxuMTNdLE09cz9uZXcgVWludDhBcnJheShMKTpMLE49bmV3IChzP1VpbnQ4QXJyYXk6QXJyYXkpKDI4OCksTyxQO089MDtmb3IoUD1OLmxlbmd0aDtPPFA7KytPKU5bT109MTQzPj1PPzg6MjU1Pj1PPzk6Mjc5Pj1PPzc6ODt2YXIgej10KE4pLFE9bmV3IChzP1VpbnQ4QXJyYXk6QXJyYXkpKDMwKSxSLFM7Uj0wO2ZvcihTPVEubGVuZ3RoO1I8UzsrK1IpUVtSXT01O3ZhciBBPXQoUSk7ZnVuY3Rpb24geShjLGQpe2Zvcih2YXIgYT1jLmYsYj1jLmQsZT1jLmlucHV0LGY9Yy5hLGc9ZS5sZW5ndGgsaDtiPGQ7KXtpZihmPj1nKXRocm93IEVycm9yKFwiaW5wdXQgYnVmZmVyIGlzIGJyb2tlblwiKTthfD1lW2YrK108PGI7Yis9OH1oPWEmKDE8PGQpLTE7Yy5mPWE+Pj5kO2MuZD1iLWQ7Yy5hPWY7cmV0dXJuIGh9XG5mdW5jdGlvbiBUKGMsZCl7Zm9yKHZhciBhPWMuZixiPWMuZCxlPWMuaW5wdXQsZj1jLmEsZz1lLmxlbmd0aCxoPWRbMF0saz1kWzFdLGwscDtiPGsmJiEoZj49Zyk7KWF8PWVbZisrXTw8YixiKz04O2w9aFthJigxPDxrKS0xXTtwPWw+Pj4xNjtjLmY9YT4+cDtjLmQ9Yi1wO2MuYT1mO3JldHVybiBsJjY1NTM1fVxuZnVuY3Rpb24gQihjKXtmdW5jdGlvbiBkKGEsYyxiKXt2YXIgZCxlPXRoaXMucSxmLGc7Zm9yKGc9MDtnPGE7KXN3aXRjaChkPVQodGhpcyxjKSxkKXtjYXNlIDE2OmZvcihmPTMreSh0aGlzLDIpO2YtLTspYltnKytdPWU7YnJlYWs7Y2FzZSAxNzpmb3IoZj0zK3kodGhpcywzKTtmLS07KWJbZysrXT0wO2U9MDticmVhaztjYXNlIDE4OmZvcihmPTExK3kodGhpcyw3KTtmLS07KWJbZysrXT0wO2U9MDticmVhaztkZWZhdWx0OmU9YltnKytdPWR9dGhpcy5xPWU7cmV0dXJuIGJ9dmFyIGE9eShjLDUpKzI1NyxiPXkoYyw1KSsxLGU9eShjLDQpKzQsZj1uZXcgKHM/VWludDhBcnJheTpBcnJheSkoRC5sZW5ndGgpLGcsaCxrLGw7Zm9yKGw9MDtsPGU7KytsKWZbRFtsXV09eShjLDMpO2lmKCFzKXtsPWU7Zm9yKGU9Zi5sZW5ndGg7bDxlOysrbClmW0RbbF1dPTB9Zz10KGYpO2g9bmV3IChzP1VpbnQ4QXJyYXk6QXJyYXkpKGEpO2s9bmV3IChzP1VpbnQ4QXJyYXk6QXJyYXkpKGIpO2MucT0wO1xuYy5qKHQoZC5jYWxsKGMsYSxnLGgpKSx0KGQuY2FsbChjLGIsZyxrKSkpfXUucHJvdG90eXBlLmo9ZnVuY3Rpb24oYyxkKXt2YXIgYT10aGlzLmMsYj10aGlzLmI7dGhpcy5vPWM7Zm9yKHZhciBlPWEubGVuZ3RoLTI1OCxmLGcsaCxrOzI1NiE9PShmPVQodGhpcyxjKSk7KWlmKDI1Nj5mKWI+PWUmJih0aGlzLmI9YixhPXRoaXMuZSgpLGI9dGhpcy5iKSxhW2IrK109ZjtlbHNle2c9Zi0yNTc7az1GW2ddOzA8SFtnXSYmKGsrPXkodGhpcyxIW2ddKSk7Zj1UKHRoaXMsZCk7aD1KW2ZdOzA8TVtmXSYmKGgrPXkodGhpcyxNW2ZdKSk7Yj49ZSYmKHRoaXMuYj1iLGE9dGhpcy5lKCksYj10aGlzLmIpO2Zvcig7ay0tOylhW2JdPWFbYisrLWhdfWZvcig7ODw9dGhpcy5kOyl0aGlzLmQtPTgsdGhpcy5hLS07dGhpcy5iPWJ9O1xudS5wcm90b3R5cGUuej1mdW5jdGlvbihjLGQpe3ZhciBhPXRoaXMuYyxiPXRoaXMuYjt0aGlzLm89Yztmb3IodmFyIGU9YS5sZW5ndGgsZixnLGgsazsyNTYhPT0oZj1UKHRoaXMsYykpOylpZigyNTY+ZiliPj1lJiYoYT10aGlzLmUoKSxlPWEubGVuZ3RoKSxhW2IrK109ZjtlbHNle2c9Zi0yNTc7az1GW2ddOzA8SFtnXSYmKGsrPXkodGhpcyxIW2ddKSk7Zj1UKHRoaXMsZCk7aD1KW2ZdOzA8TVtmXSYmKGgrPXkodGhpcyxNW2ZdKSk7YitrPmUmJihhPXRoaXMuZSgpLGU9YS5sZW5ndGgpO2Zvcig7ay0tOylhW2JdPWFbYisrLWhdfWZvcig7ODw9dGhpcy5kOyl0aGlzLmQtPTgsdGhpcy5hLS07dGhpcy5iPWJ9O1xudS5wcm90b3R5cGUuZT1mdW5jdGlvbigpe3ZhciBjPW5ldyAocz9VaW50OEFycmF5OkFycmF5KSh0aGlzLmItMzI3NjgpLGQ9dGhpcy5iLTMyNzY4LGEsYixlPXRoaXMuYztpZihzKWMuc2V0KGUuc3ViYXJyYXkoMzI3NjgsYy5sZW5ndGgpKTtlbHNle2E9MDtmb3IoYj1jLmxlbmd0aDthPGI7KythKWNbYV09ZVthKzMyNzY4XX10aGlzLmcucHVzaChjKTt0aGlzLmwrPWMubGVuZ3RoO2lmKHMpZS5zZXQoZS5zdWJhcnJheShkLGQrMzI3NjgpKTtlbHNlIGZvcihhPTA7MzI3Njg+YTsrK2EpZVthXT1lW2QrYV07dGhpcy5iPTMyNzY4O3JldHVybiBlfTtcbnUucHJvdG90eXBlLkE9ZnVuY3Rpb24oYyl7dmFyIGQsYT10aGlzLmlucHV0Lmxlbmd0aC90aGlzLmErMXwwLGIsZSxmLGc9dGhpcy5pbnB1dCxoPXRoaXMuYztjJiYoXCJudW1iZXJcIj09PXR5cGVvZiBjLnAmJihhPWMucCksXCJudW1iZXJcIj09PXR5cGVvZiBjLnYmJihhKz1jLnYpKTsyPmE/KGI9KGcubGVuZ3RoLXRoaXMuYSkvdGhpcy5vWzJdLGY9MjU4KihiLzIpfDAsZT1mPGgubGVuZ3RoP2gubGVuZ3RoK2Y6aC5sZW5ndGg8PDEpOmU9aC5sZW5ndGgqYTtzPyhkPW5ldyBVaW50OEFycmF5KGUpLGQuc2V0KGgpKTpkPWg7cmV0dXJuIHRoaXMuYz1kfTtcbnUucHJvdG90eXBlLm49ZnVuY3Rpb24oKXt2YXIgYz0wLGQ9dGhpcy5jLGE9dGhpcy5nLGIsZT1uZXcgKHM/VWludDhBcnJheTpBcnJheSkodGhpcy5sKyh0aGlzLmItMzI3NjgpKSxmLGcsaCxrO2lmKDA9PT1hLmxlbmd0aClyZXR1cm4gcz90aGlzLmMuc3ViYXJyYXkoMzI3NjgsdGhpcy5iKTp0aGlzLmMuc2xpY2UoMzI3NjgsdGhpcy5iKTtmPTA7Zm9yKGc9YS5sZW5ndGg7ZjxnOysrZil7Yj1hW2ZdO2g9MDtmb3Ioaz1iLmxlbmd0aDtoPGs7KytoKWVbYysrXT1iW2hdfWY9MzI3Njg7Zm9yKGc9dGhpcy5iO2Y8ZzsrK2YpZVtjKytdPWRbZl07dGhpcy5nPVtdO3JldHVybiB0aGlzLmJ1ZmZlcj1lfTtcbnUucHJvdG90eXBlLnc9ZnVuY3Rpb24oKXt2YXIgYyxkPXRoaXMuYjtzP3RoaXMucz8oYz1uZXcgVWludDhBcnJheShkKSxjLnNldCh0aGlzLmMuc3ViYXJyYXkoMCxkKSkpOmM9dGhpcy5jLnN1YmFycmF5KDAsZCk6KHRoaXMuYy5sZW5ndGg+ZCYmKHRoaXMuYy5sZW5ndGg9ZCksYz10aGlzLmMpO3JldHVybiB0aGlzLmJ1ZmZlcj1jfTtmdW5jdGlvbiBVKGMsZCl7dmFyIGEsYjt0aGlzLmlucHV0PWM7dGhpcy5hPTA7aWYoZHx8IShkPXt9KSlkLmluZGV4JiYodGhpcy5hPWQuaW5kZXgpLGQudmVyaWZ5JiYodGhpcy5CPWQudmVyaWZ5KTthPWNbdGhpcy5hKytdO2I9Y1t0aGlzLmErK107c3dpdGNoKGEmMTUpe2Nhc2UgVjp0aGlzLm1ldGhvZD1WO2JyZWFrO2RlZmF1bHQ6dGhyb3cgRXJyb3IoXCJ1bnN1cHBvcnRlZCBjb21wcmVzc2lvbiBtZXRob2RcIik7fWlmKDAhPT0oKGE8PDgpK2IpJTMxKXRocm93IEVycm9yKFwiaW52YWxpZCBmY2hlY2sgZmxhZzpcIisoKGE8PDgpK2IpJTMxKTtpZihiJjMyKXRocm93IEVycm9yKFwiZmRpY3QgZmxhZyBpcyBub3Qgc3VwcG9ydGVkXCIpO3RoaXMucj1uZXcgdShjLHtpbmRleDp0aGlzLmEsYnVmZmVyU2l6ZTpkLmJ1ZmZlclNpemUsYnVmZmVyVHlwZTpkLmJ1ZmZlclR5cGUscmVzaXplOmQucmVzaXplfSl9XG5VLnByb3RvdHlwZS5rPWZ1bmN0aW9uKCl7dmFyIGM9dGhpcy5pbnB1dCxkLGE7ZD10aGlzLnIuaygpO3RoaXMuYT10aGlzLnIuYTtpZih0aGlzLkIpe2E9KGNbdGhpcy5hKytdPDwyNHxjW3RoaXMuYSsrXTw8MTZ8Y1t0aGlzLmErK108PDh8Y1t0aGlzLmErK10pPj4+MDt2YXIgYj1kO2lmKFwic3RyaW5nXCI9PT10eXBlb2YgYil7dmFyIGU9Yi5zcGxpdChcIlwiKSxmLGc7Zj0wO2ZvcihnPWUubGVuZ3RoO2Y8ZztmKyspZVtmXT0oZVtmXS5jaGFyQ29kZUF0KDApJjI1NSk+Pj4wO2I9ZX1mb3IodmFyIGg9MSxrPTAsbD1iLmxlbmd0aCxwLG49MDswPGw7KXtwPTEwMjQ8bD8xMDI0Omw7bC09cDtkbyBoKz1iW24rK10says9aDt3aGlsZSgtLXApO2glPTY1NTIxO2slPTY1NTIxfWlmKGEhPT0oazw8MTZ8aCk+Pj4wKXRocm93IEVycm9yKFwiaW52YWxpZCBhZGxlci0zMiBjaGVja3N1bVwiKTt9cmV0dXJuIGR9O3ZhciBWPTg7cShcIlpsaWIuSW5mbGF0ZVwiLFUpO3EoXCJabGliLkluZmxhdGUucHJvdG90eXBlLmRlY29tcHJlc3NcIixVLnByb3RvdHlwZS5rKTt2YXIgVz17QURBUFRJVkU6eC50LEJMT0NLOngudX0sWCxZLFosJDtpZihPYmplY3Qua2V5cylYPU9iamVjdC5rZXlzKFcpO2Vsc2UgZm9yKFkgaW4gWD1bXSxaPTAsVylYW1orK109WTtaPTA7Zm9yKCQ9WC5sZW5ndGg7WjwkOysrWilZPVhbWl0scShcIlpsaWIuSW5mbGF0ZS5CdWZmZXJUeXBlLlwiK1ksV1tZXSk7fSkuY2FsbCh0aGlzKTsgLy9AIHNvdXJjZU1hcHBpbmdVUkw9aW5mbGF0ZS5taW4uanMubWFwXG4iXX0=
