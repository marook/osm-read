var libxml = require('node-xml');

function parseNOP(s){
    return s;
}

function parseIntDecimal(s){
    return parseInt(s, 10);
}

function parseBool(s){
    return (s === 'true');
}

var nodeAttrParser = {
    id: parseNOP,
    lat: parseFloat,
    lon: parseFloat,
    version: parseIntDecimal,
    changeset: parseIntDecimal,
    user: parseNOP,
    uid: parseNOP,
    visible: parseBool
};

var wayAttrParser = {
    id: parseNOP,
    version: parseIntDecimal,
    changeset: parseIntDecimal,
    user: parseNOP,
    uid: parseNOP,
    visible: parseBool
};

function parse(opts){
    var parser, elementParser, node, way, tags;

    node = null;
    way = null;
    tags = {};

    elementParser = {};
    elementEndParser = {};

    function ensureTagsParser(){
        if(elementParser.tag){
            return;
        }

        elementParser.tag = function(elem, attrs, prefix, uri, namespaces){
            var tag, i, attr, key, value;

            tagKey = null;
            tagValue = null;

            for(i = 0; i < attrs.length; ++i){
                attr = attrs[i];

                key = attr[0];

                if(key === 'k'){
                    tagKey = attr[1];
                }
                else if(key === 'v'){
                    tagValue = attr[1];
                }
            }

            tags[tagKey] = tagValue;
        };
    }

    if(opts.bounds){
        elementParser.bounds = function(elem, attrs, prefix, uri, namespaces){
            var bounds, i, attr, key, value;

            bounds = {};

            for(i = 0; i < attrs.length; ++i){
                attr = attrs[i];

                key = attr[0];
                value = attr[1];

                bounds[key] = parseFloat(value);
            }

            return opts.bounds(bounds);
        };
    }

    if(opts.node){
        elementParser.node = function(elem, attrs, prefix, uri, namespaces){
            var i, attr, key, value, attrParser;
            
            tags = {};

            node = {
                tags: tags
            };

            for(i = 0; i < attrs.length; ++i){
                attr = attrs[i];
                
                key = attr[0];

                attrParser = nodeAttrParser[key];
                if(attrParser === undefined){
                    continue;
                }

                value = attr[1];

                node[key] = attrParser(value);
            }
        };

        elementEndParser.node = function(elem, prefix, uri){
            var n;

            n = node;
            node = null;

            return opts.node(n);
        };

        ensureTagsParser();
    }

    if(opts.way){
        elementParser.way = function(elem, attrs, prefix, uri, namespaces){
            var i, attr, key, value, attrParser;
            
            tags = {};

            way = {
                tags: tags
            };

            for(i = 0; i < attrs.length; ++i){
                attr = attrs[i];
                
                key = attr[0];

                attrParser = wayAttrParser[key];
                if(attrParser === undefined){
                    continue;
                }

                value = attr[1];

                way[key] = attrParser(value);
            }
        };

        elementEndParser.way = function(elem, prefix, uri){
            var w;

            w = way;
            way = null;

            return opts.way(w);
        };

        ensureTagsParser();
    }

    parser = new libxml.SaxParser(function(cb){
        if(opts.endDocument){
            cb.onEndDocument(opts.endDocument);
        }

        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces){
            if(elem in elementParser){
                elementParser[elem](elem, attrs, prefix, uri, namespaces);
            }
        });

        cb.onEndElementNS(function(elem, prefix, uri){
            if(elem in elementEndParser){
                elementEndParser[elem](elem, prefix, uri);
            }
        });

        if(opts.error){
            cb.onError(opts.error);
        }
    });

    parser.parseFile(opts.filePath);
}

module.exports = {
    parse: parse
};
