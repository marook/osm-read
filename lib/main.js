var xmlParser = require('./xmlParser.js');
var pbfParser = require('./pbfParser.js');
var http = require('http');

function getFileType(filePath){
    return /^.*[.](xml|pbf)$/.exec(filePath)[1];
}

var CALLBACK_PARSER_BY_FILE_TYPE = {
    xml: xmlParser.parse,
    pbf: pbfParser.parse
};

function parse(opts){
    return CALLBACK_PARSER_BY_FILE_TYPE[getFileType(opts.filePath)](opts);
}

function parseOsmXmlFromUrl(opts){
    var req = http.get(opts.url, function (response){
        var str = '';

        response.on('data', function (chunk) {
          str += chunk;
        });

        response.on('end', function () {
            opts.resultString = str;
            xmlParser.parse(opts);
        });
    });
    req.end();
}

module.exports = {

    /**
     * Detects the file type from the file name. Possible return values
     * are:
     * - xml: openStreetMap XML format
     * - pbf: openStreetMap PBF format
     */
    getFileType: getFileType,

    parse: parse,

    parseOsmXmlFromUrl: parseOsmXmlFromUrl,

    parseXml: xmlParser.parse,

    parsePbf: xmlParser.parse,

    createPbfParser: pbfParser.createParser

};
