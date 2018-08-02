/* jshint esversion: 6 */
"use strict";

var loginBtn = document.querySelector('#login');
var loginIn = document.querySelector('#robotID');

navigator.mediaDevices.getUserMedia({ video: true, audio: true })
.then(function(stream) {
  loginBtn.addEventListener("click", event => {
    // connecting to peerJS signaling server
    let peer = new Peer(loginIn.value, {
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
      alert('Sucessfully logged in with ID ' + id);
      console.log('My peer ID is: ' + id);
    });

    peer.on('call', call => {
      call.answer(stream);
    });
  });
})
.catch(function(err) {
  console.log('GetUserMedia error:', err);
});
