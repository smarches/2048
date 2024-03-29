import { flattenDepth } from 'lodash';
import { rotate_array } from "./arrays";
import { sample } from "./random";

const enum Direction {
    Down,
    Left,
    Right,
    Up
};

function powersOfTwoMap(n: number): Map<number, number> {
    // set up map from powers of two to (1-based) indices, (2,1), (4,2), (8,3), etc.
    // this is used to map tile values to theme colors
    const ix_map = [...Array(n).keys()].map(e => Math.pow(2, e + 1));
    const ix_rev = new Map();
    ix_map.forEach((e, i) => ix_rev.set(e, i + 1));
    return ix_rev;
}

class Tile {
    _val: number;
    ix_rev: Map<number, number>;
    constructor(n: number) {
        this.ix_rev = powersOfTwoMap(11);
        this.update(n);
    }
    get val() { return this._val; }
    update(n: number): void {
        let ix = this.ix_rev.get(n) || 0;
        this._val = ix === 0 ? 0 : n;
    }
}

interface tile_status {
    'tiles': Array<Tile>,
    'changed': boolean,
    'score': number
}

class tile_column {
    tiles: Array<Tile>;
    _len: number;
    has_merged: Array<boolean>;
    constructor(tile_array: Array<Tile>) {
        this.tiles = tile_array;
        this._len = tile_array.length;
        this.has_merged = Array(this._len).fill(false);
    }
    get len() { return this._len; }

    swap_tile(i: number, j: number): void {
        if (i >= this._len || j >= this._len || i < 0 || j < 0) return;
        [this.tiles[j], this.tiles[i]] = [this.tiles[i], this.tiles[j]];
    }
    // perform one round of moving tiles. Don't want to do all @ once for animation purposes (though that is more efficient to calculate)
    fall(): boolean {
        let any_move = false;
        for (var i = this.len - 1; i > 0; i--) {
            if (!this.tiles[i].val && this.tiles[i - 1].val) {
                this.swap_tile(i, i - 1);
                any_move = true;
            }
        }
        return any_move;
    }
    merge(): number { // note this is 'rightfold' operation not 'leftfold'
        let score = 0;
        for (var i = this.len - 1; i > 0; i--) {
            let v = this.tiles[i].val;
            let anymerge = this.has_merged[i] || this.has_merged[i - 1];
            if (!anymerge && v > 0 && this.tiles[i - 1].val === v) {
                this.tiles[i].update(v + v);
                this.has_merged[i] = true; // mark to prevent recursive merging this round
                this.tiles[i - 1].update(0);
                score += v + v;
            }
        }
        return score;
    }
    // single iteration of compacting, along with a flag to indicate finished or not
    compact1(): tile_status {
        let [b1, b2] = [this.fall(), this.merge()];
        return { tiles: this.tiles, changed: b1 || b2 > 0, score: b2 };
    }
    // whole process of moving column of tiles, so merge markers are reset
    compact(): number {
        let [score, done] = [0, false];
        while (!done) {
            let [a, b] = [this.fall(), this.merge()];
            score += b;
            done = a || (b > 0);
        }
        this.has_merged = Array(this._len).fill(false);
        return score;
    }
    static make_col(n: number, randomize: boolean = true): tile_column {
        n = Math.floor(n);
        if (!Boolean(n)) {
            return null;
        }
        const res = [];
        for (let i = 0; i < n; i++) {
            let ix = randomize ? 10 - Math.floor(Math.log2(Math.ceil(2048 * Math.random()))) : 0;
            res.push(new Tile(ix));
        }
        return new tile_column(res);
    }
    static val_col(vv: Array<number>): tile_column {
        return new tile_column(vv.map(v => new Tile(v)));
    }
}

class tile_board {
    cols: Array<Array<Tile>>;
    W: number;
    H: number;
    score: number;
    busy: boolean;
    end_state: Object;
    constructor(tile_arr: Array<Array<Tile>>) {
        this.cols = tile_arr;
        this.W = tile_arr.length;
        this.H = tile_arr[0].length;
        this.score = 0;
        this.busy = false;
        this.end_state = { left: false, right: false, up: false, down: false };
    }
    get w() { return this.W; }
    get h() { return this.H; }
    get vals() {
        return flattenDepth(this.cols, 1).map(e => e.val);
    }
    get no_move() { // all done?
        return Object.entries(this.end_state).reduce((a, b) => a && b[1], true);
    }
    // inner loop of a given move is rotate -> move/update -> unrotate -> paint screen
    // while any moves are valid
    move_tiles(dir: Direction) {
        // enum values are: down -> 0, left -> 1, right -> 2, up -> 3
        let rot_turns = dir === Direction.Left ? 1 : (dir === Direction.Right ? 3 : (dir === Direction.Up ? 2 : 0));
        let un_rot = 4 - rot_turns;
        let tcols = rotate_array(this.cols, rot_turns);
        // build up the sequence of arrangements that resulted from initiating movement in the given direction
        let [move_array, done] = [[tcols], false];
        // init tile_column once here to manage 'merged' tags
        let tcs = tcols.map(a => new tile_column(a.slice()));
        const n_cols = tcs.length;
        while (!done) {
            let n_done = 0;
            for (let j = 0; j < tcols.length; j++) {
                let tc = tcs[j].compact1();
                tcols[j] = tc.tiles;
                n_done += 1 - Number(tc.changed);
                this.score += tc.score;
            }
            done = n_done === n_cols;
            if (!done) move_array.push(tcols);
        }
        this.cols = rotate_array(tcols, un_rot);
        if (move_array.length <= 1) {
            this.end_state[dir] = true;
        } else {
            this.end_state = { left: false, right: false, up: false, down: false };
        }
        return move_array;
    }
    // enumerate empty space and randomly select n for filling
    add_tile(n = 1) {
        const opens = flattenDepth(this.cols, 1)
            .map((elem, i) => elem.val === 0 ? i : null)
            .filter(e => e != null);
        n = Math.min(n, opens.length);
        if (n <= 0) return [];
        let add_ix = sample<number>(opens, n, false);
        let res = [];
        for (let j = 0; j < add_ix.length; j++) {
            let [col, row] = [Math.floor(add_ix[j] / this.H), add_ix[j] % this.H];
            let z = Math.random();
            let tval = z > 0.9 ? (z > 0.98 ? 8 : 4) : 2;
            this.cols[col][row] = new Tile(tval);
            res.push([col, row]);
        }
        return res;
    }
    // node only
    print(): void {
        const [bw, zch, zre, lpad] = [5 * this.W + 2, '.', /0/g, '   '];
        console.log(('Score: ' + this.score.toString().padStart(6)).padStart(bw + lpad.length));
        console.log(`\n${lpad}${'-'.repeat(bw)}`);
        for (let j = 0; j < this.H; j++) {
            const vals = this.cols.map(
                a => a[j].val.toString().padStart(4, ' ')
            );
            let valStr = vals.join(' ').replace(zre, zch);
            console.log(`${lpad}|${valStr} |`);
        }
        console.log(`${lpad}${'-'.repeat(bw)}\n`);
        console.log("Moves: [h] -> left | [j] -> down | [k] -> up | [l] -> right");
    }
    // for console (since adding new Tile needs timing management in browser)
    runmv(dir: Direction) {
        if (this.busy) return false;
        this.busy = true;
        let ts = this.move_tiles(dir);
        if (ts.length > 1) {
            this.add_tile(1);
        }
        this.busy = false;
    }
}


export { Direction, Tile, tile_column, tile_board, powersOfTwoMap };
