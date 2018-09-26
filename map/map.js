"use strict";
/* globals Mazemap, ROSLIB */

// Waypoint control
var robotPos_lngLatAlt= [];
var waypointArr_lngLatAlt = [];
var waypoints_number = 0;
var routeController;
var highlighter;

// Geo fencing
var geofencingEnabled = true;
var poi_data;
var allowed_areas = [];

// Compus info
var change_campus = false;
var campus_zoom = 17;
/* Alexandra Institue
var campus_id = 179;
var campus_lng = 12.58635645;
var campus_lat = 55.6617067;
var init_zlevel = 4;
*/
/* DTU Management */
var campus_id = 89;
var campus_lng = 12.514221376888127;
var campus_lat = 55.78268545984302;
var init_zlevel = 3;

// Specify robot to connect
var ros = new ROSLIB.Ros({
	url: window.parent.document.querySelector("#robotAddress").value,
});

// Initialise maze-map
var myMap = new Mazemap.Map({
	container: "map",
	campuses: campus_id,
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
		routeLineColorSecondary: "#E52337",
	});

	// Highlighter
	highlighter = new Mazemap.Highlighter( myMap, {
		showOutline: false,
		showFill: true,
		fillColor: Mazemap.Util.Colors.MazeColors.MazeGreen,
	});
	
	// Get geo_fencing areas	
	Get_fencing();
	
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
	
	var redDot = new Mazemap.BlueDot({
		zLevel: init_zlevel,
		radius: 1,
		accuracyCircle: false,
		fillColor: Mazemap.Util.Colors.MazeColors.MazeRed,
		style: {
			"normal": {
				"blueDot": {
					"paint": {
						"circle-stroke-width": 1,
						"circle-radius": {
							"base": 1,
							"stops": [
								[3, 3],
								[3, 3],
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
		blueDot.setLngLat({
			lng: robotPos_lngLatAlt[0],
			lat: robotPos_lngLatAlt[1],
		});
		blueDot.setZLevel(AltitudetoZlevel(robotPos_lngLatAlt[2]));
	});
	
	// Prediction Subscriber
	var predictSub = new ROSLIB.Topic({
		ros: ros,
		name: "/robot_predict_pose",
		messageType: "nav_msgs/Odometry",
	});	
	predictSub.subscribe(function(message) {
		var predictLng = message.pose.pose.position.x;
		var predictLat = message.pose.pose.position.y;
		var predictAlt = message.pose.pose.position.z;
		
		redDot.setLngLat({
			lng: predictLng,
			lat: predictLat,
		});
		redDot.setZLevel(AltitudetoZlevel(predictAlt));
		
		Mazemap.Data.getPoiAt({
				lng: predictLng,
				lat: predictLat,
			}, AltitudetoZlevel(predictAlt)).then(poi => {
			if (!Area_allowed(poi.properties.id)) {
				Stop();
				ClearVelPub();
				alert('Heading to restricted area');
			}
		}).catch(function () {
			return false;
		});
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
		Mazemap.Data.getPoiAt(e.lngLat, zLevel).then(poi => {
			if (!Area_allowed(poi.properties.id)) {
				alert('Waypoint is not allowed in that area');
				return;
			} else {
				waypointArr_lngLatAlt[0] = robotPos_lngLatAlt;
				waypointArr_lngLatAlt[waypoints_number + 1] = [e.lngLat.lng, e.lngLat.lat, ZleveltoAltitude(zLevel)];
				waypoints_number++;
				setRoute(waypointArr_lngLatAlt);
			}
		}).catch(function () {
			return false;
		});
	}
});

function ZleveltoAltitude(z) {
	return z * 2.5;
}

function AltitudetoZlevel(alt) {
	return Math.floor(alt / 2.5);
}

function Area_allowed(poiId) {
	if (geofencingEnabled) {
		return allowed_areas.includes(poiId);
	} else {
		return true;
	}
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

function Get_fencing() {
	// Read fencing areas
	var read = new XMLHttpRequest();
	read.open("GET", "pois.json", true);
	read.onreadystatechange = function() {
		if (read.readyState != 4 || read.status != 200) {
			return;
		}
		poi_data = JSON.parse(read.responseText);
		for(var i=0; i<poi_data.length; i++) {
			allowed_areas[i] = poi_data[i].properties.poiId;
		}
		highlighter.highlight(poi_data);
	};
	read.send(null);
}

function setRoute(r_array) {
	routeController.clear(); // Clear existing route, if any
	Mazemap.Data.getRouteJSON({
			poiId: 270303,
		}, {
			poiId: 270326,
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
	FwdThresPub(0.2);
	TurnThresPub(0.2);
	StatePub("RUNNING");
	WaypointPub(waypointArr_lngLatAlt[1]);
}

function Stop() {
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

function ClearVelPub() {
	var pub = new ROSLIB.Topic({
		ros: ros,
		name: "/cmd_vel",
		messageType: "geometry_msgs/Twist",
	});
	var msg = new ROSLIB.Message({
		linear: {
			x: 0,
			y: 0,
			z: 0
		},
		angular: {
			x: 0,
			y: 0,
			z: 0
		}
	});
	pub.publish(msg);
}
