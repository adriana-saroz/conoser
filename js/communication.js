
// TODO: comment this file!!

var rtc = {};

rtc.constraints = {video : true, audio : true};

rtc.config = {
    "optional": [
        { "RtpDataChannels": true },
        { "DtlsSrtpKeyAgreement": true }
    ]
};

rtc.sdpConstraints = {
    "optional": [],
    'mandatory': {
        'OfferToReceiveAudio': true,
        'OfferToReceiveVideo': true
    }
};

rtc.ownId = null;
rtc.connections = [];
rtc.peerConnections = {};
rtc.dataChannels = {};

rtc.localStream = null;
rtc.isLeader = false;

// var room = location.pathname.substring(1);
// if (room === '') {
//     room = 'foo';
// }

var socket = io.connect();
socket.on('full_room', function (data){
    console.log('Room ' + data.room + ' is full');
});

socket.on('created_room', function (data){
    console.log('Created room ' + data.room + ". My id is " + data.socketId);
    rtc.ownId = data.socketId;
    WOOT.setId(data.userId);
    rtc.isLeader = true;
    // WebRTC.UserMedia(rtc.constraints, onUserMediaSuccess, onUserMediaError);
});

socket.on('joined_room', function (data){
    console.log('Joined room ' + data.room + ". My id is " + data.socketId);
    console.log('Current users: ' + data.connections);

    rtc.ownId = data.socketId;
    WOOT.setId(data.userId); 

    rtc.connections = data.connections;
    rtc.connectToPeers();
    // WebRTC.UserMedia(rtc.constraints, onUserMediaSuccess, onUserMediaError);
});

socket.on('joined_user', function (data){
    console.log('User (' + data.socketId + ", " + data.username + ") joined room " + data.room);
    rtc.connections.push({
        id : data.socketId,
        username : data.username,
        userId : data.userId
    });
    rtc.createPeerConnection(data.socketId);
    rtc.addStream(data.socketId);
});

socket.on('user_leaved', function (data) {
    console.log('user leaved', data);
    var id = data.socketId;
    rtc.removeClient(id);
});

socket.on('receive_ice_candidate', function (data) {
    // console.log('Received ice candidate:', data);
    var candidate = new WebRTC.IceCandidate({
            sdpMLineIndex:data.label,
            candidate:data.candidate,
        });

    var pc = rtc.peerConnections[data.socketId];
    pc.addIceCandidate(candidate);
});

socket.on('receive_offer', function (data) {
    console.log('Received offer:', data);
    rtc.sendAnswer(data.socketId, data.sdp);
});

socket.on('receive_answer', function (data) {
    console.log('Received answer:', data);
    var pc = rtc.peerConnections[data.socketId];
    pc.setRemoteDescription(new WebRTC.SessionDescription(data.sdp));
});

rtc.sendToServer = function(type, data) {
    console.log('Sending message:', type, data);
    socket.emit(type, data);
}

rtc.connect = function(room, username) {
    rtc.room = room;
    if (rtc.room === '') {
        rtc.room = 'foo';
    }
    rtc.username = username;

    var onUserMediaSuccess = function(stream) {
        console.log('User media obtained');
        rtc.localStream = stream;
        localVideo = addVideo(0);
        WebRTC.attachMediaStream(localVideo, stream);

        // TODO: make connections before local stream is attached ? 

        rtc.sendToServer ('join_room', {
            room : room,
            username : rtc.username
        });
    };

    var onUserMediaError = function(error) {
        console.log('Error obtaining user media: ' + error);
    };

    WebRTC.UserMedia(rtc.constraints, onUserMediaSuccess, onUserMediaError);
    
    // rtc.sendToServer ('join_room', {
    //     room : room,
    //     username : username
    // });
}

rtc.broadcastMessage = function(message) {
    console.log("Broadcasting to connected Peers", message);
    for (var id in rtc.dataChannels) {
        var channel = rtc.dataChannels[id];
        var stringified = JSON.stringify(message);
        channel.send(stringified);
    }
}

