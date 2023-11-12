import { select as D3select } from "d3-selection";
import { transition } from "d3-transition";

import { brighten_color, id, rm_class, scale_rect } from './utils';
import { runif } from './random';
import { BoardTheme } from './themes';
import { powersOfTwoMap, tile_board } from './tiles';

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

const ix_map = powersOfTwoMap(11); // used to select theme colors

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
function theme_colors(theme: BoardTheme, n: number, isNew: boolean) {
    return isNew ?
        { fill: theme.new_fill, stroke: theme.new_line, text_color: theme.new_text } :
        { fill: theme.fills[n], stroke: theme.strokes[n], text_color: theme.text_color[n] };
}

function age_tile(tile_id: string, theme: BoardTheme): void {
    /**
     * Remove the new tile aesthetic and replace with theme colors
     */
    const tile = id(tile_id);
    tile.classList.add('fg_tile');
    tile.classList.remove('new_tile');
    const n = Number(tile.dataset.n);
    const ix = ix_map.get(n) || 0;
    const colors = theme_colors(theme, ix, false);
    tile.setAttribute('fill', colors.fill);
    tile.setAttribute('stroke', colors.stroke);
    const num_id = tile_id.replace("tile", "num");
    D3select(`#${num_id}`).attr('fill', colors.text_color);
}

class tboard {
    /**
     * Details for drawing a SVG tile board and score box
     */
    canvasSize: dimensions;
    boardSize: dimensions;
    scoreBoxSize: dimensions;
    requested_size: number; // the original input size, which might not match actual dimensions
    sep: number; // padding such that board size is 90% of canvas size
    dim: Array<number>; // number of horizontal and vertical tiles
    XYoffset: dimensions; // offset of board relative to top left corner 
    tile_size: number; // size in pixels of the (square) tiles
    tile_gap: number;
    tile_rad: number;
    tile_dim: number;
    text_adj: number;
    font_size: string;
    // attributes related to the game
    score: number;
    in_play: Boolean;
    theme: BoardTheme;
    busy: boolean;

    constructor(theme: BoardTheme) {
        this.in_play = false; // only 'true' once tiles drawn
        this.score = 0;
        this.theme = theme;
        this.dim = undefined;
    }

    setTileParams(W: number, H: number) {
        // note: this relies on having correctly scaled the board size! 
        this.tile_size = (this.boardSize.width / W); // should equal boardSize.height / H
        this.tile_gap = 0.1 * this.tile_size;
        this.text_adj = 0.5 * this.tile_size - this.tile_gap;
        this.tile_rad = 0.125 * this.tile_size;
        this.tile_dim = this.tile_size - 2 * this.tile_gap;
        const fontAdj = (5 - Math.log2(Math.max(W, H))).toFixed(1);
        this.font_size = fontAdj + 'rem';
    }

    setSizeParams(size: number,W:number,H:number) {
        /**
         * Determine size parameters based on requested board size.
         * 
         * @param size - the size (width and height) of the game board
         * @param W - number of tiles in the horizontal direction
         * @param H - number of tiles in the vertical direction
         */
        this.requested_size = size;
        let [sizeW,sizeH] = [size,size];
        if(W !== H) {
            const newWidth = (W/H) * size;
            [sizeW,sizeH] = scale_rect(newWidth,size,size,size);
        }
        console.debug(`Board dimensions: ${sizeW} x ${sizeH}`);
        const sizeMin = Math.min(sizeW,sizeH);
        this.sep = Math.round(0.05 * sizeMin);
        this.boardSize = { width: sizeW, height: sizeH };
        this.scoreBoxSize = { width: 0.4 * sizeW, height: 0.17 * sizeH };
        this.canvasSize = { width: sizeW + 2 * this.sep, height: sizeH + 3*this.sep + this.scoreBoxSize.height };
        // for conveneince, store the offset of the board
        this.XYoffset = { width: this.sep, height: 2 * this.sep + this.scoreBoxSize.height };
        this.setTileParams(W,H);
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
        const canvas = D3select('#game_box');
        for (let k = 0; k < n_decorations; k++) {
            let [xc, yc, rx, ry] = [
                this.XYoffset.width + decs.x[k],
                this.XYoffset.height + decs.y[k],
                rU[k] * decs.scale[k],
                decs.scale[k]
            ].map(e => Math.round(100 * e) / 100);
            canvas.append('ellipse').attr('cx', xc).attr('cy', yc)
                .attr('rx', rx).attr('ry', ry)
                .attr('fill', '#333322')
                .attr('opacity', decs.alpha[k].toFixed(3))
                .attr('transform', `rotate(${decs.rot[k].toFixed(1)},${xc},${yc})`);
        }
    }

