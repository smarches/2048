// having built the webpack code as a library, we can import from it
// into this script which is not part of webpack
// this makes developing a LOT easier with stuff like d3 where we don't want to rerun `npm run build` after
// each and every tiny change to the UI
// how does this work? If the 'library' field of output is set in webpack.config.js (and the libraryTarget is 'var'),
// then there will be a variable in the global namespace that contains all the exports from the source .js file.
// in this case, that variable is called 'wpUtils'
// one use is as a sort of indirect module importing (see loading of d3 just below),
// although this is probably not ideal. 

// TODO:
// [x] tile appearance should scale with board layout (cannot have abs. rx/ry/font-size)
// [x] material switch and second color theme
// [ ] lettering of score box
// [x] score change 'animation' w/ css3 transition or d3 transition
// [x] add theme colors to score box
// [x] button to coordinate sizing (start game)
// [x] keypress
// [ ] sounds (consult https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API) and see https://github.com/goldfire/howler.js/
// [x] animation delay
// [ ] end of game/reset
// [x] reset everything on window reload
// [x] disable adding new tile when nothing changes
// [x] new tile animation with css transitions (doesn't work since classes are not enumerated manually)
// [x] coordinate color of numbers with tile bg color
// [ ] excise all but necessary d3 dependencies
// [x] fancify background (random size/shading - doens't look great)
// [x] bug when switching colors and board size sliders have been changed (need one more abstraction for draw_bg)
// [ ] size board to fit vertical screen height
// [ ] size score box relative to board size
// [ ] coordinate sizes of things on board with total dimension (default 500 but can scale down)
// [ ] z-axis in D3? Want dots above background tiles but below numbered tiles

import {select as D3select} from "d3-selection";

import {theme_colors, themes} from './themes.js';
import {brighten_color, id, inputValueAsNumber, rm_class, scale_rect, sleep} from './utils';
import {runif} from './random';
import {chunk} from './arrays';
import {tile_board, tile_column, tile} from './tiles';

const get_theme = () => (id('theme1') as HTMLInputElement).checked ? themes['green/purple'] : themes['tan/maroon'];

// fill in ticks - note that browsers don't currently support this (July 2019) (still not supported July 2021!) but will someday!
function setupRangeSliders(): void {
    const [min_board_size, max_board_size] = [2, 20];
    for (let i = min_board_size; i <= max_board_size; i += 2) {
        const opt = document.createElement('option');
        const dlist = id('dticks');
        opt.value = String(i);
        if ([2, 4, 8, 12, 16, 20].includes(i)) opt.label = String(i);
        dlist.appendChild(opt);
    }
}

// one-off interface to satisfy the compiler
interface bg_decorator {
    x: Array<number>;
    y: Array<number>;
    scale: Array<number>;
    alpha?: Array<number>;
    rot?:Array<number>;
}

// generate random X, Y, sizes, and opacities for bg deco
function bg_deco(W:number, H:number, n:number, scale:number): bg_decorator {
    const rv = {
        'x': runif(n, 0.05 * W, 0.95 * W),
        'y': runif(n, 0.05 * H, 0.95 * H),
        'scale': runif(n, 0, scale * W),
        'alpha': runif(n, 0.02, 0.4),
        'rot': runif(n, 0, 360)
    };
    return rv;
}

function age_tile(tile_id: string, cc: Array<string>) {
    const tile = id(tile_id);
    tile.classList.add('fg_tile');
    tile.setAttribute('fill',cc[0]);
    tile.setAttribute('stroke',cc[1]);
    D3select("#new_tile_num").attr('fill', cc[2]).attr('id', '');
    busy = false;
}

class tboard {
    bgW: number;
    bgH: number;
    scoreW: number;
    scoreH: number;
    canvasW:number;
    canvasH:number;
    score: number;
    sep:number;
    dim: Array<number>;
    in_play: Boolean;
    XYoffset: Array<number>;
    tile_size:number;
    font_size:string;
    board_dim:Array<number>;

