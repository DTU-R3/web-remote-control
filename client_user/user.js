/* jshint esversion: 6 */
"use strict";

var callBtn = document.querySelector('#call');
var connectBtn = document.querySelector('#connect');

callBtn.addEventListener('click', event => {

  var call = peer.call(document.querySelector('#robotID').value, new MediaStream());

  call.on('stream', stream => {
    document.querySelector('#player').srcObject = stream;
  });
});

connectBtn.addEventListener('click', event => {

  var ros = new ROSLIB.Ros({
    url : document.querySelector('#robotAddress').value
  });

  ros.on('connection', function() {
    alert('Connected to ' + document.querySelector('#robotAddress').value);
    console.log('Connected to ', document.querySelector('#robotAddress').value);

    // add keyboard controls
    var teleop = new KEYBOARDTELEOP.Teleop({
      ros: ros,
      topic: '/cmd_vel'
    });
  });

  ros.on('error', function(error) {
    alert(error);
    console.log(error);
  });
});

let peer = new Peer('user' + Math.random().toString(36).substr(2, 5), {
  debug: 3,
  host: 'r3.man.dtu.dk',
  path: '/ws',
  port: 443,
  secure: true,
  config: {
    'iceServers': [{
      urls: 'stun:stun.l.google.com:19302' // free STUN server from google
    }]
  }
});

peer.on('error', err => {
  alert(err);
  console.log(err);
});

peer.on('open', id => {
  console.log('My peer ID is: ' + id);
});
