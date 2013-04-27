var should = require('should');
var osmread = require('../lib/main');

describe('osmread', function(){
    describe('when xml with invalid syntax is parsed', function(){
        it('then an error should be raised', function(done){
            osmread.parse({
                filePath: 'test/main.js',
                error: function(msg){
                    done();
                }
            });
        });
    });

    describe('when test.xml is parsed', function(){
        it('then bounds callback should min and max lat and long', function(done){
            osmread.parse({
                filePath: 'test/test.xml',
                bounds: function(bounds){
                    bounds.minlat.should.be.within(51.507360179555, 51.507360179556);

                    done();
                }
            });

            
        });
    });
});
