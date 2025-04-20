"use strict";


let encodeTH = (sensor, control, condition, value) => {
    let ret = 0;
    const shiftVals = {
        'T': [1, 25], 'A': [1, 24], 'G': [1, 16], 'N': [2, 16]
    };

    if (shiftVals[sensor]) ret |= shiftVals[sensor][0] << shiftVals[sensor][1];
    if (shiftVals[control]) ret |= shiftVals[control][0] << shiftVals[control][1];
    if (shiftVals[condition]) ret |= shiftVals[condition][0] << shiftVals[condition][1];
    if (value <= 65535) ret |= value;
    return ret;
}

let decodeTH = (val) => {
    let sensor = (val >> 25) & 0b1;
    let control = (val >> 24) & 0b1;
    let condition = (val >> 16) & 0b11;
    let value = val & 0xFFFF;
    console.log(`S-${sensor}, Ctl-${control}, Cnd-${condition}, V-${value}`);
}

let encodeREPeriph = (dev, renum) => {
    let ret = 0;
    if (dev != 0) ret |= (dev << 4);
    if (renum != 0) ret |= renum;
    return ret;
}

let decodeREPeriphe = (val) => {
    let device = (val >> 4) & 0b1111;
    let renum = val & 0b1111;
    console.log(`D-${device} R-${renum}`)
}

let encodeRE = (num, cmd) => {
    let ret = 0;
    if (num != 0) ret |= (num << 4);
    if (cmd != 0) ret |= cmd;
    return ret;
}

let decodeRE = (val) => {
    let num = (val >> 4) & 0b1111;
    let cmd = val & 0b1111;
    console.log(`N-${num} C-${cmd}`)
}

let encodeSO = (num, cond, val) => {
    let ret = 0;
    if (num != 0) ret |= (num << 20);
    if (cond != 0) ret |= (cond << 16);
    if (val != 0) ret |= (val);
    return ret;
}

let decodeSOI = (val) => {
    let num = (val >> 20) & 0b1111;
    let cond = (val >> 16) & 0b1111;
    let v = val & 0xFFFF;
    console.log(`N-${num} C-${cond} V-${v} RAW-${val}`);
}

let encodeTM = (num, start, dur) => {
    let ret = 0;
    if (num != 0) ret |= (num << 28);
    if (start != 0) ret |= (start << 11);
    if (dur != 0) ret |= dur; 
    return ret;
}

let decodeTM = (val) => {
    let num = (val >> 28) & 0b1111;
    let start = (val >> 11) & 0x1FFFF; 
    let dur = val & 0x7FF; // 11 bits.
    console.log(`N-${num} S-${start} D-${dur} Raw-${val}`);
}

let encodeLt = (tp, c, dk, ph) => {
    let ret = 0;
    if (tp != 0) ret |= (tp << 28);
    if (c != 0) ret |= (c << 24)
    if (dk != 0) ret |= (dk << 12);
    if (ph != 0) ret |= ph;
    return ret;
}

let decodeLt = (val) => {
    let tp = (val >> 28) & 0b1;
    let c = (val >> 24) & 0b11;
    let dk = (val >> 12) & 0x0FFF;
    let ph = val & 0x0FFF;
    console.log(`T-${tp} C-${c} D-${dk} P-${ph} RAW-${val}`);
}

let ele = function(ID, RO) {
    this.ID = ID;
    this.RO = RO;
    return this;
}

const a = new ele(ID = 55, RO = {'a': 74});

console.log(a.ID);





