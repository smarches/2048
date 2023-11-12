import { select as D3select } from "d3-selection";
import { transition } from "d3-transition";

import { brighten_color, id, rm_class, scale_rect } from './utils';
import { runif } from './random';
import { BoardTheme } from './themes';
import { powersOfTwoMap, tile_board, Tile } from './tiles';

// one-off interface to satisfy the compiler
interface bg_decorator {
    x: Array<number>;
    y: Array<number>;
    scale: Array<number>;
    alpha?: Array<number>;
    rot?: Array<number>;
}

interface dimensions {
    width: number;
    height: number;
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

function age_tile(tile_id: string, cc: Array<string>): void {
    const tile = id(tile_id);
    tile.classList.add('fg_tile');
    tile.setAttribute('fill', cc[0]);
    tile.setAttribute('stroke', cc[1]);
    D3select("#new_tile_num").attr('fill', cc[2]).attr('id', '');
}

class tboard {
    /**
     * Details for drawing a SVG tile board and score box
     */
    canvasSize: dimensions;
    boardSize: dimensions;
    scoreBoxSize: dimensions;
    sep: number; // padding such that board size is 90% of canvas size
    dim: Array<number>; // number of horizontal and vertical tiles
    XYoffset: dimensions; // offset of board relative to top left corner 
    tile_size: number; // size in pixels of the (square) tiles
    font_size: string;
    // attributes related to the game
    score: number;
    in_play: Boolean;
    theme: BoardTheme;
    ix_map: Map<number, number>; // used to select theme colors
    busy: boolean;

    constructor(size: number, theme: BoardTheme) {
        this.in_play = false; // only 'true' once tiles drawn
        this.setSizeParams(size);
        this.score = 0;
        this.theme = theme;
        this.ix_map = powersOfTwoMap(11);
    }

    setSizeParams(size: number) {
        /**
         * Determine size parameters based on requested board size.
         * 
         * @param size - the size (width and height) of the game board
         */
        this.sep = Math.round(0.05 * size);
        this.boardSize = { width: size, height: size };
        this.scoreBoxSize = { width: 0.4 * size, height: 0.17 * size };
        this.canvasSize = { width: 1.1 * size, height: 1.15 * size + this.scoreBoxSize.height };
        // for conveneince, store the offset of the board
        this.XYoffset = { width: this.sep, height: 2 * this.sep + this.scoreBoxSize.height };
    }
    setTheme(theme: BoardTheme) {
        this.theme = theme;
    }
    get scoreXY(): Array<number> {
        /**
         * top left coordinate and dimensions of score box
         */
        let xy = [this.canvasSize.width - this.sep - this.scoreBoxSize.width, this.sep];
        let wh = [this.scoreBoxSize.width, this.scoreBoxSize.height];
        return xy.concat(wh);
    }
    get boardXY(): dimensions {
        return this.XYoffset;
    }
    updateScore(val = null) {
        rm_class('score_font');
        const box = id("score_box");
        box.setAttribute('fill', this.theme.score_bg);
        const [x0, y0, xW, yW] = this.scoreXY;
        const yOffset = y0 + 0.8 * yW;
        const n = val || this.score;
        const delta = Math.max(0, n - this.score);
        // console.info(`old score = ${this.score} and delta = ${delta}`);
        const cv = D3select('#game_box');
        let digits = String(n).split('');
        digits.forEach((e, i) => {
            cv.append('text')
                .attr('x', 1.05 * x0 + 0.16 * xW * i)
                .attr('y', yOffset)
                .attr('class', 'score_font')
                .attr('fill', this.theme.score_text)
                .html(e);
        });
        const base_stroke = brighten_color(this.theme.score_bg, 0.2);
        // pulse effect proportional to size of score increase
        if (delta > 0) {
            const temp_color = brighten_color(base_stroke, 1 - 2 / Math.sqrt(delta));
            const t1 = transition().duration(333);
            const t2 = transition().duration(1000);
            D3select("#score_box").transition(t1).attr('stroke', temp_color)
                .attr('stroke-width', "0.25rem").transition(t2)
                .attr('stroke', base_stroke).attr('stroke-width', '0.2rem');
        }
        this.score = val;
    }
    decorateBackground(n_decorations: number = 75) {
        let decs = bg_deco(this.boardSize.width, this.boardSize.height, n_decorations, 0.01);
        let rU = runif(n_decorations, 0.25, 4);
        const canvas = D3select('#board');
        for (let k = 0; k < n_decorations; k++) {
            let [xc, yc, rx, ry] = [
                this.XYoffset.width + decs.x[k],
                this.XYoffset.height + decs.y[k],
                rU[k] * decs.scale[k],
                decs.scale[k]
            ].map(e => Math.round(100 * e) / 100);
            canvas.append('ellipse').attr('cx', xc).attr('cy', yc)
                .attr('rx', rx).attr('ry', ry)
                .attr('fill', '#333322').attr('opacity', decs.alpha[k])
                .attr('transform', `rotate(${decs.rot[k]},${xc},${yc})`);
        }
    }

