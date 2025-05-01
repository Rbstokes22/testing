const express = require("express");
const webSocket = require("ws");
const http = require("http");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const wss = new webSocket.Server({server});

app.set("view engine", "ejs");
app.set("views", `${__dirname}/views`);
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(express.static(__dirname));

const PORT = 8080;
// const URL = "https://major-absolutely-bluejay.ngrok-free.app";
const URL = `http://shadyside.local:${PORT}`;
const FW_VERS = "1.0.1";

let clients = {};

// ESP SERVER EMULATOR

// This will be an enum in the server
let CMDS = [null, // Used to index to a +1
    "GET_ALL", "CALIBRATE_TIME", "NEW_LOG_RCVD", 
    "RELAY_CTRL", "RELAY_TIMER", "ATTACH_RELAYS", 
    "SET_TEMPHUM", "SET_SOIL", "SET_LIGHT", "SET_SPEC_INTEGRATION_TIME", "SET_SPEC_GAIN", 
    "CLEAR_AVERAGES", "CLEAR_AVG_SET_TIME", "SAVE_AND_RESTART", "GET_TRENDS"
];


let allData = {
    "firmv": "1.0.0", "id": "1", "newLog": 0, "sysTime": 13683, "hhmmss": "3:48:3",
    "timeCalib": 0, 
    "re0": 0, "re0TimerEn": 0, "re0TimerOn": 99999, "re0TimerOff": 99999,
    "re1": 0, "re1TimerEn": 0, "re1TimerOn": 99999, "re1TimerOff": 99999, 
    "re2": 0, "re2TimerEn": 0, "re2TimerOn": 99999, "re2TimerOff": 99999, 
    "re3": 0, "re3TimerEn": 0, "re3TimerOn": 99999, "re3TimerOff": 99999, 
    "temp": 25.87, "tempRe": 255, "tempReCond": 2,
    "tempReVal": 0, "tempAltCond": 2, "tempAltVal": 0, "hum": 54.03,
    "humRe": 255, "humReCond": 0, "humReVal": 2, "humAltCond": 2,
    "humAltVal": 0, "SHTUp": 1, "tempAvg": 25.8, "humAvg": 54.6,
    "tempAvgPrev": 0, "humAvgPrev": 0, 
    "soil0": 139, "soil0AltCond": 2, "soil0AltVal": 0, "soil0Up": 1,
    "soil1": 2735, "soil1AltCond": 2, "soil1AltVal": 0, "soil1Up": 1, 
    "soil2": 0, "soil2AltCond": 2, "soil2AltVal": 0, "soil2Up": 1, 
    "soil3": 0, "soil3AltCond": 2, "soil3AltVal": 0, "soil3Up": 1,  
    "violet": 450, "indigo": 1025, "blue": 1448,
    "cyan": 2912, "green": 3517, "yellow": 6408, "orange": 7688, "red": 5191,
    "nir": 2170, "clear": 18000, "photo": 3248, "violetAvg": 420.2,
    "indigoAvg": 907.6, "blueAvg": 1331.6, "cyanAvg": 2516.2, "greenAvg": 3439.1,
    "yellowAvg": 5557.7, "orangeAvg": 7343.4, "redAvg": 4478.9, "nirAvg": 2179.7,
    "clearAvg": 17538, "photoAvg": 3130.2, "violetAvgPrev": 0,
    "indigoAvgPrev": 0, "blueAvgPrev": 0, "cyanAvgPrev": 0, "greenAvgPrev": 0,
    "yellowAvgPrev": 0, "orangeAvgPrev": 0, "redAvgPrev": 0, "nirAvgPrev": 0,
    "clearAvgPrev": 0, "photoAvgPrev": 0, "lightRe": 255, "lightReCond": 2,
    "lightReVal": 0, "lightDur": 7894, "photoUp": 1, "specUp": 1,
    "darkVal": 500, "atime": 29, "astep": 599, "again": 9, "avgClrTime": 86340
 }	

