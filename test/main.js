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
                }
            });
        });

        it('then bounds callback should min and max lat and long', function(){
            var bounds = parsedBounds[0];

            bounds.minlat.should.be.within(51.507360179555, 51.507360179556);
        });

        it('then node callback should deliver 6 nodes', function(){
            parsedNodes.length.should.eql(6);
        });
    });
});
