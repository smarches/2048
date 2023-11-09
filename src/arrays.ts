// given an input (column-oriented) rectangular array (N columns, each of length M),
// 'rotate' the array by the number of times (each 'time' is a 90 degree turn)
// input array must be rectangular for this to be sensible
type Array2d<T> = Array<Array<T>>;

function rotate_array<T>(AA: Array2d<T>, times: number = 0, dir: string = 'clockwise'): Array2d<T> {
    times %= 4; // equivalence group
    if (times < 0) times += 4;
    if (dir != 'clockwise') times = 4 - times;
    let res = [];
    const M = AA[0].length;
    switch (times) {
        case 1:
            for (let i = 0; i < M; i++) {
                res.push(AA.map(A => A[i]).reverse());
            }
            break;
        case 2: // need slice() to get a copy (otherwise modifies input AA)
            res = AA.map(a => a.slice().reverse()).reverse();
            break;
        case 3:
            for (let i = M - 1; i >= 0; i--) {
                res.push(AA.map(A => A[i]));
            }
            break;
        default:
            res = AA;
            break;
    }
    return res;
}

function chunk<T>(arr: Array<T>, n: number, fill_val: any = null): Array<Array<T>> {
    /**
     * Splits the input array into n chunks
     *
     * @remarks
     * Note that n is the number of chunks, not the size of each chunk.
     *
     * @param arr - an array to split up
     * @param n - number of chunks
     * @param fill_val - if non-null, the last chunk will be padded with this value, if needed
     */
    const n_res = Math.ceil(arr.length / n);
    const res = [];
    for (let i = 0; i < n_res; i++) res.push([]);
    arr.forEach((a, i) => res[Math.floor(i / n)].push(a));
    const rem = arr.length % n;
    if (fill_val !== null && rem) {
        res[n_res - 1] = res[n_res - 1].concat(new Array(rem).fill(fill_val));
    }
    return res;
}

export { chunk, rotate_array };
