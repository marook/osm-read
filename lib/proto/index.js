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