    drawGridLines(numW: number, numH: number) {
        const bg_stroke = this.theme.bg_line; // coordinate bg with tile colors
        const [gapV, gapH] = [this.boardSize.width / numW, this.boardSize.height / numH]; // 'latitudes' and 'longitudes'
        const [offsetX, offsetY] = [this.XYoffset.width, this.XYoffset.height];
        // grid lines between tiles
        const canvas = D3select('#board');
        for (let i = 1; i < numW; i++) { // longitudes
            const xx = (offsetX + i * gapH).toFixed(3);
            canvas.append('line')
                .attr('x1', xx).attr('y1', offsetY)
                .attr('x2', xx).attr('y2', offsetY + this.boardSize.height)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
        for (let j = 1; j < numH; j++) { // latitudes
            const yy = (offsetY + j * gapV).toFixed(3);
            canvas.append('line')
                .attr('x1', offsetX).attr('y1', yy)
                .attr('x2', offsetX + this.boardSize.width).attr('y2', yy)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
    }

    drawBackground(numW: number, numH: number): void {
        /**
         * Given the canvas size, draw the UI elements inside it
         */
        this.dim = [numW, numH];
        this.tile_size = (this.boardSize.width / Math.max(numW, numH));
        console.info(`Tile size is : ${this.tile_size}`);
        const fontAdj = (5 - Math.log2(Math.max(numW, numH))).toFixed(3);
        this.font_size = fontAdj + 'rem'; // need to add pixel size scaling also

        D3select("body").style("background-color", this.theme.body_bg);
        D3select("#board").html(''); // clear existing
        // background container
        const canvas = D3select('#board').append('svg')
            .attr('width', this.canvasSize.width)
            .attr('height', this.canvasSize.height)
            .attr('class', 'gamebox')
            .attr('id', 'game_box')
            .style('background-color', this.theme.box_bg);
        // score box
        const [x0, y0, xW, yW] = this.scoreXY;
        canvas.append('rect').attr('x', x0).attr('y', y0)
            .attr('width', xW).attr('height', yW)
            .attr("id", 'score_box').attr('rx', 5).attr('ry', 5);
        this.updateScore(this.score);
        // the board itself

        canvas.append('rect')
            .attr('x', this.XYoffset.width).attr('y', this.XYoffset.height)
            .attr('width', this.boardSize.width)
            .attr('height', this.boardSize.height)
            .attr('class', 'tile_bg').attr('fill', this.theme.bg_fill).attr('stroke', this.theme.bg_line);

        // this.decorateBackground();

        this.drawGridLines(numW, numH);

        this.in_play = true;
    }
    // drawing all tiles @ once
    drawTiles(tile_arr: tile_board): void {
        const [dW, dH] = this.dim;
        if (dW != tile_arr.w || dH != tile_arr.h) {
            console.error(`Wrong # of tiles! tile_arr has ${tile_arr.w} by ${tile_arr.h} and the_board is ${dW} x ${dH}`);
            return;
        };
        const [tw, tgap] = [this.tile_size, this.tile_size * 0.1];
        const [tadj, trad, tdim] = [tw * 0.5 - tgap, 0.125 * tw, (tw - 2 * tgap).toFixed(3)];
        ['tile_num', 'fg_tile', 'bg_tile', 'new_tile'].forEach(e => rm_class(e));
        const cv = D3select('#game_box');
        tile_arr.cols.map((col, ix) => {
            const xoff = ix * tw + this.boardXY.width + tgap;
            col.forEach((elem, i) => {
                const yoff = this.boardXY.height + tw * i + tgap
                const n = elem.val;
                const ixd = this.ix_map.get(n) || 0;
                let [tfill, tstroke, txtc] = theme_colors(this.theme, ixd);
                cv.append('rect').attr('x', xoff).attr('y', yoff)
                    .attr('width', tdim).attr('height', tdim)
                    .attr('id', `tile_${ix}_${i}`)
                    .attr('rx', trad).attr('ry', trad)
                    .attr('fill', tfill).attr('stroke', tstroke)
                    .attr('class', n > 0 ? 'fg_tile' : 'bg_tile');
                if (n > 0) {
                    cv.append('text')
                        .attr('x', xoff + tadj).attr('y', yoff + tadj)
                        .attr('fill', txtc).attr('font-size', this.font_size)
                        .html(String(n)).attr('class', 'tile_num');
                }
            });
        });
        // should be moved somewhere else
        this.updateScore(tile_arr.score);
    }
    // when one tile is added after each turn, there's no need to re-draw the entire board
    drawTile(tile: Tile, i: number, j: number) {
        const [tw, tgap, trad] = [this.tile_size, 0.1 * this.tile_size, 0.125 * this.tile_size];
        const tadj = tw * 0.5 - tgap;
        const tile_id = `tile_${i}_${j}`;
        id(tile_id).remove(); // keep unique (though text is left extra...)
        const [xoff, yoff] = [i * tw + this.boardXY.width + tgap, j * tw + this.boardXY.height + tgap];
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
        window.setTimeout(age_tile, 250, tile_id, theme_colors(this.theme, ix));
    }
    // upon losing, 'grey out' the board
    drawOverlay(col: string = "#dadada") {
        D3select("#game_box").append('rect')
            .attr('x', this.XYoffset.width)
            .attr('y', this.XYoffset.height)
            .attr('width', this.boardSize.width)
            .attr('height', this.boardSize.height)
            .attr('fill', col).attr('fill-opacity', 0.33);
    }
    resize(size: number, board: tile_board): void {
        // resize the board
        this.setSizeParams(size);
        // redraw the background:
        this.drawBackground(this.dim[0], this.dim[1]);
        // redraw the tiles:
        this.drawTiles(board);
        return;
    }
}

export { tboard };
