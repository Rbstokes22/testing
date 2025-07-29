"use strict";

const max = 32767;
const steps = max / 1000;

let toPerc = (intVal) => {
    const val = Number((intVal / (steps * 10)).toFixed(1));
    return val;
}

let toIntVal = (perc) => {
    let reduction = perc * 10; // Put into steps 
    return Math.floor(reduction * steps);
}


// for (let i = 0; i < 1001; i++) {
//     const stPerc = i/10;
//     const val = toIntVal(stPerc);
//     const perc = toPerc(val);

//     if (stPerc != perc) console.log(i);

// }

console.log(toIntVal(1));



