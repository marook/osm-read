#### osm-read - an openstreetmap XML and PBF parser for node.js and the browser

1. Introduction
2. Usage Examples
    1. Simple Usage Example
    2. Parse OSM XML from URL Example
    3. PBF random access parser
3. Version Upgrade Guide
4. TODOs
5. License
6. Contact

------------------------------------------------------------------------
#### Introduction

osm-read parses openstreetmap XML and PBF files as described in
[http://wiki.openstreetmap.org/wiki/OSM_XML](http://wiki.openstreetmap.org/wiki/OSM_XML) and
[http://wiki.openstreetmap.org/wiki/PBF_Format](http://wiki.openstreetmap.org/wiki/PBF_Format)

------------------------------------------------------------------------
#### Continuous Integration

[![Build Status](https://travis-ci.org/marook/osm-read.png?branch=master)](https://travis-ci.org/marook/osm-read)

------------------------------------------------------------------------
#### Simple Usage Example

The following code is used to parse openstreetmap XML or PBF files in a
SAX parser like callback way.

```javascript
var parser = osmread.parse({
    filePath: 'path/to/osm.xml',
    endDocument: function(){
        console.log('document end');
    },
    bounds: function(bounds){
        console.log('bounds: ' + JSON.stringify(bounds));
    },
    node: function(node){
        console.log('node: ' + JSON.stringify(node));
    },
    way: function(way){
        console.log('way: ' + JSON.stringify(way));
    },
    relation: function(relation){
        console.log('relation: ' + JSON.stringify(relation));
    },
    error: function(msg){
        console.log('error: ' + msg);
    }
});

// you can pause the parser
parser.pause();

// and resume it again
parser.resume();
```


------------------------------------------------------------------------
#### Parse PBF in the browser

The browser bundle 'osm-read-pbf.js' provides a global variable 'pbfParser' 
with a 'parse' method.

Example, see also example/pbf.html:

```html
<script src="../osm-read-pbf.js"></script>
<script>
    pbfParser.parse({
        filePath: 'test.pbf',
        endDocument: function(){
            console.log('document end');
        },
        node: function(node){
            console.log('node: ' + JSON.stringify(node));
        },
        way: function(way){
            console.log('way: ' + JSON.stringify(way));
        },
        relation: function(relation){
            console.log('relation: ' + JSON.stringify(relation));
        },
        error: function(msg){
            console.error('error: ' + msg);
            throw msg;
        }
    });
</script>
```

As an alternative to passing an URL in "filePath", the option "buffer" can be 
used to pass an already loaded ArrayBuffer object:

```javascript
var buf = ... // e.g. xhr.response

pbfParser.parse({
    buffer: buf,
...
```

A third alternative is to let the user choose a local file using the 
HTML5 File API, passing the file object as "file" option:

    <input type="file" id="file" accept=".pbf">
    <script>
        document.getElementById("file").addEventListener("change", parse, false);

        function parse(evt) {
            var file = evt.target.files[0];

            pbfParser.parse({
                file: file,
            ...

See also example/file.html

------------------------------------------------------------------------
#### Build

Build or update the browser bundle `osm-read-pbf.js` with browserify:
```bash
$ npm run browserify
```

To install browserify (http://browserify.org/):
```bash
$ npm install -g browserify
```

------------------------------------------------------------------------
#### Parse OSM XML from URL Example

Currently you can only parse OSM data in XML from URLs. Here's an example:

```javascript
osmread.parse({
    url: 'http://overpass-api.de/api/interpreter?data=node(51.93315273540566%2C7.567176818847656%2C52.000418429293326%2C7.687854766845703)%5Bhighway%3Dtraffic_signals%5D%3Bout%3B',
    format: 'xml',
    endDocument: function(){
        console.log('document end');
    },
    bounds: function(bounds){
        console.log('bounds: ' + JSON.stringify(bounds));
    },
    node: function(node){
        console.log('node: ' + JSON.stringify(node));
    },
    way: function(way){
        console.log('way: ' + JSON.stringify(way));
    },
    relation: function(relation){
        console.log('relation: ' + JSON.stringify(relation));
    },
    error: function(msg){
        console.log('error: ' + msg);
    }
});
```

------------------------------------------------------------------------
#### PBF random access parser

The following code allows to create a random access openstreetmap PBF
file parser:

```javascript
osmread.createPbfParser({
    filePath: 'path/to/osm.pbf',
    callback: function(err, parser){
        var headers;

        if(err){
            // TODO handle error
        }

        headers = parser.findFileBlocksByBlobType('OSMHeader');

        parser.readBlock(headers[0], function(err, block){
            console.log('header block');
            console.log(block);

            parser.close(function(err){
                if(err){
                    // TODO handle error
                }
            });
        });
    }
});
```

***Don't forget to close the parser after usage!***


------------------------------------------------------------------------
#### Version Upgrade Guide

Sometimes APIs change... they break your code but things get easier for
the rest of us. I'm sorry if a version upgrade gives you some extra
hours. To makes things a little less painfull you can find migration
instructions in the file ChangeLog.


------------------------------------------------------------------------
#### TODOs

XML parser:  

- parse timestamps

------------------------------------------------------------------------
#### License

See file COPYING for details.


------------------------------------------------------------------------
#### Contact

author: Markus Peröbner <markus.peroebner@gmail.com>
