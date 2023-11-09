// startup for interactive testing of 2048
// use .load in node repl
var w, ld, tb;
if (typeof window === 'undefined') {
    // cheap hoisting hack
    w = require("./2048.js");
    ld = require('lodash');
    tb = new w.tile_board(ld.chunk(w.tile_col.make_col(24).tiles, 4));
}
