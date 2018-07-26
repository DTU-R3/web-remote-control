		
		var allowed_list = [];
		var x = 0;
		
        function addCustomLayer(){
            // Add a source layer to use with the layer for rendering geojson features
            myMap.addSource('geojsonPOIs', {type: 'geojson', data: {type: 'FeatureCollection', features: [] } });

            myMap.addLayer({
                id: "geojsonPOIs",
                type: "fill",
                source: "geojsonPOIs",
                paint: {
                    "fill-color": {type: "identity", "property": "Color Code"},
                    "fill-opacity": 0.5
                },
                filter: ['==', 'zLevel', 1]
            });

            myMap.on('zlevel', () => {
                myMap.setFilter("geojsonPOIs", ['==', 'zLevel', myMap.getZLevel()]);
            });
        }


        function readExcelAndDraw(){

            readExcelFile("example-room-list5.xlsx").then( ( workbook ) => {
                var sheet = window.sheet = new ExcelSheet(workbook.Sheets[ workbook.SheetNames[0] ]);

                var jsonRows = sheet.getRangeAsJSON("A1:D7");

                // For every row, fetch the room from the "MazeMap Identifier" column and when complete, draw all rooms
                fetchIdentifiers( jsonRows, "MazeMap Test" )
                .then( (features) => { console.log('Got features', features); return features;})
                .then( drawFeatures )
                .catch( e => console.warn )
            });

        }

        // Take an identifier array and return the data results for all
        function fetchIdentifiers( poisArray, identifierKey ){

            // Take the identifiers array and transform to new array of actual poi requests
            var roomRequests = poisArray.map( (poiObject) => {
                var reqest = Mazemap.Data.getPoi(parseInt(poiObject[identifierKey]))
                        .then( (poipoi) => {
                            // Mazemap.Data.getPoi finds based on a search of the ID
							//console.log('CONSOLE TEST:', Mazemap.Data.getPois({campusid: 49, identifier: 'Universitetshuset-103'}) );
							//console.log('Console2 TEST', Mazemap.Data.getPois({identifier: poiObject[identifierKey]}) );
							//console.log('CONSOLE3 TEST:', Mazemap.Data.getPois({campusid: 49, floorid: 3308, zlevel: 1, poiid: 402322, id: '402322', buildingname: 'Universitetshuset'}) );
							//console.log('SEND DETTE', Mazemap.Data.getPoi(402322));
							//Mazemap.Data.getPoi(402322).then( poipoi => {console.log('Tes4', poipoi)});
							//console.log('Arr0:', arr[0]);
							allowed_list[x] = poipoi.properties.id;
							x++;
                            return poipoi;
                        } ) 
                        .catch( (e) => {
                        }).then( (feature) => { return feature || false })
                        .then( (feature) => {
                            Object.assign( feature.properties, poiObject );
                            return feature;
                        });
				//console.log('REQUEST TEST', reqest);
                return reqest;
            });

            // When all the requests are processed, do filter the results and return them
            return Promise.all( roomRequests ).then( (results) => {
                // If some results was FALSE, filter out those
                return results.filter( f => f);
            });
        }

        // Take an array of maemap features and draw them on the map
        function drawFeatures( featuresArray ){
            myMap.getSource("geojsonPOIs").setData( {type: "FeatureCollection", features: featuresArray});
        }

        function addClickEvents(){
			/*
            myMap.layerEventHandler.on('click', 'geojsonPOIs', (e, features) => {
                console.log('Clicked layer geojsonPOIs', e, features);
                var feature = features && features[0];
               // showPopupOnPoi( feature, e.lngLat );
            })

            myMap.layerEventHandler.on('click', null, (e) => {
                Mazemap.Data.getPoiAt( e.lngLat, myMap.getZLevel() )
                .then( ( poi ) => {
                    console.log('Clicked on the base map, poi here is:', poi);
                });
            })*/
        }
/*
        function showPopupOnPoi(feature, lngLat){
            if(!feature){ return; }
            // Make a custom popup right here on the fly
            new Mazemap.Popup({closeOnClick: true, offset: [0, 0]})
            .setLngLat( lngLat )
            .setHTML( generateRoomInfoHTML(feature) )
            .addTo(myMap);
        }

        // Make some generic HTML for representing a room's info
        function generateRoomInfoHTML(feature){
            var table = "<table>";
            Object.keys(feature.properties).forEach( (key) => {
                if( !feature.properties.hasOwnProperty(key)){ return; }

                table += "<tr><td>" + key + "</td>";
                table += "<td>" + feature.properties[key] + "</td></tr>";
            });
            table += "</table>";

            return '<h3>Info</h3><p style="max-width: 160px;">'+ table +'</p>'
        }
*/
        /* EXCEL RELATED FUNCTIONS */

        /* Copied from read example at https://github.com/SheetJS/js-xlsx and made into a promise object */
        function readExcelFile(url){
            return fetch(url).then(function(res) {
            if(!res.ok) throw new Error("fetch failed");
            return res.blob();
            }).then(function(blob) {
                return new Promise( (resolve) => {
                    var reader = new FileReader();
                    reader.addEventListener("loadend", function() {
                        var data = new Uint8Array(this.result);
                        var wb = XLSX.read(data, {type:"array"});
                        //process_wb(wb);
                        resolve(wb);
                    });
                    reader.readAsArrayBuffer(blob);
                });
            });
        }

        // A custom class for more easily exposing functions working on a single Excel Sheet object
        class ExcelSheet {
            constructor (sheet){
                this.sheet = sheet;
            }


            // Input: range like "A1:F5"
            // makes an object of each row, with values corresponding to each column
            // If headers is false or Array, use entire range as data values.
            // If not, default to using first row as header keys

            getRangeAsJSON(range, headers = true){
                var customHeaderKeys = false;

                if( headers instanceof Array ){
                    customHeaderKeys = headers;
                }

                /* Create a json like:
                [
                  [A1, A2, A3],
                  [B1, B2, B3],
                  [C1, C2, C3],
                ]
                */
                var json = XLSX.utils.sheet_to_json( this.sheet, {range: range, blankrows: true, header: 1, defVal: null});

                /* Now transform this into json objects, using the first row as keys or use custom headers
                    [
                        {A1: B1, A2: B2, A3: B3},
                        {A1: C1, A2: C2, A3: C3},
                    ]
                */

                let headerKeys = false;
                if( headers && !customHeaderKeys){
                    headerKeys = json.splice(0,1)[0];
                }else{
                    headerKeys = customHeaderKeys;
                }

                // Remove the first item and keep it as keys or use an array if specified

                var resultArray = json.map( (rowValues) => {
                    var obj = {};

                    rowValues.map( (value, index) => {
                        let key = headerKeys && headerKeys[index] || "value"+index;
                        obj[ key ] = value;
                    });

                    return obj;
                })

                return resultArray;

            }

        }