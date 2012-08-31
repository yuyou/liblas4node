////////////////////////////////////////////////////////////////////////////////////
/// Copyright(c) 2012 by Yu You (youyu.youyu@gmail.com, http://www.youyu.info/)
/// LibLAS Node.js simple port
/// Not thread-safe and only one LAS file access per open/read/write/close session
/// Or use singleton pattern
////////////////////////////////////////////////////////////////////////////////////
var ref = require('ref');
var ffi = require('ffi');
var Struct = require('ref-struct');


//var las = ref.types.void; // we don't know what the layout of "liblas" looks like
//var lasPtr = ref.refType(las);
var os = require("os");
//console.log(os.type());
var funcs = {
    'LAS_GetVersion': ['string', []],
    'LAS_GetFullVersion': ['string', []],
    'LAS_IsGDALEnabled': ['int', []],
    'LASHeader_GetSystemId': ['string', ['pointer']],
    'LASReader_Create': ['pointer', ['string']],
    'LASReader_GetHeader': ['pointer', ['pointer']],
    'LASHeader_Create': ['pointer', []],
    'LASHeader_Destroy': ['void', ['pointer']],
    'LASHeader_SetVersionMajor': ['void', ['pointer', 'uint8']],
    'LASHeader_GetVersionMajor': ['uint8', ['pointer']],
    'LASHeader_GetPointRecordsCount': ['uint32', ['pointer']],
    'LASHeader_GetScaleX': ['double', ['pointer']],
    'LASHeader_GetScaleY': ['double', ['pointer']],
    'LASHeader_GetScaleZ': ['double', ['pointer']],
    'LASHeader_GetOffsetX': ['double', ['pointer']],
    'LASHeader_GetOffsetY': ['double', ['pointer']],
    'LASHeader_GetOffsetZ': ['double', ['pointer']],
    'LASHeader_GetMaxX': ['double', ['pointer']],
    'LASHeader_GetMaxY': ['double', ['pointer']],
    'LASHeader_GetMaxZ': ['double', ['pointer']],
    'LASHeader_GetMinX': ['double', ['pointer']],
    'LASHeader_GetMinY': ['double', ['pointer']],
    'LASHeader_GetMinZ': ['double', ['pointer']],
    'LASReader_Seek': ['void', ['pointer', 'uint32']],
    'LASReader_CreateWithHeader': ['pointer', ['string', 'pointer']],
    'LASReader_GetPointAt': ['pointer', ['pointer', 'uint32']],
    'LASReader_GetSummaryXML': ['string', ['pointer']],
    'LASReader_GetNextPoint': ['pointer', ['pointer']],
    //'LASHeader_Destroy': [ 'void', ['pointer']],
    'LASReader_Destroy': ['void', ['pointer']],
    "LASPoint_GetX": ['double', ['pointer']],
    "LASPoint_GetRawX": ['double', ['pointer']],
    "LASPoint_GetY": ['double', ['pointer']],
    "LASPoint_GetRawY": ['double', ['pointer']],
    "LASPoint_GetZ": ['double', ['pointer']],
    "LASPoint_GetRawZ": ['double', ['pointer']]
    //'sqlite3_close': [ 'int', [ sqlite3PtrPtr ] ],
    //'sqlite3_exec': [ 'int', [ sqlite3PtrPtr, 'string', 'pointer', 'pointer', stringPtr ] ],
    //'sqlite3_changes': [ 'int', [ sqlite3PtrPtr ]]
}

var liblas;
if ('Darwin' == os.type()) {
    // binding to a few "libsqlite3" functions...
    liblas = ffi.Library('liblas_c.dylib', funcs);
}
else if ('nt' == os.type()) { //!!!!!! Win32 or NT?
    liblas = ffi.Library('liblas_c.dll', funcs);
}
else liblas = ffi.Library('liblas_c.so', funcs);

// LAS Point class
var Header = function(_handle) {
        if (_handle) {
            this.handle = _handle;
        }
        else {
            console.log("create a new LAS header");
            this.handle = liblas.LASHeader_Create()
        }
        // only for self-owned header
        this.destroy = function() {
            console.log("free the header");
            if (this.handle) {
                console.log("destroy the header handle");
                liblas.LASHeader_Destroy(this.handle);
            }
            this.handle = null;
        }
    }
