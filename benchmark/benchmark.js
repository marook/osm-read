var osmread = require('../lib/main');
var util = require('util');

function main(){
    benchmarkSmallXmlRead();
}

function benchmarkSmallXmlRead(){
    osmread.parse({
        filePath: '../test/test.xml',
        error: fail
    });
}

function fail(msg){
    util.log('Failed to execute benchmark. Reason: ' + msg);

    throw new Error(msg);
}

main();
