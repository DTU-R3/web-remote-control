"use strict";
/* globals Mazemap, ROSLIB */

var robotPos_lngLatAlt= [];
var waypointArr_lngLatAlt = [];
var waypoints_number = 0;
var routeController;

var start_nav = false;

// Compus info
var change_campus = false;
var campus_id = 179;
var campus_lng = 12.58635645;
var campus_lat = 55.6617067;
var campus_zoom = 17;
var init_zlevel = 4;

// Specify robot to connect
var ros = new ROSLIB.Ros({
	url: window.parent.document.querySelector("#robotAddress").value,
});

// Initialise maze-map
var myMap = new Mazemap.Map({
	container: "map",
	// campuses: 179,
	center: {
		lng: campus_lng,
		lat: campus_lat,
	},
	zoom: campus_zoom,
	zLevel: init_zlevel,
	scrollZoom: true,
	doubleClickZoom: true,
	touchZoomRotate: true,
	zLevelControl: true
});

// When the map is loaded
myMap.on("load", () => {
	// Custmise route visual representation
	routeController = new Mazemap.RouteController(myMap, {
		routeLineColorPrimary: "#E52337",
		routeLineColorSecondary: "#888888",
	});
	
	// On ROS connected
	ros.on("connection", function() {
		console.log("Connected to websocket server.");
	});

	// On ROS error
	ros.on("error", function(error) {
		console.log("Error connecting to websocket server: ", error);
	});

	// On ROS closed
	ros.on("close", function() {
		console.log("Connection to websocket server closed.");
	});
	
	// Visual representation of robot
	var blueDot = new Mazemap.BlueDot({
		zLevel: init_zlevel,
		accuracyCircle: false,
		style: {
			"normal": {
				"blueDot": {
					"paint": {
						"circle-stroke-width": 1,
						"circle-radius": {
							"base": 1,
							"stops": [
								[5, 5],
								[5, 5],
							],
						},
					},
				},
			},
		},
	}).setLngLat({
		lng: robotPos_lngLatAlt[0],
		lat: robotPos_lngLatAlt[1],
	}).addTo(myMap);

	// GPS pose Subscriber
	var gpsSub = new ROSLIB.Topic({
		ros: ros,
		name: "/robot_gps_pose",
		messageType: "nav_msgs/Odometry",
	});	
	gpsSub.subscribe(function(message) {
		robotPos_lngLatAlt[0] = message.pose.pose.position.x;
		robotPos_lngLatAlt[1] = message.pose.pose.position.y;
		robotPos_lngLatAlt[2] = message.pose.pose.position.z;
		// TODO: Set height of the dot
		blueDot.setLngLat({
			lng: robotPos_lngLatAlt[0],
			lat: robotPos_lngLatAlt[1],
		});
		blueDot.setZLevel(AltitudetoZlevel(robotPos_lngLatAlt[2]));
	});
	
	// Waypoint reach Subscriber
	var reachSub = new ROSLIB.Topic({
		ros: ros,
		name: "/waypoint/reached",
		messageType: "std_msgs/Bool",
	});
	reachSub.subscribe(function(message) {
		if(message.data) {
			Next();
		}
	});
	
	// Campus id Subscriber
	var campusSub = new ROSLIB.Topic({
		ros: ros,
		name: "/mazemap/campusId",
		messageType: "std_msgs/Int32",
	});
	campusSub.subscribe(function(message) {
		Change_campus(message.data);
	});

	// Mouse click event
	myMap.on("click", onMapClick);
	// Mouse click event handler
	function onMapClick(e) {
		var zLevel = myMap.zLevel;
		waypointArr_lngLatAlt[0] = robotPos_lngLatAlt;
		waypointArr_lngLatAlt[waypoints_number + 1] = [e.lngLat.lng, e.lngLat.lat, ZleveltoAltitude(zLevel)];
		waypoints_number++;
		setRoute(waypointArr_lngLatAlt);
	}
});

function ZleveltoAltitude(z) {
	return z * 2.5;
}

function AltitudetoZlevel(alt) {
	return Math.floor(alt / 2.5);
}

function Change_campus(id) {
	// Read campus position
	var read = new XMLHttpRequest();
	var json_data;
	
	read.open("GET", "campus.json", true);
	read.onreadystatechange = function() {
		if (read.readyState != 4 || read.status != 200) {
			return;
		}
		json_data = JSON.parse(read.responseText);
		for (var i=0; i<json_data.Campus.length; i++) {
			if(json_data.Campus[i].CampusId == id) {
				campus_id = json_data.Campus[i].CampusId;
				campus_lng = json_data.Campus[i].lng;
				campus_lat = json_data.Campus[i].lat;
				campus_zoom = json_data.Campus[i].zoom;
				change_campus = true;
				break;
			}
		}
	};
	read.send(null);
	setTimeout(Change_campus_view, 1000);
}

function Change_campus_view() {
	// If do not need to change campus
	if (!change_campus) {
		alert("Campus ID not found!");
		return;
	}
	// Set map view
	myMap.flyTo({	
		center: {lng: campus_lng, lat: campus_lat},
		zoom: campus_zoom,
		speed: 3
	});
	change_campus = false
}


function setRoute(r_array) {
	routeController.clear(); // Clear existing route, if any
	Mazemap.Data.getRouteJSON({
			poiId: 270289,
		}, {
			poiId: 270325,
		})
		.then(function(geojson) {
			var route = geojson.features[0];
			route.geometry.coordinates = r_array;
			geojson.features[0] = route;
			routeController.setPath(geojson);
		});
}

// Web events
function Start_route() {
	start_nav = true;
	FwdThresPub(0.2);
	TurnThresPub(0.2);
	StatePub("RUNNING");
	WaypointPub(waypointArr_lngLatAlt[1]);
}

function Stop() {
	start_nav = false;
	StatePub("STOP");
}

function Clear() {
	waypointArr_lngLatAlt = [];
	waypoints_number = 0;
	routeController.clear();
}

function Next() {
	// Update the route
	waypointArr_lngLatAlt.splice(0, 1);
	waypoints_number--;
	if(waypointArr_lngLatAlt.length > 1) {
		setRoute(waypointArr_lngLatAlt);
		WaypointPub(waypointArr_lngLatAlt[1]);
	}
	else {
		Stop();
		Clear();
	}
}

function Change() {
	var campus_id = document.querySelector('#campusId').value;
	Change_campus(parseInt(campus_id));
}

// ROS publishers
function StatePub(str) {
	var pub = new ROSLIB.Topic({
		ros: ros,
		name: "/waypoint/state",
		messageType: "std_msgs/String",
	});
	var msg = new ROSLIB.Message({
		data: str,
	});
	pub.publish(msg);
}

function WaypointPub(p) {
	var pub = new ROSLIB.Topic({
		ros: ros,
		name: "/waypoint",
		messageType: "sensor_msgs/NavSatFix",
	});
	var msg = new ROSLIB.Message({
		longitude: p[0],
		latitude: p[1],
		altitude: p[2],
	});
	pub.publish(msg);
}

function FwdThresPub(f) {
	var pub = new ROSLIB.Topic({
		ros: ros,
		name: "/waypoint/forwarding_thres",
		messageType: "std_msgs/Float32",
	});
	var msg = new ROSLIB.Message({
		data: f
	});
	pub.publish(msg);
}

function TurnThresPub(f) {
	var pub = new ROSLIB.Topic({
		ros: ros,
		name: "/waypoint/turning_thres",
		messageType: "std_msgs/Float32",
	});
	var msg = new ROSLIB.Message({
		data: f
	});
	pub.publish(msg);
}
