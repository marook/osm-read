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