rtc.connectToPeers = function() {
    for (var i = 0; i < rtc.connections.length; i++) {
        var connectionId = rtc.connections[i].id;
        rtc.createPeerConnection(connectionId);
        rtc.addStream(connectionId);
        rtc.createDataChannel(connectionId);
        rtc.sendOffer(connectionId);
    }
}

rtc.createPeerConnection = function(id) {
    var pc = rtc.peerConnections[id] = new WebRTC.PeerConnection(WebRTC.Server, rtc.config);

    console.log('Created RTCPeerConnnection with:\n' +
          '  config: \'' + JSON.stringify(WebRTC.Server) + '\';\n' +
          '  constraints: \'' + JSON.stringify(rtc.config) + '\'.');
    
    pc.onicecandidate = function(event) {
        console.log('ice candidate received');
        if (event.candidate) {
            rtc.sendToServer('send_ice_candidate', {
                    label: event.candidate.sdpMLineIndex,
                    // id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    socketId: id
                }
            );
        }
    };
    
    pc.onaddstream = function(event) {
        console.log("Adding remote stream");
        var video = addVideo(id);
        WebRTC.attachMediaStream(video, event.stream);
    };
    
    pc.onremovestream = function(event) {
        console.log("removed stream");
        removeVideo(id);
    };

    pc.ondatachannel = function(event) {
        console.log('data channel connecting ' + id);
        rtc.addDataChannelEvents(id, event.channel);
    };
    return pc;
};

rtc.addStream = function(id) {
    var pc = rtc.peerConnections[id];
    if (rtc.localStream) {
        pc.addStream(rtc.localStream);
    }
}

rtc.createDataChannel = function(id) {
    var options = {
        reliable: true
    };
    label = 'woot';

    var pc = rtc.peerConnections[id];

    try {
        console.log('Tyring to open data channel');
        var channel = pc.createDataChannel(label, options);
        rtc.addDataChannelEvents(id, channel);
    } catch (error) {
        console.log('DataChannel is NOT actually supported!');
    }
}

rtc.addDataChannelEvents = function(id, channel) {

    channel.onopen = function() {
        console.log('data channel opened ' + id);
        if (rtc.isLeader) {
            var message = {
                type: 'init',
                sequence: WOOT.sequence.elements
            };
            var stringified = JSON.stringify(message);
            channel.send(stringified);


            var selectedLanguage = $('#selected-language').attr("language");
            var selectedId = $('#selected-language').attr("language-id");
            message = {
                type: 'syntax',
                language_id: selectedId,
                language_name: selectedLanguage
            }
            stringified = JSON.stringify(message);
            channel.send(stringified);
        }
    };

    channel.onclose = function(event) {

    };

    channel.onmessage = function(message) {

        console.log("Message Data ", message);
        var data = JSON.parse(message.data);
        
        if (data.type === 'syntax') {
            conoser.updateSyntax(data.language_id, data.language_name);        
        
        } else {
            WOOT.reception(data);
        }
    };

    channel.onerror = function(err) {
        console.log('data channel error ' + id);
    };

    rtc.dataChannels[id] = channel;
}

rtc.sendOffer = function(id) {

    var onOfferCreatedCallback = function (sessionDescription) {
        sessionDescription.sdp = preferOpus(sessionDescription.sdp);
        var pc = rtc.peerConnections[id];
        pc.setLocalDescription(sessionDescription);

        rtc.sendToServer('send_offer', {
            sdp: sessionDescription,
            socketId: id
        });
    }

    console.log('Sending offer to peer, with constraints: ' + JSON.stringify(rtc.sdpConstraints));

    var pc = rtc.peerConnections[id];
    pc.createOffer(onOfferCreatedCallback, null, rtc.sdpConstraints);
};

