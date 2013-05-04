var should = require('should');
var osmread = require('../lib/main');

describe('pbf read', function(){
    
    it('just run the stuff', function(){
        osmread.parsePbf();
    });

});