app.get("/OTAcheck", (req, res) => {

    fetch(`${URL}/checkOTA`)
    .then(resp => resp.json())
    .then(resp => {
        res.send(resp);
    })
    .catch(err => console.log(err));
});

app.get("/ch", (req, res) => { // Easy way to see changes or change dynamic doc.
    const {key, val} = req.query;
    allData[key] = val;
    res.status(200).send("OK");
});

let toggle = true;
app.get("/testSize", (req, res) => { // 182 bytes sending this way.
    let resp = ["FAIL", "OK"];
    let rep = resp[Number(toggle)];
    toggle = !toggle;

    res.setHeader("keep-alive", "timeout=15, max=10");
    res.setHeader("greeting", "Hello");


    res.send(rep);
});

wss.on("connection", (ws, req) => { // Set all event handlers
    // handle path to mimic the esp server
    if (req.url != "/ws") {
        ws.close(1000, "Invalid path");
    }

    console.log("New client connected");
    ws.emit('handshake', { message: 'Handshake successful!' });

    const clientID = Date.now();
    clients[clientID] = ws;
    console.log(`Client ${clientID} connected`);

    // Handle incoming messages
    ws.on("message", (message) => {
        const part = message.toString();
        process(part.split('/'), clientID);
    });

    ws.on("close", () => {
        console.log(`Client ${clientID} disconnected`);
        delete clients[clientID];
    });
});

