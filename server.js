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
    "GET_ALL", "CALIBRATE_TIME"
];

CMDS[16] = "ATTACH_TEMP_RELAY";
CMDS[17] = "SET_TEMP_RE_LWR_THAN";
CMDS[18] = "SET_TEMP_RE_GTR_THAN";
CMDS[19] = "SET_TEMP_RE_COND_NONE";
CMDS[20] = "SET_TEMP_ALT_LWR_THAN";
CMDS[21] = "SET_TEMP_ALT_GTR_THAN";
CMDS[22] = "SET_TEMP_ALT_COND_NONE";
CMDS[51] = "GET_TRENDS"; // Add this special to test.

let allData = {"firmv": "1.0.0","id": "0","newLog": 0,"sysTime": 62435,
    "hhmmss": "17:20:35","timeCalib": 1,"re1": 0,"re1TimerEn": 0,
    "re1TimerOn": 99999,"re1TimerOff": 99999,"re2": 0,"re2TimerEn": 0,
    "re2TimerOn": 99999,"re2TimerOff": 99999,"re3": 0,"re3TimerEn": 0,
    "re3TimerOn": 99999,"re3TimerOff": 99999,"re4": 0,"re4TimerEn": 0,
    "re4TimerOn": 99999,"re4TimerOff": 99999,"temp": 26.5,"tempRe": 2,
    "tempReCond": 1,"tempReVal": 1020,"tempAltCond": 2,"tempAltVal": 1150,
    "hum": 58.65,"humRe": 255,"humReCond": 2,"humReVal": 0,"humAltCond": 2,
    "humAltVal": 0,"SHTUp": 1,"tempAvg": 21.71,"humAvg": 45.87,
    "tempAvgPrev": 0,"humAvgPrev": 0,"soil1": 2633,"soil1AltCond": 2,
    "soil1AltVal": 0,"soil1Up": 1,"soil2": 182,"soil2AltCond": 2,
    "soil2AltVal": 0,"soil2Up": 1,"soil3": 177,"soil3AltCond": 2,"soil3AltVal": 0,
    "soil3Up": 1,"soil4": 0,"soil4AltCond": 2,"soil4AltVal": 0,"soil4Up": 1,
    "violet": 255,"indigo": 527,"blue": 942,"cyan": 1375,"green": 2375,
    "yellow": 4091,"orange": 5640,"red": 3851,"nir": 1534,"clear": 15585,
    "photo": 3120,"violetAvg": 98.41,"indigoAvg": 202.22,"blueAvg": 356.18,
    "cyanAvg": 530.24,"greenAvg": 906.52,"yellowAvg": 1568.42,
    "orangeAvg": 2168.73,"redAvg": 1460.59,"nirAvg": 570.13,"clearAvg": 5700.67,
    "photoAvg": 1148.59,"violetAvgPrev": 0,"indigoAvgPrev": 0,
    "blueAvgPrev": 0,"cyanAvgPrev": 0,"greenAvgPrev": 0,"yellowAvgPrev": 0,
    "orangeAvgPrev": 0,"redAvgPrev": 0,"nirAvgPrev": 0,"clearAvgPrev": 0,
    "photoAvgPrev": 0,"lightRe": 255,"lightReCond": 2,"lightReVal": 0,
    "lightDur": 6508,"photoUp": 1,"specUp": 1,"darkVal": 500,
    "repTimeEn": 0,"repSendTime": 86340};

app.get("/OTAcheck", (req, res) => {

    fetch(`${URL}/checkOTA`)
    .then(resp => resp.json())
    .then(resp => {
        res.send(resp);
    })
    .catch(err => console.log(err));
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
    let json;

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

            case "ATTACH_TEMP_RELAY":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempRe"] = CMD[1] == 4 ? 255 : CMD[1];
                clientSocket.send(JSON.stringify(json));
                break;

            case "SET_TEMP_RE_LWR_THAN":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempReCond"] = 0;
                allData["tempReVal"] = CMD[1];
                clientSocket.send(JSON.stringify(json));
                console.log("LWR THAN");
                break;

            case "SET_TEMP_RE_GTR_THAN":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempReCond"] = 1;
                allData["tempReVal"] = CMD[1];
                clientSocket.send(JSON.stringify(json));
                console.log("GTR THAN");
                break;

            case "SET_TEMP_RE_COND_NONE":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempReCond"] = 2;
                allData["tempReVal"] = CMD[1];
                clientSocket.send(JSON.stringify(json));
                console.log("RE NONE");
                break;

            case "SET_TEMP_ALT_LWR_THAN":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempAltCond"] = 0;
                allData["tempAltVal"] = CMD[1];
                clientSocket.send(JSON.stringify(json));
                console.log("LWR THAN");
                break;

            case "SET_TEMP_ALT_GTR_THAN":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempAltCond"] = 1;
                allData["tempAltVal"] = CMD[1];
                clientSocket.send(JSON.stringify(json));
                console.log("GTR THAN");
                break;

            case "SET_TEMP_ALT_COND_NONE":
                json = {"status": 1, "msg": "OK", "supp": 0, "id": `${CMD[2]}`};
                allData["tempAltCond"] = 2;
                allData["tempAltVal"] = CMD[1];
                clientSocket.send(JSON.stringify(json));
                console.log("RE NONE");
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