rtc.sendAnswer = function(id, sdp) {

    var onAnswerCreatedCallback = function (sessionDescription) {
        var pc = rtc.peerConnections[id];
        pc.setLocalDescription(sessionDescription);
        rtc.sendToServer('send_answer', {
            sdp: sessionDescription,
            socketId: id
        });
    }

    console.log('Sending answer to peer, with constraints: ' + JSON.stringify(rtc.sdpConstraints));

    var pc = rtc.peerConnections[id];
    pc.setRemoteDescription(new WebRTC.SessionDescription(sdp));
    pc.createAnswer(onAnswerCreatedCallback, null, rtc.sdpConstraints);
}

rtc.removeClient = function(id) {

    var findLeader = function () {
        var lead = true;
        var myId = WOOT.siteId;
        for (var i = 0; i < rtc.connections.length; i++) {
            if (rtc.connections[i].userId < myId) {
                lead = false;
                break;
            }
        }
        if (lead) {
            rtc.isLeader = true;
        }
    }

    rtc.peerConnections[id].close();

    delete rtc.peerConnections[id];
    delete rtc.dataChannels[id];

    for (var i = 0; i < rtc.connections.length; i++) {
        if (rtc.connections[i].id === id) {
            rtc.connections.splice(i, 1);
            break;
        }
    }
    removeVideo(id);
    findLeader();
}

// UI related functions

var videos = [];

function addVideo(id, muted) {
    muted = typeof(muted) == 'undefined' ? false : muted;
    var video = $('<video />');
    video.prop('id', 'remote-video-' + id);
    video.prop('class', 'thumbnail span6');
    
    if (muted) {
        video.prop('muted', true);
    }

    $('#video-container').append(video);
    videos.push(video[0]);
    return video[0];
}

function removeVideo(id) {
    var video = $('#remote-video-' + id);
    if (video.length) {
        videos.splice(videos.indexOf(video[0]), 1);
        video[0].parentNode.removeChild(video[0]);
    }
}

// Helper functions

function preferOpus(sdp) {
  var sdpLines = sdp.split('\r\n');
  var mLineIndex = null;
  // Search for m line.
  for (var i = 0; i < sdpLines.length; i++) {
    if (sdpLines[i].search('m=audio') !== -1) {
      mLineIndex = i;
      break;
    }
  }
  if (mLineIndex === null) return sdp;

  // If Opus is available, set it as the default in m line.
  for (var j = 0; j < sdpLines.length; j++) {
    if (sdpLines[j].search('opus/48000') !== -1) {
      var opusPayload = extractSdp(sdpLines[j], /:(\d+) opus\/48000/i);
      if (opusPayload) sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], opusPayload);
      break;
    }
  }

  // Remove CN in m line and sdp.
  sdpLines = removeCN(sdpLines, mLineIndex);

  sdp = sdpLines.join('\r\n');
  return sdp;
}

function extractSdp(sdpLine, pattern) {
  var result = sdpLine.match(pattern);
  return (result && result.length == 2) ? result[1] : null;
}

function setDefaultCodec(mLine, payload) {
  var elements = mLine.split(' ');
  var newLine = [];
  var index = 0;
  for (var i = 0; i < elements.length; i++) {
    if (index === 3) // Format of media starts from the fourth.
    newLine[index++] = payload; // Put target payload to the first.
    if (elements[i] !== payload) newLine[index++] = elements[i];
  }
  return newLine.join(' ');
}

function removeCN(sdpLines, mLineIndex) {
  var mLineElements = sdpLines[mLineIndex].split(' ');
  // Scan from end for the convenience of removing an item.
  for (var i = sdpLines.length - 1; i >= 0; i--) {
    var payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
    if (payload) {
      var cnPos = mLineElements.indexOf(payload);
      if (cnPos !== -1) {
        // Remove CN payload from m line.
        mLineElements.splice(cnPos, 1);
      }
      // Remove CN line in sdp
      sdpLines.splice(i, 1);
    }
  }

  sdpLines[mLineIndex] = mLineElements.join(' ');
  return sdpLines;
}

