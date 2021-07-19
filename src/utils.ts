
function id(name: string): HTMLElement {
    return document.getElementById(name);
}

function rm_class(cls:string): void {
    Array.from(document.getElementsByClassName(cls)).forEach(e => e.remove());
}

function setAttributes(element:HTMLElement, attributes:Object) {
    Object.keys(attributes).forEach(function (name) {
        element.setAttribute(name, attributes[name]);
    })
}

function scale_rect(x:number, y:number, boundX:number, boundY:number): Array<number> {
    if (x < y) boundX *= x / y;
    if (y < x) boundY *= y / x;
    x *= boundX / x;
    y *= boundY / y;
    return [x, y];
}

// input must be hexadecimal number
function brighten_color(c: string, amount: number = 0.5): string {
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

// consider what setTimeout actually does?
// it takes a callback func and a time after which to call it
// similarly the Promise() constructor takes a function w/ two args,
// resolve and reject. So one way to write the callback function is
// function(resolve,reject){/* call resolve and/or reject @ some point */}
// or use .then(): afunc().then(resolveFunc,rejectFunc), where `afunc` returns a Promise object.
// though in the latter case it's less obvious where the await keyword comes in.
function sleep(ms: number): Promise<number> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function inputValueAsNumber(_id:string):number {
    let elem = id(_id);
    return (elem as HTMLInputElement).valueAsNumber;
}

export {brighten_color, id, inputValueAsNumber, rm_class, scale_rect, setAttributes, sleep};