    drawGridLines(numW: number, numH: number) {
        const bg_stroke = this.theme.bg_line; // coordinate bg with tile colors
        const [gapH, gapV] = [this.boardSize.width / numW, this.boardSize.height / numH]; // 'latitudes' and 'longitudes'
        const [offsetX, offsetY] = [this.XYoffset.width, this.XYoffset.height];
        // grid lines between tiles
        const canvas = D3select('#game_box');
        for (let i = 1; i < numW; i++) { // longitudes (vertical lines)
            const xx = (offsetX + i * gapH).toFixed(1);
            canvas.append('line')
                .attr('x1', xx).attr('y1', offsetY)
                .attr('x2', xx).attr('y2', offsetY + this.boardSize.height)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
        for (let j = 1; j < numH; j++) { // latitudes (horizontal lines)
            const yy = (offsetY + j * gapV).toFixed(1);
            canvas.append('line')
                .attr('x1', offsetX).attr('y1', yy)
                .attr('x2', offsetX + this.boardSize.width).attr('y2', yy)
                .attr('class', 'tile_grid').attr('stroke', bg_stroke);
        }
    }

    drawBackground(size:number, numW: number, numH: number): void {
        /**
         * Given the canvas size, draw the UI elements inside it
         */
        this.dim = [numW, numH];
        this.setSizeParams(size,numW,numH);

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
            .attr("id", 'score_box').attr('rx', 5).attr('ry', 5); // ideally make rx/ry scale
        this.updateScore(this.score);

        // the board itself
        canvas.append('rect')
            .attr('x', this.XYoffset.width).attr('y', this.XYoffset.height)
            .attr('width', this.boardSize.width)
            .attr('height', this.boardSize.height)
            .attr('class', 'tile_bg').attr('fill', this.theme.bg_fill).attr('stroke', this.theme.bg_line);

        // this.decorateBackground(200);
        this.drawGridLines(numW, numH);

        this.in_play = true;
    }
    tile_props(n: number, isNew: boolean) {
        /**
         * get the relevant values needed to plot tiles
         * 
         * @param n - value of the tile
         * @param isNew - whether the tile is newly generated (special stying applies)
         */

        const ixd = ix_map.get(n) || 0;
        let tileClass = isNew ? 'new_tile' : n > 0 ? 'fg_tile' : 'bg_tile';
        const colors = theme_colors(this.theme, ixd, isNew);
        return { fill: colors.fill, stroke: colors.stroke, text_color: colors.text_color, class: tileClass };
    }
    // when one tile is added after each turn, there's no need to re-draw the entire board
    drawTile(i: number, j: number, n: number, isNew: boolean) {
        const dims = this.tile_props(n, isNew);
        const tile_id = `tile_${i}_${j}`;
        // if there's already a tile with the id, remove it
        if (id(tile_id)) {
            id(tile_id).remove();
        }
        const xoff = this.boardXY.width + i * this.tile_size + this.tile_gap;
        const yoff = this.boardXY.height + j * this.tile_size + this.tile_gap;

        const cv = D3select('#game_box');
        const [D, R] = [this.tile_dim.toFixed(1), this.tile_rad.toFixed(1)];
        cv.append('rect').attr('x', xoff).attr('y', yoff).attr('id', tile_id)
            .attr('width', D).attr('height', D)
            .attr('rx', R).attr('ry', R).attr('class', dims.class)
            .attr('fill', dims.fill).attr('stroke', dims.stroke)
            .attr('data-n', n);
        if (n > 0) {
            cv.append('text')
                .attr('x', (xoff + this.text_adj).toFixed(1)).attr('y', (yoff + this.text_adj).toFixed(1))
                .attr('class', 'tile_num').attr('fill', dims.text_color)
                .attr('font-size', this.font_size).attr('id', `num_${i}_${j}`)
                .html(String(n));
        }
        if (isNew) {
            // todo: fade on a gradient
            window.setTimeout(age_tile, 250, tile_id, this.theme);
        }
    }
    drawTiles(tile_arr: tile_board): void {
        /**
         * Clear the existing board and draw tiles
         * 
         * @param tile_arr - a tile_board whose tiles are drawn
         */
        const [dW, dH] = this.dim;
        if (dW != tile_arr.w || dH != tile_arr.h) {
            console.error(`Wrong # of tiles! tile_arr has ${tile_arr.w} by ${tile_arr.h} and the_board is ${dW} x ${dH}`);
            return;
        };
        ['tile_num', 'fg_tile', 'bg_tile', 'new_tile'].forEach(e => rm_class(e));
        tile_arr.cols.map((col, ix) => {
            col.forEach((elem, i) => {
                this.drawTile(ix, i, elem.val, false);
            });
        });
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
        // redraw the background (this resizes if needed):
        this.drawBackground(size, board.W, board.H);
        // redraw the tiles:
        this.drawTiles(board);
        return;
    }
}

export { tboard };
