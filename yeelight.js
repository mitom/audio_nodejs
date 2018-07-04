const dgram = require('dgram')
    , net = require('net')
    , httpParser = require('http-string-parser')
    , url = require('url')
    , node_ip = require('ip')
    , logger = require('winston')
    , _ = require('lodash');

const mcast_grp = '239.255.255.250';
const mcast_port = 1982;


function transform_color(color) {
    return (parseInt(color.r) * 65536) + (parseInt(color.g) * 256) + parseInt(color.b)
}

function processScanResponse(resp) {
    let parsed = httpParser.parseResponse(resp);
    let ints = ['bright', 'color_mde', 'ct', 'rgb', 'hue', 'sat'];
    let strings = ['id', 'model', 'name'];
    let location = url.parse(parsed.headers.Location);
    parsed = _.pick(parsed.headers, _.union(ints, strings));

    _.forIn(parsed, (val, key) => {
        if (_.includes(ints, key)) parsed[key] = parseInt(val)
    });

    parsed.ip = location.hostname;
    parsed.port = parseInt(location.port);
    parsed.host = location.host;

    return parsed
}

module.exports = {
    scan_socket: dgram.createSocket("udp4"),
    client_socket: dgram.createSocket("udp4"),
    music_clients: [],
    dev_ip: {},
    next_cmd: 0,

    _create_cmd: function (method, params) {
        let cmd = {
            "id": (this.next_cmd++).toString(),
            "method": method,
            "params": params
        };

        return JSON.stringify(cmd) + '\r\n'
    },

    send_broadcast: function () {
        let message = new Buffer(
            "M-SEARCH * HTTP/1.1\r\n" +
            "HOST: 239.255.255.250:1982\r\n" +
            "MAN: \"ssdp:discover\"\r\n" +
            "ST: wifi_bulb"
        );
        logger.log('debug', 'Sending discovery broadcast..');
        this.client_socket.send(message, mcast_port, mcast_grp)
    },

    broadcast_music_color: function (color) {
        logger.log('debug', `Broadcasting color`, color);
        let ctx = this;
        let duration = 30;
        // console.log(duration)
        _.forIn(ctx.music_clients, (socket) => {
            ctx.send_music(socket, 'set_rgb', [transform_color(color), 'smooth', duration]);
            ctx.send_music(socket, 'set_bright', [color.alpha, 'smooth', duration])
        })
    },

    broadcast_music: function (method, params) {
        let ctx = this;
        _.forIn(ctx.music_clients, (socket) => {
            ctx.send_music(socket, method, params)
        })
    },

    send_music: function (socket, method, params) {
        let cmd = this._create_cmd(method, params);
        logger.log('debug', `Sendind music command ${_.trim(cmd)} to ${socket.remoteAddress}`);
        socket.write(cmd)
    },

    broadcast_command: function (method, params) {
        let ctx = this;
        _.forIn(ctx.dev_ip, (dev) => {
            ctx.send_command(dev, method, params)
        })
    },

    send_command: function (dev, method, params) {
        let ctx = this;

        let client = net.connect({host: dev.ip, port: dev.port}, () => {
            let cmd = ctx._create_cmd(method, params);
            logger.log('debug', `Sending command ${_.trim(cmd)} to ${dev.host}`);
            client.write(cmd)
        });

        client.on('data', (data) => {
            logger.log('debug', `${dev.host} says: ${data}`);
            client.end();
        });
    },

    add_device: function (dev) {
        if (this.dev_ip[dev.ip]) return;
        logger.log('info', `New bulb found at ${dev.ip}`);
        logger.log('debug', dev);
        this.dev_ip[dev.ip] = dev;
        this.send_command(dev, 'set_music', [1, this.music_server.address().address, this.music_server.address().port])
    },

    set_to_default: function () {
        this.broadcast_music('set_scene', ['ct', 3033, 100]);
    },

    start: function () {
        let ctx = this;

        ctx.music_server = net.createServer((socket) => {
            logger.log('info', `${socket.remoteAddress} has joined the TCP server.`);
            ctx.music_clients.push(socket);

            socket.on('close', () => {
                logger.log('info', `${socket.remoteAddress} has closed the TCP socket.`);
                _.pull(ctx.music_clients, socket);

                if (ctx.music_clients.length === 0) ctx.next_cmd = 0;
            })
        })
            .listen({host: node_ip.address(), port: 0}, () => {
                let addr = ctx.music_server.address();
                logger.log('info', `TCP server listening on: ${addr.address}:${addr.port}`)
            });

        function processResp(msg, rinfo) {
            ctx.add_device(processScanResponse(msg.toString(), rinfo))
        }

        ctx.scan_socket.on('message', processResp);
        ctx.client_socket.on('message', processResp);

        ctx.scan_socket.bind(mcast_port, function () {
            ctx.client_socket.bind(function () {
                ctx.send_broadcast();
                ctx.scan = setInterval(ctx.send_broadcast.bind(ctx), 30000)
            })
        });
    },

    close: function () {
        clearInterval(this.scan);
        this.scan_socket.close()
    }
};
