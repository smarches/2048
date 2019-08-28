// reduce webpack size
const ld = {};
ld.range = require('lodash/range');
ld.flattenDepth = require('lodash/flattenDepth');
ld.toPairs = require('lodash/toPairs');
ld.remove = require('lodash/remove');
ld.join = require('lodash/join');
ld.chunk = require('lodash/chunk');

function nullish(x){
    return typeof(x) === 'undefined' || x === null || isNaN(x);
}

function is_falsy(x){
    return nullish(x) || x === 0 || x === false || x === 'false';
}

function is_truthy(x){
    return x === 1 || x === true || x === 'true';
}

// given an input (column-oriented) rectangular array (N columns, each of length M),
// 'rotate' the array by the number of times (each 'time' is a 90 degree turn)
// input array must be rectangular for this to be sensible
function rotate_array(AA,times = 0,dir = 'clockwise') {
    times %= 4; // equivalence group
    if(times < 0) times += 4;
    if(dir === 'clockwise') dir = 4-dir;
    let res = [];
    let M = AA[0].length;
    switch(times) {
        case 1:
            for(let i=0;i<M;i++){
                res.push( AA.map(A => A[i]).reverse() );
            }
            break;
        case 2: // need slice() to get a copy (otherwise modifies input AA)
            res = AA.map( a => a.slice().reverse() ).reverse();
            break;
        case 3:
            for(let i=M-1;i>=0;i--){
                res.push( AA.map( A => A[i]) );
            }
            break;
        default:
            res = AA;
            break;
    }
    return res;
}

function sample(elems,n,replace=false) {
    let res = [];
    if(typeof elems === 'number'){
        if(is_falsy(elems) || elems < 0) return res;
        elems = ld.range(1,Math.floor(elems+1));
    }
    let L = elems.length;
    if(n != Math.floor(n)) return res;
    if(replace) {
        for(let i=0;i<n;i++) {
            res.push(elems[Math.floor(L*Math.random())]);
        }
    } else {
        if(n >= L) return elems;
        const ix = ld.range(L);
        for(let i=0;i<n;i++){
            let ii = Math.floor(L--*Math.random());
            res.push(elems[ix[ii]]);
            [ix[ii],ix[L]] = [ix[L],ix[ii]];
        }
    }
    return res;
}

const ix_map = Array.apply(0,Array(11)).map( (_,i) => Math.pow(2,i+1));
const ix_rev = {};
ix_map.forEach((e,i) => ix_rev[e] = i+1);

class tile {
    constructor(n) {
        this.update(n);
    }
    get val() { return this._val; }
    update(n) {
        let ix = ix_rev[n] || 0;
        this._val = ix === 0 ? 0 : n;
    }
}

class tile_column {
    constructor(tile_array) {
        this.tiles = tile_array;
        this._len = tile_array.length;
        this.has_merged = Array(this._len).fill(false);
    }
    get len() { return this._len; }

    swap_tile(i,j) {
        if(i >= this._len || j >= this._len || i < 0 || j < 0) return;
        [this.tiles[j],this.tiles[i]] = [this.tiles[i],this.tiles[j]];
    }
    // perform one round of moving tiles. Don't want to do all @ once for animation purposes (though that is more efficient to calculate)
    fall() {
        let any_move = false;
        for(var i=this.len-1;i > 0; i--) {
            if(!this.tiles[i].val && this.tiles[i-1].val) {
                this.swap_tile(i,i-1);
                any_move = true;
            }
        }
        return any_move;
    }
    merge() { // note this is 'rightfold' operation not 'leftfold'
        let score = 0;
        for(var i=this.len-1;i > 0; i--) {
            let v = this.tiles[i].val;
            let anymerge = this.has_merged[i] || this.has_merged[i-1];
            if(!anymerge && v > 0 && this.tiles[i-1].val === v) {
                this.tiles[i].update(v+v);
                this.has_merged[i] = true; // mark to prevent recursive merging this round
                this.tiles[i-1].update(0);
                score += v+v;
            }
        }
        return score;
    }
    // single iteration of compacting, along with a flag to indicate finished or not
    compact1() {
        let [b1,b2] = [this.fall(), this.merge()];
        return {tiles: this.tiles, changed: b1 || b2, 'score': b2};
    }
    // whole process of moving column of tiles, so merge markers are reset
    compact() {
        let [score,done] = [0,false];
        while(!done) {
            let [a,b] = [this.fall(),this.merge()];
            score += b;
            done = a || b;
        }
        this.has_merged = Array(this._len).fill(false);
        return score;
    }
    static make_col(n,randomize=true) {
        n = Math.floor(n);
        if(nullish(n)) {
            return null;
        }
        const res = [];
        for(let i=0;i<n;i++) {
            let ix = randomize ? 10 - Math.floor(Math.log2(Math.ceil(2048*Math.random()))) : 0;
            res.push(new tile(ix));
        }
        return new tile_column(res);
    }
    static val_col(vv) {
        return new tile_column(vv.map(v => new tile(v)));
    }
}

