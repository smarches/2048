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

// tan -> maroon theme
const theme_1 = {
    'name': 'tan/maroon',
    'fills': ['#F3DD84', '#FFFFCC', '#FFF0A8', '#FEE186', '#FEC965', '#FDAA48', '#FD8D3C', '#FC5A2D', '#EC2E21', '#D30F20', '#B00026', '#800026'],
    'strokes': ['#5E3B07', '#BBBB54', '#C0AE36', '#C1A309', '#C19107', '#C07A01', '#C16404', '#C03D10', '#AF261E', '#A00A16', '#88001B', '#65001C'],
    'txt_col': ['#6F614C', '#7A7A05', '#7E7104', '#7E6901', '#7F5E01', '#7F4F00', '#814100', '#842500', '#7F0900', '#FF9295', '#FF8089', '#E67686'],
    'bg_fill': '#F3DD84',  // bg tiles
    'bg_line': '#5E3B07',
    'bg_text': '#6F614C',
    'new_fill': '#EEAF66', // new tiles
    'new_line': '#7C5416',
    'new_text': '#901F28',
    'body_bg': '#927736',  // <body> of page
    'box_bg': '#96a696',   // box containing board + score
    'score_bg': '#443322', // score box
    'score_text': '#ffebcd'
};

// green -> purple theme
const theme_2 = {
    'name': 'green/purple',
    'fills': ['#8d9e91', '#9FDA3A', '#71CF57', '#4AC16D', '#2DB27D', '#1FA187', '#21908C', '#277F8E', '#2E6E8E', '#365C8D', '#3F4889', '#46337E'],
    'strokes': ['#5d2489', '#71A015', '#4D9836', '#418C55', '#27835C', '#097763', '#006C68', '#095F6C', '#1C536D', '#2A4569', '#303767', '#362568'],
    'txt_col': ['#6F614C', '#486903', '#246600', '#145F2D', '#04583A', '#015041', '#034846', '#01414A', '#85B6D7', '#8DAADB', '#979DDB', '#9E91D3'],
    'bg_fill': '#8d9e91',
    'bg_line': '#5d2489',
    'bg_text': '#6F614C',
    'new_fill': '#B7ADDA',
    'new_line': '#7769A4',
    'new_text': '#448578',
    'body_bg': '#4E2D5C',
    'box_bg': '#1a4223',
    'score_bg': '#441757',
    'score_text': '#F7F9C7'
};


const ix_map = Array.apply(0, Array(11)).map((_, i) => Math.pow(2, i + 1));
const ix_rev = {};
ix_map.forEach((e, i) => ix_rev[e] = i + 1);

/* theme colors needed for drawing tile */
function theme_colors(theme, n) {
    let ix = ix_rev[n] || 0;
    return [theme.fills[ix], theme.strokes[ix], theme.txt_col[ix]];
}

get_theme = function () {
    return id('theme1').checked ? theme_2 : theme_1;
}

const [tile_board, tile_col] = [wpUtils.tile_board, wpUtils.tile_column];
// d3.select("body").style("background-color", '#927736');
// hmm, how to insert a first-child not a last-child? both insert and append do same thing here
// d3.select('body').insert('h1').text('hello there!');

function id(name) {
    return document.getElementById(name);
}

function rm_class(cls) {
    Array.from(document.getElementsByClassName(cls)).forEach(e => e.remove());
}

function setAttributes(element, attributes) {
    Object.keys(attributes).forEach(function (name) {
        element.setAttribute(name, attributes[name]);
    })
}

// fill in ticks - note that browsers don't currently support this (July 2019) but will someday!
const [min_board_size, max_board_size] = [2, 20];
for (let i = min_board_size; i <= max_board_size; i += 2) {
    ot = document.createElement('option');
    ot.value = String(i);
    if ([2, 4, 8, 12, 16, 20].includes(i)) ot.label = String(i);
    id('dticks').appendChild(ot);
}

function scale_rect(x, y, boundX, boundY) {
    if (x < y) boundX *= x / y;
    if (y < x) boundY *= y / x;
    x *= boundX / x;
    y *= boundY / y;
    return [x, y];
}

// input must be hexadecimal number
function brighten_color(c, amount = 0.5) {
    amount = Math.min(Math.max(amount, -1), 1);
    const pole = amount < 0 ? 0 : 255;
    amount = Math.abs(amount);
    let [r, g, b] = [c.slice(1, 3), c.slice(3, 5), c.slice(5)].map(
        function (e) {
            let v = Math.trunc(amount * pole + (1 - amount) * parseInt(e, 16));
            return (v < 16 ? '0' : '') + v.toString(16);
        }
    );
    return '#' + r + g + b;
}

function runif(n, a = 0, b = 1) {
    if (a > b) [a, b] = [b, a];
    if (a === b) return Array(n).fill(a);
    const diff = b - a;
    return Array(n).fill(0).map(e => diff * Math.random() + a);
}

