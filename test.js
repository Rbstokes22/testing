"use strict";

let f = (val) => {
    const h = Math.floor(val / 3600);
    const m = Math.floor((val % 3600) / 60);
    const s = val % 60;
    return `${h}:${m}:${s}`;
}

const tm = 63777;



console.log(f(tm));