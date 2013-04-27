var libxml = require('node-xml');

function parse(opts){
    var parser, elementParser;

    elementParser = {};

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
            var node, i, attr, key, value;
            
            node = {};

            for(i = 0; i < attrs.length; ++i){
                attr = attrs[i];
                
                key = attr[0];
                value = attr[1];

                if(key === 'id'){
                    node[key] = value;
                }
            }

            return opts.node(node);
        };
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

        if(opts.error){
            cb.onError(opts.error);
        }
    });

    parser.parseFile(opts.filePath);
}

module.exports = {
    parse: parse
};
