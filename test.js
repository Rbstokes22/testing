"use strict";

let val = 45;

val = false ? val * 100 : (((val - 32) / 1.8).toFixed(2) * 100);

console.log(val);
