import { select as D3select } from "d3-selection";
import { transition } from "d3-transition";

import { brighten_color, id, rm_class, scale_rect } from './utils';
import { runif } from './random';
import { BoardTheme } from './themes';
import { tile_board, Tile } from './tiles';

// one-off interface to satisfy the compiler
interface bg_decorator {
    x: Array<number>;
    y: Array<number>;
    scale: Array<number>;
    alpha?: Array<number>;
    rot?: Array<number>;
}

function bg_deco(W: number, H: number, n: number, scale: number): bg_decorator {
    /**
     * generate random X/Y coords, sizes, and opacities for bg decoration
     * 
     * @param W - width of background
     * @param H - height of background
     * @param n - number of 'decorations' to generate
     * @param scale - value relative to width representing upper bound of decoration sizes
     * 
     * @returns a bg_decorator (object with x/y coords and scales)
     */
    const rv = {
        'x': runif(n, 0.05 * W, 0.95 * W),
        'y': runif(n, 0.05 * H, 0.95 * H),
        'scale': runif(n, 0, scale * W),
        'alpha': runif(n, 0.02, 0.4),
        'rot': runif(n, 0, 360)
    };
    return rv;
}

/* theme colors needed for drawing a Tile */
function theme_colors(theme: BoardTheme, n: number): Array<string> {
    return [theme.fills[n], theme.strokes[n], theme.text_color[n]];
}

function age_tile(tile_id: string, cc: Array<string>) {
    const tile = id(tile_id);
    tile.classList.add('fg_tile');
    tile.setAttribute('fill', cc[0]);
    tile.setAttribute('stroke', cc[1]);
    D3select("#new_tile_num").attr('fill', cc[2]).attr('id', '');
}

class tboard {
    bgW: number;
    bgH: number;
    scoreW: number;
    scoreH: number;
    canvasW: number;
    canvasH: number;
    score: number;
    sep: number;
    dim: Array<number>;
    in_play: Boolean;
    XYoffset: Array<number>;
    tile_size: number;
    font_size: string;
    board_dim: Array<number>;
    theme: BoardTheme;
    ix_map: Map<number, number>;
    busy: boolean;

