"use strict";
/* globals Mazemap, ROSLIB */

var geofencingEnabled = false;
var data_ready = false;
var list_ready = false;

var data;
get_data();

/*
var myMap = new Mazemap.Map({
	container: 'map',
	campuses: 89,
	center: {
		lng: 12.514221376888127,
		lat: 55.78268545984302,
	},
	zoom: 17,
	zLevel: 3,
	scrollZoom: true,
	doubleClickZoom: false,
	touchZoomRotate: false,
});
*/

var myMap = new Mazemap.Map({
	container: 'map',
	campuses: 179,
	center: {
		lng: 12.58635645,
		lat: 55.6617067,
	},
	zoom: 17,
	zLevel: 4,
	scrollZoom: true,
	doubleClickZoom: false,
	touchZoomRotate: false,
});


//Gobal variables:
var Lng_waypoint_arr = [];
var Lat_waypoint_arr = [];
var route_array = [];
var n = 0;
var i = 0;
var routeController;
var featuresArray2 = [];
var allowed_list = [];
var etage = 1;

function allowedArea(poiId) {
	/*
	if (!geofencingEnabled) {
		return allowed_list.includes(poiId);
	} else {
		return true;
	} */
	return true;
}

var ros = new ROSLIB.Ros({
	url: window.parent.document.querySelector('#robotAddress').value,
});

if (list_ready) {
	// Add a layer for putting room json data with custom coloring
	addCustomLayer();
	// Read excel file and draw the rooms
	drawFeatures(featuresArray2);
}

myMap.on('load', () => {
	// MazeMap ready
	if (list_ready) {
		// Add a layer for putting room json data with custom coloring
		addCustomLayer();
		// Read excel file and draw the rooms
		drawFeatures(featuresArray2);
	}

	routeController = new Mazemap.RouteController(myMap, {
		routeLineColorPrimary: '#E52337',
		routeLineColorSecondary: '#888888',
	});

	setTimeout(function() {
		if (data == null) {
			data = {
				pois: {
					"poiIds": [],
				},
			};
		}
	}, 1000);

	ros.on('connection', function() {
		console.log('Connected to websocket server.');

		/*var stop_waypoint = new ROSLIB.Topic({
			ros : ros,
			name : '/waypoint/state',
			messageType : 'std_msgs/String'
		});

		var stop1 = new ROSLIB.Message({
			data: 'STOP'
		});
		stop_waypoint.publish(stop1);

		var stop = new ROSLIB.Topic({
			ros : ros,
			name : '/odometry_control/state',
			messageType : 'std_msgs/String'
		});
		stop.publish(stop1);*/
	});

	ros.on('error', function(error) {
		console.log('Error connecting to websocket server: ', error);
	});

	ros.on('close', function() {
		console.log('Connection to websocket server closed.');
	});

	var listener = new ROSLIB.Topic({
		ros: ros,
		name: '/robot_gps_pose',
		messageType: 'nav_msgs/Odometry',
	});


	var robot_lat;
	var robot_lng;

	var blueDot = new Mazemap.BlueDot({
		zLevel: etage,
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
		lng: robot_lng,
		lat: robot_lat,
	}).addTo(myMap);

	var greenDot = new Mazemap.BlueDot({
		zLevel: etage,
		radius: 1,
		accuracyCircle: false,
		fillColor: Mazemap.Util.Colors.MazeColors.MazeGreen,
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
		lng: 12,
		lat: 55
	}).addTo(myMap);

	listener.subscribe(function(message) {
		route_array[0] = [robot_lng, robot_lat];
		if (!start_flag) {
			if (i < 2) {
				i++;
				return;
			}
			i = 0;
		}

		robot_lat = message.pose.pose.position.y;
		robot_lng = message.pose.pose.position.x;
		check_dist(robot_lng, robot_lat);
		//setRoute(route_array);
		//console.log(JSON.stringify(message.pose.pose.position));

		blueDot.setLngLat({
			lng: robot_lng,
			lat: robot_lat,
		});

		var future = predict(robot_lng, robot_lat);
		var zLevel_robot = myMap.zLevel;

		if (future) {
			greenDot.setLngLat({
				lng: future[0],
				lat: future[1],
			});

			Mazemap.Data.getPoiAt({
				lng: future[0],
				lat: future[1],
			}, zLevel_robot).then(poi_robot => {
				if (!allowedArea(poi_robot.properties.id)) {
					Stop();
					console.log('Robot in restricted area');
				}

			}).catch(function() {
				return false;
			});
		}
	});

	myMap.on('click', onMapClick);

	function onMapClick(e) {

		var lngLat = e.lngLat;
		var zLevel = myMap.zLevel;

		Mazemap.Data.getPoiAt(lngLat, zLevel).then(poi => {

			if (allowedArea(poi.properties.id)) {
				Lng_waypoint_arr[n] = e.lngLat.lng;
				Lat_waypoint_arr[n] = e.lngLat.lat;
				route_array[n + 1] = [e.lngLat.lng, e.lngLat.lat];
				n++;
				setRoute(route_array);
			} else {
				alert('Waypoint is not allowed in that area');
			}

		}).catch(function () {
			return false;
		});
	}
});

function get_data() {
	var read = new XMLHttpRequest();
	var data_x;
	read.open("GET", "../data/test.json", true);
	read.onreadystatechange = function() {
		if (read.readyState != 4 || read.status != 200) {
			return;
		}
		// alert("Success: " + read.responseText);
		//TODO: sanitise data, handle exceptions
		data_x = JSON.parse(read.responseText);
		data = data_x;
		data_ready = true;
		console.log(data);

		allowed_list = data.pois.poiIds;
		var i;
		var n = allowed_list.length;

		for (i = 0; i < n; i++) {
			Mazemap.Data.getPoi(allowed_list[i]).then(poipoi => {
				featuresArray2.push(poipoi);
			});
		}
		console.log(featuresArray2);
		list_ready = true;
	};
	read.send(null);
}

