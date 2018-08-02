/* jshint esversion: 6 */
"use strict";

var callBtn = document.querySelector('#call');
var forwardBtn = document.querySelector('#forward');
var stopBtn = document.querySelector('#stop');
var turnLeftBtn = document.querySelector('#turn_left');
var turnRightBtn = document.querySelector('#turn_right');

callBtn.addEventListener("click", event => {
  var call = peer.call("robot", new MediaStream());

  call.on('stream', stream => {
    document.querySelector('#player').srcObject = stream;
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
  console.log(err);
});

peer.on('open', id => {
  console.log('My peer ID is: ' + id);
});


// robot control
let rosbridge_url =
  // 'ws://raspi-ros00:9090/';
  'ws://pi-desktop:9090/';
  // 'ws://192.38.90.68:9090/';

var ros = new ROSLIB.Ros({
  url : rosbridge_url
});


ros.on('connection', function() {
  console.log('Connected to ', rosbridge_url);

  var teleop = new KEYBOARDTELEOP.Teleop({
    ros: ros,
    topic: '/cmd_vel'
  });

  // var cmd_vel = new ROSLIB.Topic({
  //   ros : ros,
  //   name : '/cmd_vel',
  //   messageType : 'geometry_msgs/Twist'
  // });
  //
  // var forwardMsg = new ROSLIB.Message({
  //   "linear": {
  //     "x": 1,
  //     "y": 0,
  //     "z": 0
  //   },
  //   "angular": {
  //     "x": 0,
  //     "y": 0,
  //     "z": 0
  //   }
  // });
  //
  // var stopMsg = new ROSLIB.Message({
  //   "linear": {
  //     "x": 0,
  //     "y": 0,
  //     "z": 0
  //   },
  //   "angular": {
  //     "x": 0,
  //     "y": 0,
  //     "z": 0
  //   }
  // });
  //
  // var turnLeftMsg = new ROSLIB.Message({
  //   "linear": {
  //     "x": 0,
  //     "y": 0,
  //     "z": 0
  //   },
  //   "angular": {
  //     "x": 0,
  //     "y": 0,
  //     "z": 1
  //   }
  // });
  //
  // var turnRightMsg = new ROSLIB.Message({
  //   "linear": {
  //     "x": 0,
  //     "y": 0,
  //     "z": 0
  //   },
  //   "angular": {
  //     "x": 0,
  //     "y": 0,
  //     "z": -1
  //   }
  // });
  //
  //
  // // button robot control
  // forwardBtn.addEventListener("click", event => {
  //   cmd_vel.publish(forwardMsg);
  // });
  //
  // stopBtn.addEventListener("click", event => {
  //   cmd_vel.publish(stopMsg);
  // });
  //
  // turnLeftBtn.addEventListener("click", event => {
  //   cmd_vel.publish(turnLeftMsg);
  // });
  //
  // turnRightBtn.addEventListener("click", event => {
  //   cmd_vel.publish(turnRightMsg);
  // });
});

ros.on('error', function(error) {
  console.log('Error connecting to websocket server: ', error);
});
