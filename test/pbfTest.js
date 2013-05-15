var should = require('should');
var osmread = require('../lib/main');

describe('pbf read', function(){
    
    it('just run the stuff', function(done){
        // this.timeout(60 * 1000);

        osmread.parsePbf(function(err){
            if(err){
                console.log(err);

                should.fail();
            }

            return done();
        });
    });

});
