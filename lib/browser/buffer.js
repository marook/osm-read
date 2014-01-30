// minimal node.js Buffer browser shim for pbf.js

// global
Buffer = Uint8Array;

Buffer.prototype.readUInt32BE = function(offset) {
    return new DataView(this.buffer).getUint32(offset, false);
};

Buffer.prototype.readInt32BE = function(offset) {
    return new DataView(this.buffer).getInt32(offset, false);
};

//void setUint8(unsigned long byteOffset, unsigned byte value);
Buffer.prototype.writeUInt8 = function(value, offset) {
    return new DataView(this.buffer).setUint8(offset, value);
};

Buffer.prototype.slice = Uint8Array.prototype.subarray;

/*
Buffer.prototype.toString = function() {
    return this.utf8Slice(0, this.length);
};

// from Browser-buffer.js by Alex Wilson 
// https://github.com/arextar/browser-buffer/blob/b6afd534513189bc97b3a92930266266466aa392/src/browser-buffer.js#L230
//
//Based off of buffer.js in the Node project(copyright Joyent, Inc. and other Node contributors.)
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
Buffer.prototype.utf8Slice = function (start, end) {
    for (var string = "", c, i = start, p = 0, c2, c3; p < end && (c = this[i]); i++) {
        p++;
        if (c < 128) {
            string += String.fromCharCode(c);
        } else if ((c > 191) && (c < 224)) {
            c2 = this[i + 1];
            string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            i++;
        } else {
            c2 = this[i + 1];
            c3 = this[i + 2];
            string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            i += 2;
        }
    }
    return string;
};
*/