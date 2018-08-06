/* jshint esversion: 6 */
"use strict";

var callBtn = document.querySelector('#call');
var connectBtn = document.querySelector('#connect');
let mapDiv = document.querySelector('#map');

let ros = new ROSLIB.Ros;

let reconnect = false;

ros.on('connection', () => {
  console.log('Connected to ', document.querySelector('#robotAddress').value);

  // add keyboard controls
  var teleop = new KEYBOARDTELEOP.Teleop({
    ros: ros,
    topic: '/cmd_vel'
  });

  // open map
  let mapObject = document.createElement('object');
  mapObject.innerHTML = 'Warning: Map could not be included.';
  mapObject.className = 'fullheight';
  mapObject.setAttribute('id', 'mapobject');
  mapObject.setAttribute('data', '../r3-geofencing/Ros.html');

  mapDiv.appendChild(mapObject);
});

ros.on('close', () => {
    mapDiv.innerHTML = '';

    if (reconnect) {
      ros.connect(document.querySelector('#robotAddress').value);
      reconnect = false;
    }
});

ros.on('error', error => {
  alert('Can\'t connect to ' + document.querySelector('#robotAddress').value);
  console.log('Can\'t connect to ' + document.querySelector('#robotAddress').value, error);
});


callBtn.addEventListener('click', event => {

  var call = peer.call(document.querySelector('#robotID').value, new MediaStream());

  call.on('stream', stream => {
    document.querySelector('#player').srcObject = stream;
  });
});

connectBtn.addEventListener('click', event => {
  if (ros.isConnected) {
    reconnect = true;
    ros.close();
  }
  else {
    ros.connect(document.querySelector('#robotAddress').value);
  }
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
