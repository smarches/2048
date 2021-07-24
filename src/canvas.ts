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
// [x] excise all but necessary d3 dependencies
// [x] fancify background (random size/shading - doens't look great)
// [x] bug when switching colors and board size sliders have been changed (need one more abstraction for drawBackground)
// [ ] size board to fit vertical screen height
// [ ] size score box relative to board size
// [ ] coordinate sizes of things on board with total dimension (default 500 but can scale down)
// [ ] z-axis in D3? Want dots above background tiles but below numbered tiles

import {select as D3select} from "d3-selection";
import {themes} from './themes';
import { id, inputValueAsNumber, sleep} from './utils';
import {chunk} from './arrays';
import {tile_board, tile_column, Direction} from './tiles';
import {tboard} from "./tile_board";

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

const gameDim = () => Math.min(Math.max(200,window.innerHeight),500);

const getTheme = () => (id('theme1') as HTMLInputElement).checked ? themes['green/purple'] : themes['tan/maroon'];

const getSliderVals = () => [inputValueAsNumber("board_size_W"), inputValueAsNumber("board_size_H")];

function createSVGboard() {
    const board_dim = gameDim();
    return new tboard(board_dim, board_dim, getTheme());
}

let svg_board: tboard;  // the SVG elements
var game_board: tile_board; // tracks tiles' state and score
var [done, busy] = [true, true];

// testing plotting:
const rand_plot = function () {
    const [W, H] = getSliderVals();
    const tvals = Array(W*H).fill(0).map(_ => {
        let rv = Math.log2(Math.ceil(1. / Math.random()));
        return rv < 2 ? 0 : Math.floor(rv);
    });
    var tcol = tile_column.val_col(tvals);
    var tBoard = new tile_board(chunk(tcol.tiles, H));
    svg_board.drawTiles(tBoard);
}

const setup = function (): void {
    const [W, H] = getSliderVals();
    const ecol = tile_column.val_col(Array(W * H).fill(0));
    game_board = new tile_board(chunk(ecol.tiles, H));
    svg_board.drawBackground(W, H);
    svg_board.drawTiles(game_board);
    let ix = game_board.add_tile()[0];
    let new_tile = game_board.cols[ix[0]][ix[1]];
    svg_board.drawTile(new_tile, ix[0], ix[1]);
    svg_board.updateScore(0);
    busy = false; done = false;
}

async function process_keystroke(evt:KeyboardEvent): Promise<void> {
    if (busy || done) return;
    busy = true;
    const keymap = {
        'ArrowLeft':  Direction.Left,
        'ArrowRight': Direction.Right,
        'ArrowUp':    Direction.Up,
        'ArrowDown':  Direction.Down
    };
    let mv = [];
    const key = evt.key;
    if(keymap.hasOwnProperty(key)) {
        const dir = keymap[key];
        console.info(`Key ${key} was pressed, moving ${dir}.`);
        mv = game_board.move_tiles(dir);
    }
    if (game_board.danzo) {
        done = true;
        lose();
    }
    if (mv.length > 1) {
        svg_board.drawTiles(game_board);
        await sleep(200);
        let tloc = game_board.add_tile()[0]; // returns indices of added tiles
        svg_board.drawTile(game_board.cols[tloc[0]][tloc[1]], tloc[0], tloc[1]);
    }
    busy = false;
}

function lose(): void {
    svg_board.drawOverlay();
    svg_board.in_play = false;
}

document.addEventListener('keyup',process_keystroke);

window.addEventListener('load',setupRangeSliders);

window.addEventListener('load',function(){
    svg_board = createSVGboard();
    D3select("#board").style('min-height', `${gameDim() + 20}px`);
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
        if (!busy && svg_board.in_play) {
            busy = true;
            const [W, H] = getSliderVals();
            svg_board.setTheme(getTheme());
            svg_board.drawBackground(W, H);
            svg_board.drawTiles(game_board);
            busy = false;
        }
    }
});