function rexp(n, lambda) {
    if (isNaN(lambda) || lambda <= 0) throw `rexp: invalid lambda parameter (${lambda})`;
    if (isNaN(n) || n < 1) throw `rexp: invalid n parameter (${n})`;
    return Array.apply(0, Array(n)).map(e => -Math.log(Math.random()) / lambda);
}

// generate random X, Y, sizes, and opacities for bg deco
function bg_deco(W, H, n, scale) {
    rv = {
        'x': runif(n, 0.05 * W, 0.95 * W),
        'y': runif(n, 0.05 * H, 0.95 * H),
        'scale': runif(n, 0, scale * W),
        'alpha': runif(n, 0.02, 0.4),
        'rot': runif(n, 0, 360)
    };
    return rv;
}

// just import lodash?
function chunk(arr, n, fill_val = null) {
    n_res = Math.ceil(arr.length / n);
    res = [];
    for (let i = 0; i < n_res; i++) res.push([]);
    arr.map((a, i) => res[Math.floor(i / n)].push(a));
    let rem = arr.length % n;
    if (fill_val !== null && rem) {
        res[n_res - 1] = res[n_res - 1].concat(new Array(rem).fill(fill_val));
    }
    return res;
}

function age_tile(tid, cc) {
    d3.select(`#${tid}`).attr('class', 'fg_tile').attr('fill', cc[0]).attr('stroke', cc[1]);
    d3.select("#new_tile_num").attr('fill', cc[2]).attr('id', '');
    busy = false;
}

