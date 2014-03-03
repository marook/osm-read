function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(buffer));
}

function pbfBufferToBuffer(src, srcOffset, len){
    return src.readUTF8StringBytes(len, srcOffset).string;
}

function blobDataToBuffer(blob){
    return new Uint8Array(blob.toArrayBuffer());
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer,
    pbfBufferToBuffer: pbfBufferToBuffer,
    blobDataToBuffer: blobDataToBuffer
};
