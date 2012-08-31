# liblas4node

This is a Node.js library for reading, modifying and creating .LAS LIDAR files.
It is a binding to native LibLAS tool (http://www.liblas.org/)

## Usage

```javascript
var liblas = require("liblas")

console.log(liblas.getVersion());
console.log(liblas.getFullVersion());

liblas.open('./test/1.2c.las', null, 'r');

var p = liblas.read(0);
console.log(p);
liblas.close();
```

## Features
