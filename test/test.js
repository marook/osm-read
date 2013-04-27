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

        before(function(done){
            parsedBounds = [];
            parsedNodes = [];
            parsedWays = [];

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
                way: function(way){
                    parsedWays.push(way);
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
            parsedNodes.length.should.be.equal(6);
        });

        it('then first parsed node has id 319408586', function(){
            parsedNodes[0].id.should.be.equal('319408586');
        });

        it('then first parsed node has lat 51.5074089', function(){
            parsedNodes[0].lat.should.be.within(51.507408, 51.507409);
        });

        it('then first parsed node has lon -0.1080108', function(){
            parsedNodes[0].lon.should.be.within(-0.108011, -0.108010);
        });

        it('then first parsed node has version 1', function(){
            parsedNodes[0].version.should.be.equal(1);
        });

        it('then first parsed node has changeset 440330', function(){
            parsedNodes[0].changeset.should.be.equal(440330);
        });

        it('then first parsed node has user smsm1', function(){
            parsedNodes[0].user.should.be.equal('smsm1');
        });

        it('then first parsed node has uid 6871', function(){
            parsedNodes[0].uid.should.be.equal('6871');
        });

        it('then first parsed node is visible', function(){
            parsedNodes[0].visible.should.be.equal(true);
        });

        it('then third parsed node has name and is cafe', function(){
            var thirdNode = parsedNodes[2];

            thirdNode.tags.name.should.be.equal('Jam\'s Sandwich Bar');
            thirdNode.tags.amenity.should.be.equal('cafe');
        });

        it('then way callback should deliver 1 way', function(){
            parsedWays.length.should.be.equal(1);
        });
    });
});
