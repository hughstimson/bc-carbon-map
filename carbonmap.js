/**
 * Created by geocology.ca (Hugh Stimson) for Tyee Solutions Society
 * April 2012
 */

// when the DOM is ready, do all the stuff
//$(document).ready(function() {
$(window).bind("load", function() {

    // hard code some needed information about the structure of the fusion tables
    var tableIds = {
        'forests'       : '1zt2zPwUa_BuBHlNNy0HID2HaULwyJvEY2r-AW1A',
        'blue'          : '1Lyt280S3fNjsdA5oCr6GMws0B-yXflni0eHY27E',
        'facilities'    : '1zjV4HPVmDjFQIV89XNCyONKlCqKk_TUtpie-_xo',
        'traffic'       : '1U6qzWZ6ctrjvGsEk2F0VMrM7dEK3ecU2jwTTqfA',
        'communities'   : '1JMh8ldE_-2cM7YjQQnbHdNE-2tM57hJYa0uT-qY'
    };

    var spatialColumns = {
        'forests'       : 'geometry',
        'blue'          : 'geometry',
        'facilities'    : 'geometry',
        'traffic'       : 'geometry',
        'communities'   : 'geometry'
    };

    var dataColumns = {
        'forests' 		: 'tco2_yr',
        'blue'          : 'tco2_yr',
        'facilities'	: 'total_emis',
        'traffic' 		: 'tco2_yr',
        'communities'   : 'tco2_yr'
    };

    // set desired display order of layers (when and if they're displayed)
    var typeZs = {
        'forests'   : 1,
        'communities': 2,
        'blue'      : 3,
        'traffic'   : 4,
        'facilities': 5
    }

    // have to do this both ways because javascript doesn't have sortable dictionaries
    // todo make sure these Z indices are consistent with the initial draw order
    var zTypes = {
        1: 'forests',
        2: 'communities',
        3: 'blue',
        4: 'traffic',
        5: 'facilities'
    }

    // make a place to store on/off (true/false) state of flux types
    var activeTypes = {};

    // make a place to store sink/source values in the current map extent
    var typeValues = {
        'forests' 		: 0,
        'blue'          : 0,
        'facilities'	: 0,
        'traffic' 		: 0,
        'communities'   : 0
    };

    // make a place to store the net of sinks and sources
    var net = 0;

    // make a place to store map layer objects to allow their removal from the map later
    var layers = {};

    // get everything set up and ready to be modified
    var map = initializeMap();
    initializeTypes();
    updateNet();
    initializeControls();

    // used for data column updating glow effect
//    var firstTime = true;

    // keeping supporting functions within document.ready eases finding variables in debugger,
    // and probably safer to keep my 'globals' from mixing with the actual globals anyway

    function initializeMap() {

        // consolidate the options
        var myOptions = {
            center: new google.maps.LatLng(54.5, -125.7),
            zoom: 5,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: true,
            mapTypeControl: true,
            mapTypeControlOptions: {
                position: google.maps.ControlPosition.BOTTOM_LEFT,
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                mapTypeIds:
                    ['Gray', google.maps.MapTypeId.ROADMAP, google.maps.MapTypeId.SATELLITE, google.maps.MapTypeId.TERRAIN]
            },
            panControl: true,
            panControlOptions: {
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            zoomControl: true,
            zoomControlOptions: {
                style: google.maps.ZoomControlStyle.DEFAULT,
                position: google.maps.ControlPosition.TOP_RIGHT
            },
            minZoom: 5,
            scaleControl: true,
            scaleControlOptions: {
                position: google.maps.ControlPosition.BOTTOM_LEFT,
                style: google.maps.ScaleControlStyle.DEFAULT
            }
        };

        // create the map object based on the option above
        var map = new google.maps.Map(document.getElementById('map'), myOptions);

        // devise some styles to apply to the map object
        var grayStyle = [
            {
                featureType: "all",
                stylers: [
                    { saturation: -0 }
                ]
            },
            {
                featureType: "poi",
                stylers: [
                    {hue: '#9bba91'},
                    { saturation: -100 },
                    { lightness: 30 }
                ]
            },
            {
                featureType: "landscape",
                stylers: [
                    {hue: '#9bba91'},
                    { saturation: -100 },
                    { lightness: 20 }
                ]
            },
            {
                featureType: "water",
                stylers: [
                    { saturation: -23 },
                    { lightness: -10 },
                    { gamma: 1 }
                ]
            },
            {
                featureType: 'administrative',
                elementType: 'all',
                stylers: [
                    { saturation: -100 },
                    { lightness: -10 },
                    { visibility: 'on' }
                ]
            },
            {
                featureType: 'road',
                elementType: 'labels',
                stylers: [
                    { hue: '#ffffff' },
                    { saturation: -100 },
                    { lightness: 0 },
                    { visibility: 'on' }
                ]
            },
            {
                featureType: "road.highway",
                elementType: "geometry",
                stylers: [
                    { saturation: -100 },
                    { visibility: "on" },
                    { lightness: -23 }
                ]
            },
            {
                featureType: "road.local",
                elementType: "geometry",
                stylers: [
                    { visibility: "simplified" }
                ]
            },
            {
                featureType: "road.arterial",
                elementType: "geometry",
                stylers: [
                    { visibility: "on" },
                    { saturation: -100 },
                    { visibility: "simplified" }
                ]
            },
            {
                featureType: "transit",
                stylers: [
                    { visibility: "on" },
                    { saturation: -100 }
                ]
            }
        ];

        var grayMap = new google.maps.StyledMapType(grayStyle,
            {name: 'Gray'});

        // store the new map types in the map type registry
        map.mapTypes.set('Gray', grayMap);

        // turn one of them on
        // comment this out to avoid using the styled map as default
        map.setMapTypeId('Gray');


        return map;
    }

    function initializeControls() {

//        // check for IE7 so instructions pop-up can warn if necessary
//        if ($.browser.msie && $.browser.version < 8) {
//            $('#instructions .modal-body .warningHolder').append('\
//                <div class="alert alert-error">\
//                Map data may not display in Internet Explorer 7.<br>\
//                Sorry! We\'re looking for a solution. The data table should still work for you.\
//                </div>\
//            ')
//        }

        // empower the html buttons to become live controls
        // by binding click event handlers to them
        // (this also could be written in HTML as <button onclick='[function]')

        $('#forests .on').on('click', { type: 'forests' }, addType);
        $('#forests .off').on('click', { type: 'forests' }, removeType);

        $('#blue .on').on('click', { type: 'blue' }, addType);
        $('#blue .off').on('click', { type: 'blue' }, removeType);

        $('#traffic .on').on('click', { type: 'traffic' }, addType);
        $('#traffic .off').on('click', { type: 'traffic' }, removeType);

        $('#facilities .on').on('click', { type: 'facilities' }, addType);
        $('#facilities .off').on('click', { type: 'facilities' }, removeType);

        $('#communities .on').on('click', { type: 'communities' }, addType);
        $('#communities .off').on('click', { type: 'communities' }, removeType);

        //empower the help pop-ups

        $('#instructionsModal').modal({
            show: true,
            backdrop: true
        })

        $('#embedModal').modal({
            show: false,
            backdrop: true
        });

        $('.typeInfo').modal({
            show: false,
            backdrop: true
        });

        $('table#types tr.type a.infoIcon').tooltip({
            placement: 'top',
            title: 'click for data info'
        });

        $('#instructionsLink').tooltip();

        $('#embedLink').tooltip();

        // display some helpful information when someone hovers over the question mark
        $('#typesTip').popover({
            placement:'bottom',
            content: 'Each line in the table is a major sink or source of BC\'s atmospheric carbon. <strong>Turn a layer on</strong> to show it in the map and include it in the calculation. <strong>Zoom the map</strong> to adjust the values and re-calculate the balance.'
        });

        $('#legendTip').popover({
            placement:'right',
            content: '<strong>Facilities</strong> dots are measured in tonnes of CO<sub>2</sub> released per year.<br> <strong>Traffic</strong> lines are measured in tonnes of CO<sub>2</sub> per kilometer per year.<br> <strong>Forest</strong>, <strong>eel grass</strong> and <strong>salt marsh</strong> areas are measured in tonnes of CO<sub>2</sub> per square kilometer per year'
        });

        // each time the map is loading
        // light up the data column to emphasize that it is also loading
        // todo replace this with something that persists while the tables are querying
        google.maps.event.addListener(map, 'bounds_changed', function() {

        })


        // each time the map has stopped loading (or trying to load)
        // light up the data column to emphasize that it's being changed
        // get the final bounds and update all the values
        // wait a moment after initiating the value update, then fade out the data column effect
        // (using a jqueryUI fade)

        google.maps.event.addListener(map, 'idle', function() {
            updateValues()

//            // if this is the initial page load don't light up the column
//            if (firstTime) {
//
//                updateValues();
//                firstTime = false;
//
//            } else {
//
//                $('td.quantity').addClass('indicateQuerying');
//                updateValues();
//                // todo remove this once I've replaced it (see above)
//                window.setTimeout(function() {
//                    $('td.quantity').removeClass('indicateQuerying', 1000);
//                }, 500);
//
//            }
        });

    }

    function initializeTypes(){

        // add initial layers to the list so they're included in totals
        activeTypes = {
            'forests'   : true,
            'blue'      : true,
            'communities': true,
            'traffic'   : true,
            'facilities': true
        };

        // and add them to the map display
        // can't iterate through activeTypes because then draw order would be random
        // addLayer works in such a way that every higher-Z layer know to be "on" gets removed and redrawn
        // whenever a lower-Z layer is added. So just priming activeTypes and adding the lowest Z layer will
        // effectively add all layers. Currently that's forests.
        addLayer('forests');

        // set the initial display of the switches to on or off as appropriate
        $('#forests .on').addClass('active');
        $('#blue .on').addClass('active');
        $('#facilities .on').addClass('active');
        $('#traffic .on').addClass('active');
        $('#communities .on').addClass('active');

    }

    function addType(event){

        var type = event.data.type;

        // if it's not already on
        if (!activeTypes[type]) {
            // toggle it on in the types dictionary object
            activeTypes[type] = true;
            // and the map
            addLayer(type);
            // and update the totals accordingly
            // this runs the query and also triggers totals and table update:
            updateValues();

        }

    }

    function removeType(event) {

        var type = event.data.type;

        // if it is indeed turned on
        if (activeTypes[type]) {
            // toggle it off in the types dictionary object
            activeTypes[type] = false;
            // and remove it from the map
            removeLayer(type);
            // and set it's value to 0
            typeValues[type] = 0;
            // and update the totals accordingly
            updateNet();
            updateTable();
        }

    }

    function addLayer(type) {
        // this is more complex than it should be because there is no way to set z-order of layers
        // so instead multiple layers need to removed and added in some cases

        var newZ = typeZs[type];

        var drawZs = [];
        var z;
        for (z in zTypes) {
            // get the zIndex of layers that will be redrawn (including the new one)
            // not sure why I have to cast z to integer, it should be stored as one no?
            if (parseInt(z) >= newZ)
                // retrieve the type name of that layer
                var t = zTypes[z];
                // if it's currently active
                // (the layer currently being added should have been set to 'active' in parent method
                if (activeTypes[t]) {
                    // store that type's z index in a list z-indexes to be redrawn
                    drawZs.push(z)
                }
        }
        // sort the redraw list so that higher z's will be drawn later
        // the embedded function is necessary because numerical sorting isn't built into .sort
        drawZs.sort(function(a,b){return a - b});

        // remove and add the layers in z index order
        var i; // for debugging
        for (i in drawZs) {

            z = drawZs[i];

            // get the type corresponding to that z-order
            var t = zTypes[z];

            var layer;
            // if the layer has already been created and stashed in the layers registry, reuse it
            if (layers.hasOwnProperty(t)) { layer = layers[t]}
            // otherwise create it
            else {
                var spatialColumn = spatialColumns[t];
                var tableId = tableIds[t];
                var dataColumn = dataColumns[t];
                // todo figure out why "var selectClause = spatialColumn + ' ORDER BY ' + dataColumn + ' ASC';" breaks facility styling
                var selectClause = spatialColumn;
                var layer = new google.maps.FusionTablesLayer({
                    query: {
                        select: selectClause,
                        from: tableId
                    }
                });
                // and store it
                layers[t] = layer;
            }

            // remove the layer from the map (if it's there)
            if (layers[t]) layers[t].setMap(null);

            // and re-add it
            layer.setMap(map);

        }
    }

    function removeLayer(type) {

        // remove it from the map
        layers[type].setMap(null);

        // set the table field to 0
        var selector = '#' + type + ' .quantity';
        $(selector)
            .empty()
            .removeClass('active')
            .removeClass('positive')
            .removeClass('negative')
            .addClass('inactive')
            .append(0);

        // remove it from the dictionary of layers
        delete layers[type];

    }

    function updateValues() {

        // run the extents-based query for each flux type in turn
        // if it's set to 'true' (on)
        for (type in activeTypes) {
            if (activeTypes[type]) queryExtent(type);
        }

    }

    function updateNet() {

        // clear the net so it doesn't stack up
        net = 0;

        var type;
        for (type in activeTypes) {

            // if it's set to 'true' (on)
            if (activeTypes[type]) {
                // get the hard coded value for the type
                var value = typeValues[type];
                // add it to the total
                net += value;
            }

        }

    }

    function updateTable(type) {

        // update the display of values in the map-extent-specific table
        // only bother updating sink/sources types that are active
        // (un-active types should be left displaying as '0')

        // get the queried value for the type and format it for display
        var value = typeValues[type];
        if (value == null) {
            valueText = 'none found'
        } else {
            var valueText = formatValue(value);
        }

        // figure out the html target field to be updated
        var selector = '#' + type + ' .quantity';

        // and update the table field
        var displayClass;
        if (value == null) {
            displayClass = 'inactive'
        } else if (value > 0) {
            displayClass = 'positive'
        } else if ( value < 0 ) {
            displayClass = 'negative'
        } else {
            displayClass = 'active'
        }

        $(selector)
            .empty()
            .removeClass('inactive')
            .removeClass('positive')
            .removeClass('negative')
            .addClass(displayClass)
            .append(valueText);

        // convert raw balance to nicely formatted string
        var netText = formatValue(net);

        // update the html

        if (net > 0)
            $('#balance .quantity')
                .empty()
                .removeClass('zero')
                .removeClass('negative')
                .addClass('positive')
                .append(netText);
        else if (net < 0)
            $('#balance .quantity')
                .empty()
                .removeClass('zero')
                .removeClass('postive')
                .addClass('negative')
                .append(netText);
        else
            $('#balance .quantity')
                .empty()
                .removeClass('negative')
                .removeClass('positive')
                .addClass('zero')
                .append(netText);

    }

    function queryExtent(type) {
        // queries the flux quantity for a given type over the current map extent
        // as soon as it has the value it updates the map flux values,
        // then triggers an update to the map flux totals and map table

        // the trick here is to use the jsonp data return type,
        // otherwise some security rules kick in that prevent scripts from requesting data types
        // http://www.reddmetrics.com/2011/08/10/fusion-tables-javascript-query-maps.html
        // http://stackoverflow.com/questions/6181020/trouble-with-get-request-from-google-fusion-tables

        var apiUrl = 'http://www.google.com/fusiontables/api/query?sql=';
        var tableId = tableIds[type];
        var spatialColumn = spatialColumns[type];
        var dataColumn = dataColumns[type];
        var extent = map.getBounds();
        var LL = extent.getSouthWest().toString();
        var UR = extent.getNorthEast().toString();
        var geometry = 'RECTANGLE(LATLNG' + LL + ', LATLNG' + UR + ')';

        var u = apiUrl + 'SELECT SUM(' + dataColumn + ') FROM ' + tableId + ' WHERE ST_INTERSECTS(' + spatialColumn + ', ' + geometry + ')' + '&jsonCallback=?';
        var url = encodeURI(u);
        var selector = '#' + type + ' .quantity';
        var value;

        // retrieve the jsonp version of the queried data, pass it to the handler callback

        $.ajax({
            url: url,
            dataType: 'jsonp', // for some reason this still works if you set it to just 'json'
            beforeSend: function indicateLoading() {
              // add a CSS class to the appropriate table cell to indicate it's updating
              $(selector)
                  .empty()
                  .addClass('loading')
                  .append('<em>searching map</em>');
              $('.total .quantity').addClass('loading');
            },
            success: function queryHandler(data) {
                // handler extracts 1st cell in 1st row of data from the json
                // (which should contain only a single summed value in that location)
                try {
                    value = data.table.rows[0][0];
                    typeValues[type] = value;
                // if there is no data returned, set to 0
                // todo think of a better way of handling 'undefined' query result
                } catch (err) {
                    typeValues[type] = null;
                }
                updateNet();
                updateTable(type);
            },
            complete: function indicateLoaded() {
                // remove CSS class added by indicateLoading()
                $(selector).removeClass('loading');
                $('.total .quantity').removeClass('loading');
            },
            error: function() {
                $(selector)
                    .empty()
                    .append('<em>search failed</em>');
            }
        });

    }

    function formatValue(value){

        // round it off (to the thousands?)
        var roundedValue = (Math.round(value/100)) * 100;

        // remove the sign
        var absValue = Math.abs(roundedValue)

        // add some commas
        var text =  addCommas(absValue);

        // return the sign with some space
        if (value < 0) {
            text = '- ' + text
        } else if (value > 0) {
            text = '+ ' + text
        }

        return text;

    }

    function addCommas(nStr) {
        // from http://www.mredkj.com/javascript/nfbasic.html
        nStr += '';
        var x = nStr.split('.');
        var x1 = x[0];
        var x2 = x.length > 1 ? '.' + x[1] : '';
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
            x1 = x1.replace(rgx, '$1' + ',' + '$2');
        }
        return x1 + x2;
    }
})