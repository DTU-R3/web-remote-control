/* jshint esversion: 6 */
"use strict";

var callBtn = document.querySelector('#call');

callBtn.addEventListener("click", event => {
  var call = peer.call("robot", new MediaStream());

  call.on('stream', stream => {
    document.querySelector('#player').srcObject = stream;
  });
});

let peer = new Peer('user', {
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
  console.log(err);
});

peer.on('open', id => {
  console.log('My peer ID is: ' + id);
});