    constructor(width: number, height: number) {
        [this.bgW, this.bgH] = [width, height];
        const bb = Math.max(width, height);
        [this.scoreW, this.scoreH, this.sep] = [0.4 * bb, 0.17 * bb, 0.05 * bb];
        [this.canvasW, this.canvasH] = [this.bgW + 2 * this.sep, this.bgH + this.scoreH + 3 * this.sep];
        this.score = 0;
        this.dim = [4, 4]; // initialize correctly!
        this.in_play = false; // only 'true' once tiles drawn
    }
    get scoreXY(): Array<number> {
        let xy = [this.canvasW - this.sep - this.scoreW, this.sep];
        let wh = [this.scoreW, this.scoreH];
        return xy.concat(wh);
    }
    get boardXY(): Array<number> {
        return this.XYoffset;
    }
    update_score(val = null) {
        rm_class('score_font');
        const cth = get_theme();
        const box = id("score_box");
        box.setAttribute('fill', cth.score_bg);
        const [x0, y0, xW, yW] = this.scoreXY;
        const n = val || this.score;
        const delta = Math.max(0, n - this.score);
        // console.info(`old score = ${this.score} and delta = ${delta}`);
        const cv = D3select('#game_box');
        let n_str = String(n).split('');
        n_str.map((e, i) => {
            cv.append('text').attr('x', 1.05 * x0 + 0.16 * xW * i).attr('y', y0 + 0.8 * yW).attr('class', 'score_font').attr('fill', cth.score_text).html(e);
        });
        const base_stroke = brighten_color(cth.score_bg, 0.2);
        if (delta > 0) { // pulse
            let temp_color = brighten_color(base_stroke, 1 - 2 / Math.sqrt(delta));
            D3select("#score_box").transition().attr('stroke', temp_color).attr('stroke-width', "0.25rem").duration(333)
                .transition().attr('stroke', base_stroke).attr('stroke-width', '0.2rem').duration(1000);
        }
        this.score = val;
    }
    draw_bg(W:number, H:number): void {
        const [boardW, boardH] = scale_rect(W, H, this.bgW, this.bgH).map(v => Math.round(v));
        const boffH = 2 * this.sep + this.scoreH + (this.bgH - boardH);
        const [gapV, gapH] = [boardW / W, boardH / H]; // 'latitudes' and 'longitudes'
        const c_theme = get_theme();
        D3select("body").style("background-color", c_theme.body_bg);
        const [bg_stroke, bg_fill] = [c_theme.bg_line, c_theme.bg_fill]; // coordinate bg with tile colors
        D3select("#board").html(''); // clear existing
        // basic outline
        var canvas = D3select('#board').append('svg').attr('width', this.canvasW).attr('height', this.canvasH)
            .attr('class', 'gamebox').attr('id', 'game_box').style('background-color', c_theme.box_bg);
        const [x0, y0, xW, yW] = this.scoreXY;
        canvas.append('rect').attr('x', x0).attr('y', y0)
            .attr('width', xW).attr('height', yW).attr("id", 'score_box').attr('rx', 5).attr('ry', 5);
        this.update_score(this.score);
        // the board itself
        canvas.append('rect').attr('x', this.sep).attr('y', boffH).attr('width', boardW).attr('height', boardH)
            .attr('class', 'tile_bg').attr('fill', bg_fill).attr('stroke', bg_stroke);

        // decorating background
        const n_deco = 75;
        let decs = bg_deco(boardW, boardH, n_deco, 0.01);
        let rU = runif(n_deco, 0.25, 4);
        for (let k = 0; k < n_deco; k++) {
            let [xc, yc, rx, ry] = [this.sep + decs.x[k], boffH + decs.y[k], rU[k] * decs.scale[k], decs.scale[k]]
                .map(e => Math.round(100 * e) / 100);
            canvas.append('ellipse').attr('cx', xc).attr('cy', yc)
                .attr('rx', rx).attr('ry', ry)
                .attr('fill', '#333322').attr('opacity', decs.alpha[k])
                .attr('transform', `rotate(${decs.rot[k]},${xc},${yc})`);
        }
        for (let i = 1; i < W; i++) { // longitudes
            const xx = (this.sep + i * gapH).toFixed(3);
            canvas.append('line').attr('x1', xx).attr('y1', boffH).attr('x2', xx).attr('y2', boffH + boardH)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
        for (let j = 1; j < H; j++) { // latitudes
            const yy = (boffH + j * gapV).toFixed(3);
            canvas.append('line').attr('x1', this.sep).attr('y1', yy).attr('x2', this.sep + boardW).attr('y2', yy)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
        this.dim = [W, H];
        this.XYoffset = [this.sep, boffH];
        this.tile_size = (this.bgW / Math.max(W, H));
        const fontAdj = (5 - Math.log2(Math.max(W, H))).toFixed(3);
        this.font_size = fontAdj + 'rem'; // need to add pixel size scaling also
        this.board_dim = [boardW, boardH];
        this.in_play = true;
    }
    // drawing all tiles @ once
    draw_tiles(tile_arr:tile_board): void {
        if (this.dim[0] != tile_arr.w || this.dim[1] != tile_arr.h) {
            alert(`Wrong # of tiles! tile_arr has ${tile_arr.w} by ${tile_arr.h} and the_board is ${this.dim[0]} x ${this.dim[1]}`);
            return;
        };
        const [tw, tgap] = [this.tile_size, this.tile_size * 0.1];
        const [tadj, txy, trad, tdim] = [tw * 0.5 - tgap, this.boardXY, 0.125 * tw, (tw - 2 * tgap).toFixed(3)];
        const cv = D3select('#game_box');
        const fs = this.font_size;
        let curr_theme = get_theme();
        ['tile_num', 'fg_tile', 'bg_tile', 'new_tile'].forEach(e => rm_class(e));
        tile_arr.cols.map(function (col, ix) {
            const xoff = ix * tw + txy[0] + tgap;
            col.tiles.forEach((elem, i) => {
                let [n, yoff, tile_id] = [elem.val, txy[1] + tw * i + tgap, `tile_${ix}_${i}`];
                let [tfill, tstroke, txtc] = theme_colors(curr_theme.name, n);
                cv.append('rect').attr('x', xoff).attr('y', yoff).attr('width', tdim).attr('height', tdim).attr('id', tile_id)
                    .attr('rx', trad).attr('ry', trad).attr('fill', tfill).attr('stroke', tstroke).attr('class', n > 0 ? 'fg_tile' : 'bg_tile');
                if (n > 0) {
                    cv.append('text').attr('x', xoff + tadj).attr('y', yoff + tadj).html(String(n)).attr('class', 'tile_num').attr('fill', txtc).attr('font-size', fs);
                }
            });
        });
        this.update_score(tile_arr.score);
    }
    // when one tile is added after each turn, there's no need to re-draw the entire board
    draw_tile(tile:tile, i:number, j:number) {
        const [tw, tgap, trad] = [this.tile_size, 0.1 * this.tile_size, 0.125 * this.tile_size];
        const tadj = tw * 0.5 - tgap;
        const [txy, tile_id] = [this.boardXY, `tile_${i}_${j}`]; // top left corner of board
        let curr_theme = get_theme();
        let [tfill, tstroke, txtc] = theme_colors(curr_theme.name, tile.val);
        id(tile_id).remove(); // keep unique (though text is left extra...)
        const [xoff, yoff] = [i * tw + txy[0] + tgap, j * tw + txy[1] + tgap];
        var cv = D3select('#game_box');
        cv.append('rect').attr('x', xoff).attr('y', yoff).attr('id', tile_id)
            .attr('width', tw - 2 * tgap).attr('height', tw - 2 * tgap)
            .attr('rx', trad).attr('ry', trad).attr('class', 'new_tile').attr('fill', curr_theme.new_fill).attr('stroke', curr_theme.new_line);
        cv.append('text').attr('x', xoff + tadj).attr('y', yoff + tadj).html(String(tile.val)).attr('class', 'tile_num')
            .attr('fill', curr_theme.new_text).attr('font-size', this.font_size).attr('id', 'new_tile_num');
        window.setTimeout(age_tile, 250, `tile_${i}_${j}`, [tfill, tstroke, txtc]);
    }
    // upon losing 'grey out' the board
    draw_overlay(col = "#dadada") {
        let [x0, y0] = this.boardXY;
        let [xw, yw] = this.board_dim;
        D3select("#game_box").append('rect').attr('x', x0).attr('y', y0).attr('width', xw).attr('height', yw).attr('fill', col).attr('fill-opacity', 0.33);
    }
}

// default board (set up a window.onresize event callback?)
const board_dim = Math.min(Math.max(200,window.innerHeight),500);

const the_board = new tboard(board_dim, board_dim); // the SVG elements
var game_board; // tracks tiles' state and score
var [done, busy] = [true, false];

// testing plotting:
const rand_plot = function () {
    const [W, H] = [inputValueAsNumber("board_size_W"), inputValueAsNumber("board_size_H")];
    //var tvals = [0,2,4,512, 0,-1,4,8, 0,0,2,2, 4,16,32,64];
    let tvals = Array.apply(0, Array(W * H)).map(_ => {
        let rv = Math.log2(Math.ceil(1. / Math.random()));
        return rv < 2 ? 0 : Math.floor(rv);
    });
    var tcol = tile_column.val_col(tvals);
    var tBoard = new tile_board(chunk(tcol.tiles, H));
    the_board.draw_tiles(tBoard);
}

const setup = function (): void {
    const [W, H] = [inputValueAsNumber("board_size_W"), inputValueAsNumber("board_size_H")];
    const ecol = tile_column.val_col(Array(W * H).fill(0));
    game_board = new tile_board(chunk(ecol.tiles, H));
    the_board.draw_bg(W, H);
    the_board.draw_tiles(game_board);
    let ix = game_board.add_tile()[0];
    let new_tile = game_board.cols[ix[0]][ix[1]];
    the_board.draw_tile(new_tile, ix[0], ix[1]);
    busy = false; done = false;
}

function lose(): void {
    the_board.draw_overlay();
    the_board.in_play = false;
}

document.addEventListener(
    'keyup', 
    async function (e) {
        if (busy || done) return;
        busy = true;
        const keymap = {'ArrowLeft': 'left','ArrowRight':'right','ArrowUp':'up','ArrowDown':'down'};
        const dir = keymap[e.key];
        const mv = dir ? game_board.move_tiles(dir) : [];
        if (game_board.danzo) {
            done = true;
            lose();
        }
        if (mv.length > 1) {
            the_board.draw_tiles(game_board);
            await sleep(200);
            let tloc = game_board.add_tile()[0]; // returns indices of added tiles
            the_board.draw_tile(game_board.cols[tloc[0]][tloc[1]], tloc[0], tloc[1]);
        } else {
            busy = false;
        }
    });

window.addEventListener('load',setupRangeSliders);

window.addEventListener('load',function(){
    D3select("#board").style('min-height', `${board_dim + 20}px`);
    // controls/options for game (UI is exclusive to front-end)
    id('start_game').addEventListener('click',setup);
    // link with sliders
    id('board_size_H').addEventListener('input', function (){
        const val = (this as HTMLInputElement).value;
        id('height_slider').innerHTML = `Height (${val})`;
    });
    id('board_size_W').addEventListener('input', function () {
        const val = (this as HTMLInputElement).value;
        id('width_slider').innerHTML = `Width (${val})`;
    });
    // need to trigger an event once so the range sliders are properly reset on page reload
    const slidy_event = new Event('input', { 'bubbles': true, 'cancelable': true });
    id('board_size_H').dispatchEvent(slidy_event);
    id('board_size_W').dispatchEvent(slidy_event);
    // likewise ensure default position of checkbox
    (id('theme1') as HTMLInputElement).checked = false;

    id('theme1').onchange = function () {
        if (!busy && the_board.in_play) {
            busy = true;
            let [W, H] = [inputValueAsNumber("board_size_W"), inputValueAsNumber("board_size_H")];
            the_board.draw_bg(W, H);
            the_board.draw_tiles(game_board);
            busy = false;
        }
    }
});