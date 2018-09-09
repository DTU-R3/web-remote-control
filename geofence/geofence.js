var get_data_flag1 = false;
var get_data_flag2 = true;
var map_load_flag = false;
var featuresArray2 = [];
var data = [];
var insert = true;
var remove = false;
var myMap = [];

function Start_up() {
  myMap = new Mazemap.Map({
    container: 'map',
    campuses: 89,
    center: {
      lng: 12.514221376888127,
      lat: 55.78268545984302
    },
    zoom: 18,
    zLevel: 3,
    scrollZoom: true,
    doubleClickZoom: false,
    touchZoomRotate: false,
  });
}

function Load_Map() {

  addCustomLayer();

  drawFeatures(featuresArray2);

  myMap.on('click', onMapClick);

}




function onMapClick(e) {

  var lngLat = e.lngLat;
  var zLevel = myMap.zLevel;

  Mazemap.Data.getPoiAt(lngLat, zLevel).then(poi => {

    if (insert) {
      console.log('data', data);
      var poiId = poi.properties.id;
      if (!data.pois.poiIds.includes(poiId)) {
        data.pois.poiIds.push(poiId);
        console.log(data);
      }
    } else if (remove) {
      var poiId = poi.properties.id;
      var list_of_pois = data.pois.poiIds;

      if (list_of_pois.includes(poiId)) {
        // Moves the to-be removed item to the end position, and pops it.
        IndexNr = list_of_pois.indexOf(poiId);
        var TempA = list_of_pois[IndexNr];
        var TempB = list_of_pois[list_of_pois.length - 1];

        list_of_pois[list_of_pois.length - 1] = TempA;
        list_of_pois[IndexNr] = TempB;

        list_of_pois.pop();

        data.pois.poiIds = list_of_pois;

      }
    }

  });
}



function addCustomLayer() {
  // Add a source layer to use with the layer for rendering geojson features
  myMap.addSource('geojsonPOIs', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: []
    }
  });

  myMap.addLayer({
    id: "geojsonPOIs",
    type: "fill",
    source: "geojsonPOIs",
    paint: {
      "fill-color": "green",
      "fill-opacity": 0.3
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
    features: featuresArray
  });
}



function post_data() {
  /*var element = document.getElementById('poi_id');
  element.form.submit();*/
  var r = new XMLHttpRequest();
  r.open("POST", "test.php", true);
  r.onreadystatechange = function() {
    if (r.readyState != 4 || r.status != 200) {
      return;
    }
    alert("Success: " + r.responseText);
  };

  r.send(JSON.stringify(data));

}

function get_data() {
  var read = new XMLHttpRequest();
  var data_x;
  read.open('GET', '../data/test.json' + '?' + Date.now(), true); // argument added to url to prevent caching
  read.onreadystatechange = function() {
    if (read.readyState != 4 || read.status != 200) {
      return;
    }
    //alert("Success: " + read.responseText);
    //TODO: sanitise data, handle exceptions
    data_x = JSON.parse(read.responseText);

    console.log(data_x);
    data = data_x;
    console.log(data_x);
    var i;
    var n = data.pois.poiIds.length;

    for (i = 0; i < n; i++) {
      Mazemap.Data.getPoi(data.pois.poiIds[i]).then(poipoi => {
        featuresArray2.push(poipoi);
      });
    }



  };
  read.send(null);
  get_data_flag2 = true;
}

function set() {
  insert = true;
  remove = false;
}

function remove_zone() {
  insert = false;
  remove = true;
}

function submit() {
  post_data();
}
