function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(buffer));
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer
};
