const server = require('http').createServer()
    , WebSocketServer = require('ws').Server
    , wss = new WebSocketServer({server: server})
    , express = require('express')
    , bodyParser = require('body-parser')
    , app = express()
    , port = 5000
    , coreAudio = require("node-core-audio")
    , logger = require('winston')
    , fft = require("./fft")
    , config = require('./config')
    , process = require('process')
    , colorize = require('./color')
    , yeelight = require('./yeelight')
    , _ = require('lodash')
    , clapper = require('./clapper')
    ;
logger.cli();
if (_.includes(process.argv, '-d')) {
    logger.level = 'debug';
    logger.log('debug', 'Enabed debug log.')
}
let last = {};
let clap_active = false;


config.load();
yeelight.start();

// WEB
app.use(express.static('public'));
app.use(bodyParser.json());

app.get('/config', function (req, res) {
    res.json(config.get());
});

app.post('/config', function (req, res) {
    config_change(req.body);
    res.end();
});

app.post('/reset_config', function (req, res) {
    config.reset();
    config.save();

    res.json(config.get())
});

server.on('request', app);
server.listen(port, function () {
    console.log('Listening on ' + server.address().port)
});
// WEB END


// WEBSOCKET
wss.broadcast = function broadcast(data) {
    try {
        wss.clients.forEach(function each(client) {
            client.send(data);
        });
    } catch (e) {
    }
};

wss.on('open', function open() {
    console.log('connected');
});
// WEBSOCKET END

// AUDIO PROCESSOR
let engine = coreAudio.createNewAudioEngine();
let bufferSize = 2048;
let sampleRate = 44100;

emptyBuffer = [[]];

for (let i = 0; i < bufferSize; i++) emptyBuffer[0][i] = 0

engine.setOptions({
    inputChannels: 1,
    outputChannels: 1,
    sampleRate: sampleRate,
    sampleFormat: 8,
    framesPerBuffer: bufferSize
});

function processAudio(inputBuffer) {
    // console.log( "%d channels", inputBuffer.length );
    // console.log( "Channel 0 has %d samples", inputBuffer[0].length );
    let fftd = fft.calculate(inputBuffer, config.get('sample_size'), config.get('trim'), config.get('scale'), bufferSize);
    last.color = colorize(fftd);
    last.data = fftd;

    if (config.get('clapper')) {
        // let mean = _.mean(fftd);
        // let variance = _.sum(_.map(fftd, (x) => {return Math.pow((x-mean), 2)}))/(fftd.length-1);
        // let diff = _.max(fftd)-_.min(fftd);
        // console.log(mean, variance, diff);
        let claps = clapper.add(_.mean(fftd));
        if (claps === 2) {
            clap_active = !clap_active;
            if (clap_active && config.get('active')) start();
            if (!clap_active) stop();
        }
    }

    return emptyBuffer
}
setInterval(() => {
    wss.broadcast(JSON.stringify({
        d: last.data,
        c: last.color
    }));
}, 30);
engine.addAudioCallback(processAudio);

// AUDIO PROCESSOR END

let running = null;

function start() {
    if (running) return;
    running = setInterval(() => {
        if (!last.color) return;
        if (config.get('clapper') && !clap_active) return;
        yeelight.broadcast_music_color(last.color)

    }, 200)
}

function stop() {
    if (running) {
        clearInterval(running);
        yeelight.set_to_default();
        running = null
    }
}

function config_change(desired) {
    if (desired.active === false) stop();
    if (desired.active === true) start();

    config.set(desired);
    config.save()
}

if (config.get('active')) {
    start()
}


// PROCESS HANDLING
function exitHandler(options, err) {
    yeelight.set_to_default();
    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));