var start_flag = false;

function Start_route() {
	start_flag = true;

	var thres_set = new ROSLIB.Topic({
		ros: ros,
		name: '/waypoint/forwarding_thres',
		messageType: 'std_msgs/Float32',
	});

	var threshold = new ROSLIB.Message({
		data: 0.15
	});
	thres_set.publish(threshold);

	var turn_set = new ROSLIB.Topic({
		ros: ros,
		name: '/waypoint/turning_thres',
		messageType: 'std_msgs/Float32',
	});

	var thresh = new ROSLIB.Message({
		data: 0.2
	});
	turn_set.publish(thresh);

	var waypoint_set = new ROSLIB.Topic({
		ros: ros,
		name: '/waypoint',
		messageType: 'sensor_msgs/NavSatFix',
	});

	console.log(Lng_waypoint_arr);
	var Geo_point = new ROSLIB.Message({
		longitude: Lng_waypoint_arr[v],
		latitude: Lat_waypoint_arr[v],
		altitude: 8.01000022888184,
	});
	waypoint_set.publish(Geo_point);

	var run_waypoint = new ROSLIB.Topic({
		ros: ros,
		name: '/waypoint/state',
		messageType: 'std_msgs/String',
	});

	var run_way_data = new ROSLIB.Message({
		data: 'RUNNING',
	});
	run_waypoint.publish(run_way_data);
	console.log("go");
}

function Stop() {
	var stop_waypoint = new ROSLIB.Topic({
		ros: ros,
		name: '/waypoint/state',
		messageType: 'std_msgs/String',
	});

	var stop1 = new ROSLIB.Message({
		data: 'STOP',
	});
	stop_waypoint.publish(stop1);
	console.log("stop");
}

function Clear() {
	n = 0;
	i = 0;
	v = 0;
	start_flag = false;
	Lng_waypoint_arr = [];
	Lat_waypoint_arr = [];
	route_array = [];
	routeController.clear();
}

function Next() {
	v++;
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
			//var bounds = Mazemap.Util.Turf.bbox(geojson);
			//myMap.fitBounds( bounds, {padding: 10} );
		});
}

var lng_old = 0;
var lat_old = 0;
var lng_speed = 0;
var lat_speed = 0;
var inc = 0;
var dt = 18;
var predicted = [];

function predict(robot_lng, robot_lat) {
	if (lng_old == 0 || lat_old == 0) {
		lng_old = robot_lng;
		lat_old = robot_lat;
		return;
	}
	for (inc = 0; inc < 1; inc++) {
		lng_speed = robot_lng - lng_old;
		lat_speed = robot_lat - lat_old;
	}
	predicted = [
		[robot_lng + lng_speed * dt],
		[robot_lat + lat_speed * dt],
	];
	lng_old = robot_lng;
	lat_old = robot_lat;

	return (predicted);
}

var v = 0;

function check_dist(lng1, lat1) {
	var a = 0;
	var c = 0;
	var d = 0;
	var R = 6371e3; //avrage radius of earth in meters
	var pi = Math.PI;
	if (route_array.length >= 2) {
		//console.log(route_array.length);
		var temp = route_array[1];
		var temp_arr = [];
		var lng2 = temp[0];
		var lat2 = temp[1];

		a = Math.sin((lat1 * pi / 180 - lat2 * pi / 180) / 2) * Math.sin((lat1 * pi / 180 - lat2 * pi / 180) / 2) +
			Math.cos(lat2) * Math.cos(lat1) *
			Math.sin((lng1 * pi / 180 - lng2 * pi / 180) / 2) * Math.sin((lng1 * pi / 180 - lng2 * pi / 180) / 2);
		c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		d = R * c;
		//console.log(d);
		if (d < 0.2) {
			console.log(route_array);
			temp_arr = [];
			temp_arr[0] = route_array[0];
			var y = 2;
			for (y = 2; y < route_array.length; y++) {
				temp_arr[y - 1] = route_array[y];
			}
			//console.log("length", temp_arr.length,route_array.length);
			var length = temp_arr.length;
			console.log(length);
			if (length < 2) {
				Clear();
			} else {
				route_array = temp_arr;
				//console.log(route_array.length);
				setRoute(route_array);
				Next();
				Stop();
				setTimeout(delay_start, 1000);
			}

		}
	} else {
		return;
	}
}

function delay_start() {
	//do whatever you want here
	Start_route();
}

function addCustomLayer() {
	// Add a source layer to use with the layer for rendering geojson features
	myMap.addSource('geojsonPOIs', {
		type: 'geojson',
		data: {
			type: 'FeatureCollection',
			features: [],
		}
	});

	myMap.addLayer({
		id: "geojsonPOIs",
		type: "fill",
		source: "geojsonPOIs",
		paint: {
			"fill-color": "green",
			"fill-opacity": 0.3,
		},
		filter: ['==', 'zLevel', 1]
	});

	myMap.on('zlevel', () => {
		myMap.setFilter("geojsonPOIs", ['==', 'zLevel', myMap.getZLevel()]);
	});
}

// Take an array of maemap features and draw them on the map
function drawFeatures(featuresArray) {
	myMap.getSource("geojsonPOIs").setData({
		type: "FeatureCollection",
		features: featuresArray,
	});
}
