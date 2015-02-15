function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(buffer));
}

function blobDataToBuffer(blob){
    return blob.toBuffer();
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer,
    blobDataToBuffer: blobDataToBuffer
};