class tboard {
    constructor(width, height) {
        [this.bgW, this.bgH] = [width, height];
        const bb = Math.max(width, height);
        [this.scoreW, this.scoreH, this.sep] = [0.4 * bb, 0.17 * bb, 0.05 * bb];
        [this.canvasW, this.canvasH] = [this.bgW + 2 * this.sep, this.bgH + this.scoreH + 3 * this.sep];
        this.score = 0;
        this.dim = [4, 4]; // initialize correctly!
        this.in_play = false; // only 'true' once tiles drawn
    }
    get scoreXY() {
        let xy = [this.canvasW - this.sep - this.scoreW, this.sep];
        let wh = [this.scoreW, this.scoreH];
        return xy.concat(wh);
    }
    get boardXY() {
        return this.XYoffset;
    }
    update_score(val = null) {
        rm_class('score_font');
        const cth = get_theme();
        d3.select("#score_box").attr('fill', cth.score_bg);
        const cv = d3.select('#game_box');
        const [x0, y0, xW, yW] = this.scoreXY;
        const n = val === null ? this.score : val;
        const delta = Math.max(0, n - this.score);
        console.log(`old score = ${this.score} and delta = ${delta}`);
        let n_str = String(n).split('');
        n_str.map((e, i) => {
            cv.append('text').attr('x', 1.05 * x0 + 0.16 * xW * i).attr('y', y0 + 0.8 * yW).attr('class', 'score_font').attr('fill', cth.score_text).html(e);
        });
        const base_stroke = brighten_color(cth.score_bg, 0.2);
        if (delta > 0) { // pulse
            let temp_color = brighten_color(base_stroke, 1 - 2 / Math.sqrt(delta));
            d3.select("#score_box").transition().attr('stroke', temp_color).attr('stroke-width', "0.25rem").duration(333)
                .transition().attr('stroke', base_stroke).attr('stroke-width', '0.2rem').duration(1000);
        }
        this.score = val;
    }
    draw_bg(W, H) {
        const [boardW, boardH] = scale_rect(W, H, this.bgW, this.bgH).map(v => Math.round(v));
        const boffH = 2 * this.sep + this.scoreH + (this.bgH - boardH);
        const [gapV, gapH] = [boardW / W, boardH / H]; // 'latitudes' and 'longitudes'
        const c_theme = get_theme();
        d3.select("body").style("background-color", c_theme.body_bg);
        const [bg_stroke, bg_fill] = [c_theme.bg_line, c_theme.bg_fill]; // coordinate bg with tile colors
        d3.select("#board").html(''); // clear existing
        // basic outline
        var canvas = d3.select('#board').append('svg').attr('width', this.canvasW).attr('height', this.canvasH)
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
        this.tile_size = (this.bgW / Math.max(W, H)).toFixed(3);
        this.font_size = String(5 - Math.log2(Math.max(W, H)).toFixed(3)) + 'em'; // need to add pixel size scaling also
        this.board_dim = [boardW, boardH];
        this.in_play = true;
    }
    // drawing all tiles @ once
    draw_tiles(tile_arr) {
        if (this.dim[0] != tile_arr.w || this.dim[1] != tile_arr.h) {
            alert(`Wrong # of tiles! tile_arr has ${tile_arr.w} by ${tile_arr.h} and the_board is ${this.dim[0]} x ${this.dim[1]}`);
            return;
        };
        const [tw, tgap] = [this.tile_size, this.tile_size * 0.1];
        const [tadj, txy, trad, tdim] = [tw * 0.5 - tgap, this.boardXY, 0.125 * tw, (tw - 2 * tgap).toFixed(3)];
        const cv = d3.select('#game_box');
        const fs = this.font_size;
        let curr_theme = get_theme();
        ['tile_num', 'fg_tile', 'bg_tile', 'new_tile'].forEach(e => rm_class(e));
        tile_arr.cols.map(function (col, ix) {
            const xoff = ix * tw + txy[0] + tgap;
            col.forEach((elem, i) => {
                let [n, yoff, tile_id] = [elem.val, txy[1] + tw * i + tgap, `tile_${ix}_${i}`];
                let [tfill, tstroke, txtc] = theme_colors(curr_theme, n);
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
    draw_tile(tile, i, j) {
        const [tw, tgap, trad] = [this.tile_size, 0.1 * this.tile_size, 0.125 * this.tile_size];
        const tadj = tw * 0.5 - tgap;
        const [txy, tile_id] = [this.boardXY, `tile_${i}_${j}`]; // top left corner of board
        let curr_theme = get_theme();
        let [tfill, tstroke, txtc] = theme_colors(curr_theme, tile.val);
        id(tile_id).remove(); // keep unique (though text is left extra...)
        const [xoff, yoff] = [i * tw + txy[0] + tgap, j * tw + txy[1] + tgap];
        var cv = d3.select('#game_box');
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
        d3.select("#game_box").append('rect').attr('x', x0).attr('y', y0).attr('width', xw).attr('height', yw).attr('fill', col).attr('fill-opacity', 0.33);
    }
}

// default board
var board_dim = 500;
if (window.innerHeight < board_dim) {
    board_dim = Math.max(200, window.innerHeight);
}
const the_board = new tboard(board_dim, board_dim); // the SVG elements
d3.select("#board").style('min-height', String(board_dim + 20) + 'px');
var game_board; // tracks tiles' state and score
var [done, busy] = [true, false];

// controls/options for game (UI is exclusive to front-end)
// link with sliders
id('board_size_H').oninput = function () {
    id('height_slider').innerHTML = `Height (${this.value})`;
};
id('board_size_W').oninput = function () {
    id('width_slider').innerHTML = `Width (${this.value})`;
};
// need to trigger an event once so the range sliders are properly reset on page reload
var slidy_event = new Event('input', { 'bubbles': true, 'cancelable': true });
id('board_size_H').dispatchEvent(slidy_event);
id('board_size_W').dispatchEvent(slidy_event);
// likewise ensure default position of checkbox
id('theme1').checked = false;

id('theme1').onchange = function () {
    if (!busy && the_board.in_play) {
        busy = true;
        let [W, H] = [id("board_size_W").valueAsNumber, id("board_size_H").valueAsNumber];
        the_board.draw_bg(W, H);
        the_board.draw_tiles(game_board);
        busy = false;
    }
}

// testing plotting:
rand_plot = function () {
    let [W, H] = [id("board_size_W").valueAsNumber, id("board_size_H").valueAsNumber];
    //var tvals = [0,2,4,512, 0,-1,4,8, 0,0,2,2, 4,16,32,64];
    let tvals = Array.apply(0, Array(W * H)).map(_ => {
        rv = Math.log2(Math.ceil(1. / Math.random()));
        return rv < 2 ? 0 : Math.floor(rv);
    });
    var tcol = tile_col.val_col(tvals);
    var tboard = new tile_board(chunk(tcol.tiles, H));
    draw_tiles(tboard);
}

setup = function () {
    let [W, H] = [id("board_size_W").valueAsNumber, id("board_size_H").valueAsNumber];
    let ecol = tile_col.val_col(Array(W * H).fill(0));
    game_board = new tile_board(chunk(ecol.tiles, H));
    the_board.draw_bg(W, H);
    the_board.draw_tiles(game_board);
    let ix = game_board.add_tile()[0];
    let new_tile = game_board.cols[ix[0]][ix[1]];
    the_board.draw_tile(new_tile, ix[0], ix[1]);
    busy = false; done = false;
}

id('start_game').onclick = function () { setup() };

// consider what setTimeout actually does?
// it takes a callback func and a time after which to call it
// similarly the Promise() constructor takes a function w/ two args,
// resolve and reject. So one way to write the callback function is
// function(resolve,reject){/* call resolve and/or reject @ some point */}
// or use .then(): afunc().then(resolveFunc,rejectFunc), where `afunc` returns a Promise object.
// though in the latter case it's less obvious where the await keyword comes in.
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function lose() {
    // alert("You lost!");
    the_board.draw_overlay();
    the_board.in_play = false;
}

document.onkeydown = async function (e) {
    if (busy || done) return;
    busy = true;
    var dir = null;
    switch (e.keyCode) {
        case 37:
            dir = 'left';
            break;
        case 38:
            dir = 'up';
            break;
        case 39:
            dir = 'right';
            break;
        case 40:
            dir = 'down';
            break;
        default:
            break;
    }
    mv = dir !== null ? game_board.move_tiles(dir) : [];
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
}