    constructor(width: number, height: number, theme: BoardTheme) {
        [this.bgW, this.bgH] = [width, height];
        const bb = Math.max(width, height);
        [this.scoreW, this.scoreH, this.sep] = [0.4 * width, 0.17 * height, 0.05 * bb];
        [this.canvasW, this.canvasH] = [this.bgW + 2 * this.sep, this.bgH + this.scoreH + 3 * this.sep];
        this.score = 0;
        this.dim = [4, 4]; // initialize correctly!
        this.in_play = false; // only 'true' once tiles drawn
        this.theme = theme;
        const ix_rev = new Map();
        const ix_map = [...Array(11).keys()].map(e => Math.pow(2, e + 1));
        ix_map.forEach((e, i) => ix_rev.set(e, i + 1));
        this.ix_map = ix_rev;
        this.in_play = false;

    }
    setTheme(theme: BoardTheme) {
        this.theme = theme;
    }
    get scoreXY(): Array<number> {
        let xy = [this.canvasW - this.sep - this.scoreW, this.sep];
        let wh = [this.scoreW, this.scoreH];
        return xy.concat(wh);
    }
    get boardXY(): Array<number> {
        return this.XYoffset;
    }
    updateScore(val = null) {
        rm_class('score_font');
        const box = id("score_box");
        box.setAttribute('fill', this.theme.score_bg);
        const [x0, y0, xW, yW] = this.scoreXY;
        const n = val || this.score;
        const delta = Math.max(0, n - this.score);
        // console.info(`old score = ${this.score} and delta = ${delta}`);
        const cv = D3select('#game_box');
        let digits = String(n).split('');
        digits.forEach((e, i) => {
            cv.append('text')
                .attr('x', 1.05 * x0 + 0.16 * xW * i)
                .attr('y', y0 + 0.8 * yW)
                .attr('class', 'score_font')
                .attr('fill', this.theme.score_text)
                .html(e);
        });
        const base_stroke = brighten_color(this.theme.score_bg, 0.2);
        if (delta > 0) { // pulse
            const temp_color = brighten_color(base_stroke, 1 - 2 / Math.sqrt(delta));
            const t1 = transition().duration(333);
            const t2 = transition().duration(1000);
            D3select("#score_box").transition(t1).attr('stroke', temp_color)
                .attr('stroke-width', "0.25rem").transition(t2)
                .attr('stroke', base_stroke).attr('stroke-width', '0.2rem');
        }
        this.score = val;
    }
    drawBackground(W: number, H: number): void {
        const [boardW, boardH] = scale_rect(W, H, this.bgW, this.bgH).map(v => Math.round(v));
        const boffH = 2 * this.sep + this.scoreH + 0.5 * (this.bgH - boardH);
        const boffW = 0.5 * (this.canvasW - boardW);
        const [gapV, gapH] = [boardW / W, boardH / H]; // 'latitudes' and 'longitudes'
        D3select("body").style("background-color", this.theme.body_bg);
        D3select("#board").html(''); // clear existing
        // basic outline
        const canvas = D3select('#board').append('svg')
            .attr('width', this.canvasW).attr('height', this.canvasH)
            .attr('class', 'gamebox').attr('id', 'game_box')
            .style('background-color', this.theme.box_bg);
        // score box
        const [x0, y0, xW, yW] = this.scoreXY;
        canvas.append('rect').attr('x', x0).attr('y', y0)
            .attr('width', xW).attr('height', yW)
            .attr("id", 'score_box').attr('rx', 5).attr('ry', 5);
        this.updateScore(this.score);
        // the board itself
        const bg_stroke = this.theme.bg_line; // coordinate bg with tile colors
        canvas.append('rect').attr('x', boffW).attr('y', boffH)
            .attr('width', boardW).attr('height', boardH)
            .attr('class', 'tile_bg').attr('fill', this.theme.bg_fill).attr('stroke', bg_stroke);

        // decorating background
        const n_deco = 75;
        let decs = bg_deco(boardW, boardH, n_deco, 0.01);
        let rU = runif(n_deco, 0.25, 4);
        for (let k = 0; k < n_deco; k++) {
            let [xc, yc, rx, ry] = [boffW + decs.x[k], boffH + decs.y[k], rU[k] * decs.scale[k], decs.scale[k]]
                .map(e => Math.round(100 * e) / 100);
            canvas.append('ellipse').attr('cx', xc).attr('cy', yc)
                .attr('rx', rx).attr('ry', ry)
                .attr('fill', '#333322').attr('opacity', decs.alpha[k])
                .attr('transform', `rotate(${decs.rot[k]},${xc},${yc})`);
        }
        for (let i = 1; i < W; i++) { // longitudes
            const xx = (boffW + i * gapH).toFixed(3);
            canvas.append('line').attr('x1', xx).attr('y1', boffH).attr('x2', xx).attr('y2', boffH + boardH)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
        for (let j = 1; j < H; j++) { // latitudes
            const yy = (boffH + j * gapV).toFixed(3);
            canvas.append('line').attr('x1', boffW).attr('y1', yy).attr('x2', boffW + boardW).attr('y2', yy)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
        this.dim = [W, H];
        this.XYoffset = [boffW, boffH];
        this.tile_size = (this.bgW / Math.max(W, H));
        const fontAdj = (5 - Math.log2(Math.max(W, H))).toFixed(3);
        this.font_size = fontAdj + 'rem'; // need to add pixel size scaling also
        this.board_dim = [boardW, boardH];
        this.in_play = true;
    }
    // drawing all tiles @ once
    drawTiles(tile_arr: tile_board): void {
        if (this.dim[0] != tile_arr.w || this.dim[1] != tile_arr.h) {
            console.error(`Wrong # of tiles! tile_arr has ${tile_arr.w} by ${tile_arr.h} and the_board is ${this.dim[0]} x ${this.dim[1]}`);
            return;
        };
        const [tw, tgap] = [this.tile_size, this.tile_size * 0.1];
        const [tadj, txy, trad, tdim] = [tw * 0.5 - tgap, this.boardXY, 0.125 * tw, (tw - 2 * tgap).toFixed(3)];
        ['tile_num', 'fg_tile', 'bg_tile', 'new_tile'].forEach(e => rm_class(e));
        const cv = D3select('#game_box');
        tile_arr.cols.map((col, ix) => {
            const xoff = ix * tw + txy[0] + tgap;
            col.forEach((elem, i) => {
                let [n, yoff, tile_id] = [elem.val, txy[1] + tw * i + tgap, `tile_${ix}_${i}`];
                const ixd = this.ix_map.get(n) || 0;
                let [tfill, tstroke, txtc] = theme_colors(this.theme, ixd);
                cv.append('rect').attr('x', xoff).attr('y', yoff)
                    .attr('width', tdim).attr('height', tdim)
                    .attr('id', tile_id)
                    .attr('rx', trad).attr('ry', trad)
                    .attr('fill', tfill).attr('stroke', tstroke)
                    .attr('class', n > 0 ? 'fg_tile' : 'bg_tile');
                if (n > 0) {
                    cv.append('text').attr('x', xoff + tadj)
                        .attr('y', yoff + tadj).html(String(n)).attr('class', 'tile_num')
                        .attr('fill', txtc).attr('font-size', this.font_size);
                }
            });
        });
        this.updateScore(tile_arr.score);
    }
    // when one tile is added after each turn, there's no need to re-draw the entire board
    drawTile(tile: Tile, i: number, j: number) {
        const [tw, tgap, trad] = [this.tile_size, 0.1 * this.tile_size, 0.125 * this.tile_size];
        const tadj = tw * 0.5 - tgap;
        const [txy, tile_id] = [this.boardXY, `tile_${i}_${j}`]; // top left corner of board
        id(tile_id).remove(); // keep unique (though text is left extra...)
        const [xoff, yoff] = [i * tw + txy[0] + tgap, j * tw + txy[1] + tgap];
        var cv = D3select('#game_box');
        cv.append('rect').attr('x', xoff).attr('y', yoff).attr('id', tile_id)
            .attr('width', tw - 2 * tgap).attr('height', tw - 2 * tgap)
            .attr('rx', trad).attr('ry', trad).attr('class', 'new_tile')
            .attr('fill', this.theme.new_fill).attr('stroke', this.theme.new_line);
        cv.append('text').attr('x', xoff + tadj).attr('y', yoff + tadj).html(String(tile.val))
            .attr('class', 'tile_num').attr('fill', this.theme.new_text)
            .attr('font-size', this.font_size).attr('id', 'new_tile_num');
        // todo: fade on a gradient
        const ix = this.ix_map.get(tile.val) || 0;
        window.setTimeout(age_tile, 250, `tile_${i}_${j}`, theme_colors(this.theme, ix));
    }
    // upon losing 'grey out' the board
    drawOverlay(col: string = "#dadada") {
        let [x0, y0] = this.boardXY;
        let [xw, yw] = this.board_dim;
        D3select("#game_box").append('rect').attr('x', x0).attr('y', y0)
            .attr('width', xw).attr('height', yw)
            .attr('fill', col).attr('fill-opacity', 0.33);
    }
}

export { tboard };
