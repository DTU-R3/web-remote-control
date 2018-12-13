/* jshint esversion: 6 */
"use strict";

let callBtn = document.querySelector('#call');
let call2dBtn = document.querySelector('#call2d');
let setMapBtn = document.querySelector('#SetMap');
let robotAddressInput = document.querySelector('#robotAddress');
let robotAddressList = document.querySelector('#robotAddressList');
let connectBtn = document.querySelector('#connect');
let disconnectBtn = document.querySelector('#disconnect');
let playerDiv = document.querySelector('#aframe');
let mapDiv = document.querySelector('#map');


let ros = new ROSLIB.Ros;

let connectionTimeoutHandle;
const connectionTimeoutValue = 3000; // ms



ros.on('connection', () => {
	console.log('Connected to ', document.querySelector('#robotAddress').value);

	clearTimeout(connectionTimeoutHandle);

	// add keyboard controls
	let teleop = new KEYBOARDTELEOP.Teleop({
		ros: ros,
		topic: '/cmd_vel',
	});

	// open map
	let mapObject = document.createElement('object');
	mapObject.innerHTML = 'Warning: Map could not be included.';
	mapObject.className = 'fullheight';
	mapObject.setAttribute('id', 'mapobject');
	mapObject.setAttribute('data', '../map/index.html');

	mapDiv.appendChild(mapObject);
});

ros.on('close', () => {
	mapDiv.innerHTML = '';

	robotAddressInput.disabled = false;
	robotAddressInput.value = '';
	connectBtn.disabled = false;
	disconnectBtn.disabled = true;
});

ros.on('error', error => {
	alert('Cannot connect to ' + robotAddressInput.value);
	console.log('Cannot connect to ' + robotAddressInput.value, error);

	robotAddressInput.disabled = false;
	connectBtn.disabled = false;
	disconnectBtn.disabled = true;
});

connectBtn.addEventListener('click', event => {
	ros.connect(robotAddressInput.value);

	connectionTimeoutHandle = setTimeout(function () { ros.close(); }, connectionTimeoutValue);

	robotAddressInput.disabled = true;
	connectBtn.disabled = true;
	disconnectBtn.disabled = false;
});

disconnectBtn.addEventListener('click', event => {
	ros.close();
});

callBtn.addEventListener('click', event => {

	callBtn.disabled = true;
	call2dBtn.disabled = true;

	playerDiv.innerHTML =
	'<a-scene embedded> \
		<a-videosphere src="#player" rotation="0 -90 -35"></a-videosphere> \
		<a-camera user-height="0"></a-camera> \
		<a-assets> \
			<video id="player" autoplay="autoplay"></video> \
		</a-assets> \
	</a-scene>';

	let call = peer.call(document.querySelector('#robotID').value, new MediaStream());

	call.on('stream', stream => {
		document.querySelector('#player').srcObject = stream;
	});
});

call2dBtn.addEventListener('click', event => {

	callBtn.disabled = true;
	call2dBtn.disabled = true;

	playerDiv.innerHTML = '<video id="player" autoplay="autoplay"></video>';

	let call = peer.call(document.querySelector('#robotID').value, new MediaStream());

	call.on('stream', stream => {
		document.querySelector('#player').srcObject = stream;
	});
});

setMapBtn.addEventListener('click', event => {
	document.querySelector('#aframe').style.width = document.querySelector('#VideoSize').value + '%';
	document.querySelector('#aframe').style.height = '100%';
	document.querySelector('#map').style.width = (100 - parseInt(document.querySelector('#VideoSize').value)) + '%';
	document.querySelector('#map').style.height = '100%';
});

let peer = new Peer('user' + Math.random().toString(36).substr(2, 5), {
	debug: 3,
	host: 'r3.man.dtu.dk',
	path: '/ws',
	port: 443,
	secure: true,
	config: {
		'iceServers': [{
			urls: 'stun:stun.l.google.com:19302', // free STUN server from google
		}],
	},
});

peer.on('error', err => {
	alert(err);
	console.log(err);
});

peer.on('open', id => {
	console.log('My peer ID is: ' + id);
});

// add options to the robot address list
let robotAddressArray = [
	'raspi-ros00',
	'raspi-ros01',
	'raspi-ros02',
	'raspi-ros03',
	'alex-raspi-ros',
];

let robotAddressPrefix = 'wss://' + window.location.host + '/ros/';

for (let i = 0; i < robotAddressArray.length; i++) {
	let opt = document.createElement('option');
	opt.value = robotAddressPrefix + robotAddressArray[i] + '/';
	robotAddressList.appendChild(opt);
}
