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

function readPBFElementFromBuffer(buffer, pbfDecode, callback){
    return callback(null, pbfDecode(toArrayBuffer(buffer)));
}

module.exports = {
    readPBFElementFromBuffer: readPBFElementFromBuffer
};
