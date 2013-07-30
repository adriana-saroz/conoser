var static = require('node-static');
var http = require('http');
var file = new(static.Server)();

var server = http.createServer(function (req, res) {
    file.serve(req, res);
}).listen(8888);

var maxClients = 6;

var rtc = {};
rtc.sockets = [];
rtc.rooms = {};

rtc.getSocket = function(id) {
    var connections = rtc.sockets;
    for (var i = 0; i < connections.length; i++) {
        var socket = connections[i];
        if (socket.id === id) {
            return socket;
        }
    }
}

var io = require('socket.io').listen(server);

io.sockets.on('connection', function (socket) {

    rtc.sockets.push(socket);

    socket.on('join_room', function (data) {
        console.log('Request from ' + data.username + ' to join room ' + data.room);

        var clients = io.sockets.clients(data.room);
        var numClients = clients.length;
        if (numClients >= maxClients) {
            socket.emit('full_room', {
                room : data.room
            });
            return;
        }

        var connections = [];
        for (var i in clients) {
            var client = clients[i];
            connections.push({
                id : client.id,
                username : client.username,
                userId : client.userId
            });
        }

        var roomNr = rtc.rooms[data.room] || 0;
        roomNr++;
        rtc.rooms[data.room] = roomNr;
        // TODO: clientId should be some other number, because at this point 
        // if people go off and on again, the ids could be non-unique

        if (numClients == 0) {
            socket.username = data.username;
            socket.userId = roomNr;
            socket.room = data.room;
            socket.join(data.room);
            socket.emit('created_room', {
                socketId : socket.id,
                userId : socket.userId,
                room: data.room
            });
        
        } else if (numClients < maxClients) {
            socket.username = data.username;
            socket.userId = roomNr;
            socket.room = data.room;
            socket.join(data.room);

            // TODO: send the current version of the document ?
            socket.emit('joined_room', {
                socketId : socket.id,
                userId : socket.userId,
                room: data.room,
                connections : connections
            });

            socket.broadcast.to(data.room).emit('joined_user', {
                socketId : socket.id,
                userId : socket.userId,
                username : data.username,
                room : data.room
            });
        } 
    });

    socket.on('leave_room', function() {
        if (socket.room) {
            socket.leave(socket.room)
        }
    });

    socket.on('send_ice_candidate', function(message) {
        console.log("Ice request", message);
        var sock = rtc.getSocket(message.socketId);
        if (sock) {
            sock.emit('receive_ice_candidate', {
                label: message.label,
                candidate: message.candidate,
                socketId: socket.id
            });
        }
    });

    socket.on('send_offer', function(message) {
        console.log("Offer request", message);
        var sock = rtc.getSocket(message.socketId);
        if (sock) {
            sock.emit('receive_offer', {
                sdp: message.sdp,
                socketId: socket.id
            });
        }
    });

    socket.on('send_answer', function(message) {
        console.log("Answer request", message);
        var sock = rtc.getSocket(message.socketId);
        if (sock) {
            sock.emit('receive_answer', {
                sdp: message.sdp,
                socketId: socket.id
            });
        }
    });

    socket.on('disconnect', function(message) {
        console.log("Peer disconnected");

        var index = rtc.sockets.indexOf(socket);
        rtc.sockets.splice(index, 1);

        socket.broadcast.to(socket.room).emit('user_leaved', {
            socketId: socket.id,
            room: socket.room
        });

        socket.leave(socket.room);
    });
});

