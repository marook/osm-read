var osmread = require('../lib/main');

osmread.parse({
    filePath: '../test/test.pbf',
    endDocument: function(){
        console.log('document end');
    },
    bounds: function(bounds){
        console.log('bounds: ' + JSON.stringify(bounds));
    },
    node: function(node){
        console.log('node: ' + JSON.stringify(node));
    },
    way: function(way){
        console.log('way: ' + JSON.stringify(way));
    },
    error: function(msg){
        console.log('error: ' + msg);
    }
});
