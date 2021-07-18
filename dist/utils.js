
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
    return `#${r}${g}${b}`;
}

// random uniform variates
function runif(n, a = 0, b = 1) {
    if (a > b) [a, b] = [b, a];
    if (a === b) return Array(n).fill(a);
    const diff = b - a;
    return Array(n).fill(0).map(_ => diff * Math.random() + a);
}

// random variates from exponential distribution
function rexp(n, lambda) {
    if (isNaN(lambda) || lambda <= 0) throw `rexp: invalid lambda parameter (${lambda})`;
    if (isNaN(n) || n < 1) throw `rexp: invalid n parameter (${n})`;
    return Array.apply(0, Array(n)).map(e => -Math.log(Math.random()) / lambda);
}

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

// just import lodash?
function chunk(arr, n, fill_val = null) {
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

export {brighten_color, chunk, id, rm_class, rexp, runif, scale_rect, setAttributes, sleep};
