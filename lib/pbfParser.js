var protoBuf = require("protobufjs");

var builder = protoBuf.protoFromFile('./lib/fileformat.proto')

var fileFormat = builder.build('OSMPBF');

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

function parse(){
    var fs;

    fs = require('fs');

    fs.open('./test/test.pbf', 'r', function(err, fd){
        var buffer;

        buffer = new Buffer(4);
        
        fs.read(fd, buffer, 0, 4, 0, function(err, bytesRead, buffer){
            var blobHeaderSize, headerBuffer;

            blobHeaderSize = buffer.readInt32BE(0);

            console.log('header size: ' + blobHeaderSize);

            headerBuffer = new Buffer(blobHeaderSize);

            fs.read(fd, headerBuffer, 0, blobHeaderSize, 4, function(err, bytesRead, headerBuffer){
                var blobHeader;

                blobHeader = fileFormat.BlobHeader.decode(toArrayBuffer(headerBuffer));

                console.log(blobHeader);
            });
        });


    });

    /*
    fs.readFile('./test/test.pbf', function(err, data){
        if(err){
            throw err;
        }

        fileFormat.BlobHeader.decode(toArrayBuffer(data));
        
    });
    */

}

module.exports = {
    parse: parse
};
