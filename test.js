"use strict";

let obj = {"soil1": 22, "soil2":33};

for (let i = 1; i < 3; i++) {
    console.log(obj[`soil${i}`]);
}