class tile_board {
    constructor(tile_arr) {
        this.cols = tile_arr;
        this.W = tile_arr.length;
        this.H = tile_arr[0].length;
        this.score = 0;
        this.busy = false;
        this.end_state = {left:false,right:false,up:false,down:false};
    }
    get w() { return this.W; }
    get h() { return this.H; }
    get vals() {
        return ld.flattenDepth(this.cols,1).map(e => e.val);
    }
    get danzo() { // all done?
        return ld.toPairs(this.end_state).reduce((a,b) => a && b[1],true);
    }
    // inner loop of a given move is rotate -> move/update -> unrotate -> paint screen
    // while any moves are valid
    move_tiles(dir) {
        let rot_turns = dir === 'left' ? 1 : (dir === 'right' ? 3 : (dir === 'up' ? 2 : 0));
        let un_rot = 4 - rot_turns;
        let tcols = rotate_array(this.cols,rot_turns);
        // build up the sequence of arrangements that resulted from initiating movement in the given direction
        let [move_array, done] = [[tcols],false];
        // init tile_column once here to manage 'merged' tags
        let tcs = tcols.map(a => new tile_column(a.slice()));
        const n_cols = tcs.length;
        while(!done) {
            let n_done = 0;
            for(let j=0;j<tcols.length;j++){
                let tc = tcs[j].compact1();
                tcols[j] = tc.tiles;
                n_done += 1 - tc.changed;
                this.score += tc.score;
            }
            done = n_done === n_cols;
            if(!done) move_array.push(tcols);
        }
        this.cols = rotate_array(tcols,un_rot);
        if(move_array.length <= 1) {
            this.end_state[dir] = true;
        } else {
            this.end_state = {left:false,right:false,up:false,down:false};
        }
        return move_array;
    }
    // enumerate empty space and randomly select n for filling
    add_tile(n=1) {
        let opens = ld.flattenDepth(this.cols,1)
            .map((elem,i) => elem.val === 0 ? i : null);
        let openix = ld.remove(opens,function(e){return e != null});
        n = Math.min(n,openix.length);
        if(n <= 0) return [];
        let add_ix = sample(openix,n,false);
        let res = [];
        for(let j=0;j<add_ix.length;j++){
            let [col,row] = [Math.floor(add_ix[j]/this.H),add_ix[j]%this.H];
            let z = Math.random();
            let tval = z > 0.9 ? (z > 0.98 ? 8 : 4) : 2;
            this.cols[col][row] = new tile(tval);
            res.push([col,row]);
        }
        return res;
    }
    // node only
    print() {
        const [bw,zch,zre,lpad] = [5*this.W + 2,'.',/0/g,'   '];
        console.log(('Score: ' + this.score.toString().padStart(6)).padStart(bw + lpad.length));
        console.log(`\n${lpad}${'-'.repeat(bw)}`);
        for(let j=0;j<this.H;j++) {
            let vals = this.cols.map(
                a => a[j].val.toString().padStart(4,' ')
            );
            let valStr = ld.join(vals,' ').replace(zre,zch);
            console.log(lpad + '|' + valStr + ' |');
        }
        console.log(`${lpad}${'-'.repeat(bw)}\n`);
        console.log("Moves: [h] -> left | [j] -> down | [k] -> up | [l] -> right");
    }
    // for console (since adding new tile needs timing management in browser)
    runmv(dir) {
        if(this.busy) return false;
        this.busy = true;
        let ts = this.move_tiles(dir);
        if(ts.length > 1) {
            this.add_tile(1);
        }
        this.busy = false;
    }
}

// for running in the Node repl
var _2048 = function(W=4,H=4) {
    let tc = tile_column.make_col(W*H,false);
    const board = new tile_board(ld.chunk(tc.tiles,H));
    board.add_tile(1);
    board.print();
    process.stdin.setRawMode(true);
    process.stdin.on('keypress',function(letter,key) {
        var dir = '';
        switch(key.name) {
            case 'h':
                dir = 'left';
                break;
            case 'j':
                dir = 'down';
                break;
            case 'k':
                dir = 'up';
                break;
            case 'l':
                dir = 'right';
                break;
            default:
                break;
        }
        if(dir.length){
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
    exports.tile = tile;
    exports.tile_col = tile_column;
    exports._2048 = _2048;
}
// */

// make the following importable by other .js files that are NOT inside of the giant webpack blob
// note that exports can only be put @ the top level
// but can be imported by Node, browser, etc.
export {sample, tile_board, tile_column};
