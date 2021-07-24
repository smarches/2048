// tree-shaking should minimize imports
import { chunk } from 'lodash';
import { sample } from './random'
import { rotate_array } from './arrays';

import { Direction, Tile, tile_column, tile_board } from './tiles';

// for running in the Node repl
const _2048 = function(W=4,H=4) {
    let tc = tile_column.make_col(W*H,false);
    const board = new tile_board(chunk(tc.tiles,H));
    board.add_tile(1);
    board.print();
    process.stdin.setRawMode(true);
    process.stdin.on('keypress',function(letter,key) {
        var dir;
        switch(key.name) {
            case 'h':
                dir = Direction.Left;
                break;
            case 'j':
                dir = Direction.Down;
                break;
            case 'k':
                dir = Direction.Up;
                break;
            case 'l':
                dir = Direction.Right;
                break;
            default:
                break;
        }
        if(Boolean(dir)){
            board.runmv(dir);
            console.clear();
            board.print();
            if(board.danzo) {
                console.log("You lost!");
                process.exit();
            }
        }
    });
}

// /*
if(typeof window === 'undefined') {
    // generic helpers
    exports.turn = rotate_array;
    exports.sample = sample;
    // class objects
    exports.tile_board = tile_board;
    exports.tile = Tile;
    exports.tile_col = tile_column;
    exports._2048 = _2048;
}
// */