const process = (CMD, clientID) => {

    if (CMD[0] == -1) return;

    const clientSocket = clients[clientID];
    let json, val = CMD[1];

    if (clientSocket && clientSocket.readyState === webSocket.OPEN) {

        switch (CMDS[CMD[0]]) {
            case "GET_ALL":
            allData["id"] = `${CMD[2]}`;
            clientSocket.send(JSON.stringify(allData));
            break;

            case "CALIBRATE_TIME":
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            break;

            case "RELAY_CTRL": {
            let reNum = (val >> 4) & 0b1111;
            let cmd = (val & 0b1111);
            allData[`re${reNum}`] = cmd;
            console.log(`RN-${reNum} C-${cmd}`);
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            
            break;

            case "RELAY_TIMER": {
            let reNum = (val >> 28) & 0b1111;
            let start = (val >> 11) & 0x1FFFF;
            let dur = (val & 0x7FF);

            let end = (start + (dur * 60)) % 86400;

            allData[`re${reNum}TimerEn`] = (start === 99999) ? 0 : 1;
            allData[`re${reNum}TimerOn`] = start;
            allData[`re${reNum}TimerOff`] = end;
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }

            break;

            case "ATTACH_RELAYS": {
            let device = (val >> 4) & 0b1111;
            let reNum = val & 0b1111;

            switch (device) {
                case 0: // Temp
                allData.tempRe = (reNum == 4) ? 255 : reNum;
                break;

                case 1: // Hum
                allData.humRe = (reNum == 4) ? 255 : reNum;
                break;

                case 2: // Light
                allData.lightRe = (reNum == 4) ? 255 : reNum;
                break;
            }
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            break;

            case "SET_TEMPHUM": {
                let sensor = (val >> 25) & 0b1;
                let control = (val >> 24) & 0b1;
                let condition = (val >> 16) & 0b11;
                let value = val & 0xFFFF;
                value = (value > 32768) ? value - 65536 : value;
                
                if (sensor === 1) {
                    
                    if (control == 0) { // relay
                        allData.tempReVal = (condition == 2) ? 0 : value;
                        allData.tempReCond = condition;
                    } else { // alt
                        allData.tempAltVal = (condition == 2) ? 0 : value;
                        allData.tempAltCond = condition;
                    }
    
                } else {
    
                    if (control == 0) { // relay
                        allData.humReVal = (condition == 2) ? 0 : value;
                        allData.humReCond = condition;
                    } else { // alt
                        allData.humAltVal = (condition == 2) ? 0 : value;
                        allData.humAltCond = condition;
                    }
                }
            }
            
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            break;

            case "SET_SOIL": {
            let num = (val >> 20) & 0b1111;
            let cond = (val >> 16) & 0b111;
            let v = (val & 0xFFFF);

            console.log(`N-${num} C-${cond}, V-${v}`);

            allData[`soil${num}AltCond`] = cond;
            allData[`soil${num}AltVal`] = (cond == 2) ? 0 : v;
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            break;

            case "SET_LIGHT": {
            let type = (val >> 28) & 0b1;
            let cond = (val >> 24) & 0b11;
            let dark = (val >> 12) & 0x0FFF;
            let photo = val & 0x0FFF;

            switch (type) {
                case 0: // Dark
                allData.darkVal = dark;
                break;

                case 1: // photo
                allData.lightReCond = cond;
                allData.lightReVal = (cond == 2) ? 0 : photo;
                break;
            }
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            break;

            case "SET_SPEC_INTEGRATION_TIME": {
            let ATIME = val & 0xFF;
            let ASTEP = (val >> 8) & 0xFFFF;
            allData.astep = ASTEP;
            allData.atime = ATIME;
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            break;

            case "SET_SPEC_GAIN": {
            allData.again = val;
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            break;

            case "CLEAR_AVERAGES": {
            // No testing needed here.
            json = {"status":1, "id": `${CMD[2]}`};
            clientSocket.send(JSON.stringify(json));
            }
            break;

            case "CLEAR_AVG_SET_TIME": {
            allData.avgClrTime = val;
            }
            break;
          

            case "GET_TRENDS":
            json = {"id": `${CMD[2]}`,
                "temp": [21.16,21.29,0,0,0,0],
                "hum": [57.7,57.51,0,0,0,0],
                "clear": [15597,15630,0,0,0,0],
                "violet": [257,258,0,0,0,0],
                "indigo": [529,530,0,0,0,0],
                "blue": [945,947,0,0,0,0],
                "cyan": [1380,1382,0,0,0,0],
                "green": [2382,2385,0,0,0,0],
                "yellow": [4093,4109,0,0,0,0],
                "orange": [5644,5663,0,0,0,0],
                "red": [3853,3866,0,0,0,0],
                "nir": [1548,1550,0,0,0,0]};

            clientSocket.send(JSON.stringify(json));      
            break;
        }
    }
}

// SERVER
app.get("/", (req, res) => {
    res.render("station");
});

app.get("/test", (req, res) => {
    res.render("page");
})

app.get("/checkOTA", (req, res) => { // Ensure "version" is passed back.
    console.log("Checking OTA");
    let json = fs.readFileSync(`${__dirname}/firmware/update.json`, "utf-8");
    res.send(json);
});

app.get("/getSig", (req, res) => {
    const {version} = req.query;
    console.log("Getting Signature");
    res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader("Content-Type", "application/octet-stream");
    res.status(200).sendFile(`${__dirname}/firmware/signature/S${version}.sig`);
});

app.get("/getFirmware", (req, res) => {
    const {version} = req.query;
    console.log("Getting firmware");
    res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader("Content-Type", "application/octet-stream");
    res.status(200).sendFile(`${__dirname}/firmware/firmware/F${version}.bin`);
});

app.get("/getLog", (req, res) => { // Works
    const {sendNew} = req.query;
    if (sendNew == "true") {
        res.status(200).send("entry1;entry2;entry3");
    } else {
        res.status(200).send("");
    }
});

// All alerts or text services come though here. Include another variable
// averages, which can be parsed here in the server.
app.post("/Alerts", (req, res) => { 
    const {APIkey, phone, msg, report} = req.body;
    console.log(`API: ${APIkey}, Phone: ${phone}, Msg: ${msg}, Report: ${report}`);
    res.status(200).send("OK"); // Will be OK, or FAIL
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});