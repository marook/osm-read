var should = require('should');
var osmread = require('../lib/main');

describe('osmread', function(){
    describe('when xml with invalid syntax is parsed', function(){
        it('then an error should be raised', function(done){
            osmread.parse({
                filePath: 'test/invalid.xml',
                error: function(msg){
                    done();
                }
            });
        });
    });

    describe('when test.xml is parsed', function(){
        var parsedBounds, parsedNodes;

        beforeEach(function(done){
            parsedBounds = [];
            parsedNodes = [];

            osmread.parse({
                filePath: 'test/test.xml',
                endDocument: function(){
                    done();
                },
                bounds: function(bounds){
                    parsedBounds.push(bounds);
                },
                node: function(node){
                    parsedNodes.push(node);
                },
                error: function(msg){
                    should.fail(msg);

                    done();
                }
            });
        });

        it('then bounds callback should min and max lat and long', function(){
            var bounds = parsedBounds[0];

            bounds.minlat.should.be.within(51.507360179555, 51.507360179556);
        });

        it('then node callback should deliver 6 nodes', function(){
            parsedNodes.length.should.be.eql(6);
        });

        it('then first parsed node has id 319408586', function(){
            parsedNodes[0].id.should.be.eql('319408586');
        });

        it('then first parsed node has lat 51.5074089', function(){
            parsedNodes[0].lat.should.be.within(51.507408, 51.507409);
        });

        it('then first parsed node has lon -0.1080108', function(){
            parsedNodes[0].lon.should.be.within(-0.108011, -0.108010);
        });
    });
});
