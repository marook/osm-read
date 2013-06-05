var xmlParser = require('./xmlParser.js');
var pbfParser = require('./pbfParser.js');

module.exports = {
    /**
     * @deprecated Use parseXml(...) instead.
     */
    parse: xmlParser.parse,

    parseXml: xmlParser.parse,

    createPbfParser: pbfParser.parse

};
