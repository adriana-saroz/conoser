var WebRTC = {};

WebRTC.DetectedBrowser = null;

WebRTC.Server = null;

// Get UserMedia (only difference is the prefix).
WebRTC.UserMedia = null;

// The RTCPeerConnection object.
WebRTC.PeerConnection = null;

// The RTCSessionDescription object.
WebRTC.SessionDescription = null;

// The RTCIceCandidate object.
WebRTC.IceCandidate = null;

WebRTC.attachMediaStream = null;
WebRTC.reattachMediaStream = null;

if (navigator.mozGetUserMedia) {
    console.log("The user agent is Firefox");

    WebRTC.DetectedBrowser = "firefox";

    WebRTC.Server = {'iceServers': [{'url':'stun:23.21.150.121'}]};

    WebRTC.PeerConnection = window.mozRTCPeerConnection;

    WebRTC.UserMedia = navigator.mozGetUserMedia.bind(navigator);

    WebRTC.SessionDescription = window.mozRTCSessionDescription;

    WebRTC.IceCandidate = window.mozRTCIceCandidate;

    WebRTC.attachMediaStream = function(element, stream) {
        element.mozSrcObject = stream;
        element.play();
    };

    WebRTC.reattachMediaStream = function(to, from) {
        to.mozSrcObject = from.mozSrcObject;
        to.play();
    };

    // Fake get{Video,Audio}Tracks
    MediaStream.prototype.getVideoTracks = function() {
        return [];
    };

    MediaStream.prototype.getAudioTracks = function() {
        return [];
    };

} else if (navigator.webkitGetUserMedia) {
    console.log("The user agent is Chrome");

    WebRTC.DetectedBrowser = "chrome";
 
    WebRTC.Server = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};

    WebRTC.UserMedia = navigator.webkitGetUserMedia.bind(navigator);
 
    WebRTC.PeerConnection = window.webkitRTCPeerConnection;

    WebRTC.SessionDescription = window.RTCSessionDescription;

    WebRTC.IceCandidate = window.RTCIceCandidate;

    WebRTC.attachMediaStream = function(element, stream) {
        element.src = webkitURL.createObjectURL(stream);
    };

    WebRTC.reattachMediaStream = function(to, from) {
        to.src = from.src;
    };

    //The representation of tracks in a stream is changed in M26.
    // Unify them for earlier Chrome versions in the coexisting period.
    if (!webkitMediaStream.prototype.getVideoTracks) {
        webkitMediaStream.prototype.getVideoTracks = function() {
            return this.videoTracks;
        };
        webkitMediaStream.prototype.getAudioTracks = function() {
            return this.audioTracks;
        };
    }

    // New syntax of getXXXStreams method in M26.
    if (!webkitRTCPeerConnection.prototype.getLocalStreams) {
        webkitRTCPeerConnection.prototype.getLocalStreams = function() {
            return this.localStreams;
        };
        webkitRTCPeerConnection.prototype.getRemoteStreams = function() {
            return this.remoteStreams;
        };
    }

} else {
    console.log("The user agent does not support WebRTC");
}
