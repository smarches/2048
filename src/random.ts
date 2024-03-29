import { range } from 'lodash';

function sample<T>(elems: Array<T> | number, n: number, replace: Boolean = false): Array<T> {
    /**
     * Sample values from the input array
     *
     * @param elems - either an array to sample from or a size for sampling from 1:n
     * @param n - number of samples to return
     * @param replace - whether to sample with replacement
     *
     * @returns Array of `n` uniform variates in the range [a,b]
     */
    let res = [];
    if (typeof elems === 'number') {
        if (!Boolean(elems) || elems < 0) return res;
        elems = range(1, Math.floor(elems + 1));
    }
    elems = <Array<T>>elems;
    if (n != Math.floor(n)) return res;
    let L = elems.length;
    if (replace) {
        for (let i = 0; i < n; i++) {
            res.push(elems[Math.floor(L * Math.random())]);
        }
    } else {
        if (n >= L) return elems;
        const ix: Array<number> = range(L);
        for (let i = 0; i < n; i++) {
            let ii = Math.floor(L-- * Math.random());
            res.push(elems[ix[ii]]);
            [ix[ii], ix[L]] = [ix[L], ix[ii]];
        }
    }
    return res;
}

function runif(n: number, a: number = 0, b: number = 1): Array<number> {
    /**
     * Generate random uniform deviates
     *
     * @param n - number of samples to generate
     * @param a - lower bound of distriubtion
     * @param b - upper bound of distribution
     *
     * @returns Array of `n` uniform variates in the range [a,b]
     */
    if (a > b) [a, b] = [b, a];
    if (a === b) return Array(n).fill(a);
    const diff = b - a;
    return Array(n).fill(0).map(_ => diff * Math.random() + a);
}

function rexp(n: number, lambda: number): Array<number> {
    /**
     * Generate random exponential deviates
     *
     * @param n - number of samples to generate
     * @param lambda - mean parameter of exponential distribution
     *
     * @returns Array of `n` exponential variates
     */
    if (isNaN(lambda) || lambda <= 0) throw `rexp: invalid lambda parameter (${lambda})`;
    if (isNaN(n) || n < 1) throw `rexp: invalid n parameter (${n})`;
    return Array.apply(0, Array(n)).map(_ => -Math.log(Math.random()) / lambda);
}

export { sample, runif, rexp };