Header.prototype = {
    set_majorversion: function(v) {
        liblas.LASHeader_SetVersionMajor(this.handle, v);
    },
    get_majorversion: function() {
        return liblas.LASHeader_GetVersionMajor(this.handle)
    },
    point_records_count: function(){
        return liblas.LASHeader_GetPointRecordsCount(this.handle);
    },
    // Gets the scale factors in [x, y, z] for the point data
    get_scale: function(){
        var x = liblas.LASHeader_GetScaleX(this.handle);
        var y = liblas.LASHeader_GetScaleY(this.handle);
        var z = liblas.LASHeader_GetScaleZ(this.handle);
        return [x, y, z];
    },
    // Gets the offset factors in [x, y, z] for the point data
    get_offset: function(){
        var x = liblas.LASHeader_GetOffsetX(this.handle);
        var y = liblas.LASHeader_GetOffsetY(this.handle);
        var z = liblas.LASHeader_GetOffsetZ(this.handle);
        return [x, y, z];
    },
    // [lng, lat,Z, lng,lat,Z]
    getBoundary: function(){
        
        var x2 = liblas.LASHeader_GetMaxX(this.handle);
        var y2 = liblas.LASHeader_GetMaxY(this.handle);
        var z2 = liblas.LASHeader_GetMaxZ(this.handle);
        var x1 = liblas.LASHeader_GetMinX(this.handle);
        var y1 = liblas.LASHeader_GetMinY(this.handle);
        var z1 = liblas.LASHeader_GetMinZ(this.handle);
        
        return [x1, y1, z1, x2, y2, z2];

    }

}

// LAS Point class
var Point = function(_handle) {
        this.handle = _handle;
        this.destroy = function() {
            if (this.handle) liblas.LASPoint_Destroy(self.handle);
        }
    }
Point.prototype = {
    getX: function() {
        return liblas.LASPoint_GetX(this.handle);
    },
    getRawX: function() {
        return liblas.LASPoint_GetRawX(this.handle)
    },
    //note:: The point will be descaled according to the `liblas.point.Point.header`'s  scale value for the X dimension.
    setX: function(value) {
        liblas.LASPoint_SetX(this.handle, value);
    },
    getY: function() {
        return liblas.LASPoint_GetY(this.handle);
    },
    getRawY: function() {
        return liblas.LASPoint_GetRawY(this.handle)
    },

    getZ: function() {
        return liblas.LASPoint_GetZ(this.handle);
    },
    getRawZ: function() {
        return liblas.LASPoint_GetRawZ(this.handle)
    },

}


//////////////////////////////////////////////////////////////////////
/////  LAS Class
//////////////////////////////////////////////////////////////////////
// LAS Point class
var LASClass = function() {
        this.handle = null;
        this._header = null;
        this.mode = 0;
    }
LASClass.prototype = {
    getVersion: function() {
        return liblas.LAS_GetVersion();
    },

    getFullVersion: function() {
        return liblas.LAS_GetFullVersion();
    },
    isGDALEnabled: function() {

        return liblas.LAS_IsGDALEnabled();
    },
    open: function(filename, header, mode) {
        if (!filename)
            throw new Error("filename is null or undefined");
        if (!header) {
            this.handle = liblas.LASReader_Create(filename);
            this.header = liblas.LASReader_GetHeader(this.handle);
        }
        else {
            this.header = header;
            this.handle = liblas.LASReader_CreateWithHeader(filename, this.header);
        }

    },

    //Returns the system identifier specified in the file
    get_systemid: function() {
        return liblas.LASHeader_GetSystemId(this.handle)
    },

    getHeader: function() {
        if (this.header) {
            //console.log("get the header");
            return new Header(this.header);
        }
        else throw new Error("you have to open a LAS file first");
    },
    createHeader: function(){
        return new Header(this.handle);
    },
    // close the LAS file and release the handle
    close: function() {
        if (this.handle) liblas.LASReader_Destroy(this.handle);
        if (this.header) liblas.LASHeader_Destroy(this.header);
        this.handle = null;
        this.header = null;
    },
    // Returns the expected number of point records in the file
    point_records_count: function(){
        return liblas.LASHeader_GetPointRecordsCount(this.header);
    },
    read: function(index) {
        if (this.mode == 0) {
            var ph = liblas.LASReader_GetPointAt(this.handle, index);
            //p.set_header(lasheader.Header(handle=self._header, copy=False))
            var point = new Point(ph);
            return point;
        }
        return null;
    },
    // return a reference pointer!! not a real Point object
    getNextPoint: function(){
        var h = liblas.LASReader_GetNextPoint(this.handle);
        if (h!=null) return new Point(h);
        else return null;
    },
    seek: function(index){
        liblas.LASReader_Seek(this.handle, index);
    },
    getSummaryXML: function(){
        return liblas.LASReader_GetSummaryXML(this.handle);
    },
//    getPointIterator: function(){
//        
//    }


}

//exports.Header = Header;
exports.Las = new LASClass();
//exports.getFullVersion = getFullVersion;
//exports.isGDALEnabled = isGDALEnabled;
//module.exports = new LASClass();
//exports.open = open;
//exports.close = close;
//exports.read = read;
//exports.get_systemid = get_systemid;
//module.exports = new LibLas();