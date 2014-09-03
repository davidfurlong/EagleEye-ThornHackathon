/*global d3, crossndx, barChart, points */

// partially adapted from crossndx's example

var map;
var markers = [];

var ndx;
var val1Dimension;
var val1Grouping;
var val2Dimension;
var val2Grouping;
var charts;
var domCharts;

var latDimension;
var lngDimension;
var idDimension;
var idGrouping;


var map;
var heatmap;

var data;




function init() {

	d3.tsv("out.tsv", function (points) {
		data = points;

		var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
		var numberFormat = d3.format(".2f");

		var minDate, maxDate;

		var numRecords = 0;

		points.forEach(function (d) {

			++numRecords;

			d.dd = dateFormat.parse(d.DateTime);				// pre-calculate month for better performance

			//console.log(d);

			if(minDate==undefined){
				minDate = d.dd;
				maxDate = d.dd;
			}

			if( d.dd < minDate ) minDate = d.dd;
			if( d.dd > maxDate ) maxDate = d.dd;

			d.month = d3.time.month(d.dd);
			d.day = d3.time.day(d.dd);
			d.week = d3.time.week(d.dd);
			d.hour = d3.time.hour(d.dd);

			// convert to numeric types
			d.FileSize = +d.FileSize;

			d.val1 = 0;
			d.val2 = 0;

			d.lat = +d.lat;
			d.lng = +d.lng;


			if(d.lat && d.lng){
				d.heatMapPoint = new google.maps.LatLng(d.lat, d.lng)
			}
		});

		// init maps

		google.maps.visualRefresh = true;

		var mapOptions = {
			zoom: 2,
			streetViewControl: false,
			center: new google.maps.LatLng(70, 200),
			mapTypeId: google.maps.MapTypeId.SATELLITE
		};

		map = new google.maps.Map(document.getElementById('map-div'),mapOptions);

		function toggleHeatmap() {
			heatmap.setMap(heatmap.getMap() ? null : map);
		}

		function changeGradient() {
			var gradient = [
				'rgba(0, 255, 255, 0)',
				'rgba(0, 255, 255, 1)',
				'rgba(0, 191, 255, 1)',
				'rgba(0, 127, 255, 1)',
				'rgba(0, 63, 255, 1)',
				'rgba(0, 0, 255, 1)',
				'rgba(0, 0, 223, 1)',
				'rgba(0, 0, 191, 1)',
				'rgba(0, 0, 159, 1)',
				'rgba(0, 0, 127, 1)',
				'rgba(63, 0, 91, 1)',
				'rgba(127, 0, 63, 1)',
				'rgba(191, 0, 31, 1)',
				'rgba(255, 0, 0, 1)'
			]
			heatmap.set('gradient', heatmap.get('gradient') ? null : gradient);
		}

		// init crossndx

		ndx = crossfilter(points);

		// var fileSizeDim = ndx.dimension(function (d) {
		// 	return Math.round(d.FileSize/1000000);
		// });
		// var fileSizeGroup = fileSizeDim.group();

		// filesizeHistogram.width(300).height(300)
		// 	.margins({top: 10, right: 50, bottom: 30, left: 40})
		// 	.dimension(fileSizeDim).group(fileSizeGroup)
		// 	.elasticY(true)
		// 	.centerBar(true)
		// 	.gap(1)
		// 	.round(dc.round.floor).alwaysUseRounding(true)
		// 	.x(d3.scale.linear().domain([0, 25])).elasticX(true)
		// 	.colorAccessor(function (d) { return d.key; })
		// 	.colorDomain([0, 10]) //(optional) define color domain to match your data domain if you want to bind data or color

		// 	.renderHorizontalGridLines(true)
		// 	// customize the ndx displayed in the control span
		// 	.filterPrinter(function (ndxs) {
		// 		var ndx = ndxs[0], s = "";
		// 		s += numberFormat(ndx[0]) + "% -> " + numberFormat(ndx[1]) + "%";
		// 		return s;
		// 	});
		// filesizeHistogram.xAxis().tickFormat(function (v) { return v + " MB"; });
		// filesizeHistogram.yAxis().ticks(5);




		// bind map bounds to lat/lng ndx dimensions
		latDimension = ndx.dimension(function(p) { return p.lat; });
		lngDimension = ndx.dimension(function(p) { return p.lng; });
		google.maps.event.addListener(map, 'bounds_changed', function() {
			var bounds = this.getBounds();
			var northEast = bounds.getNorthEast();
			var southWest = bounds.getSouthWest();

			// NOTE: need to be careful with the dateline here
			lngDimension.filterRange([southWest.lng(), northEast.lng()]);
			latDimension.filterRange([southWest.lat(), northEast.lat()]);

			// NOTE: may want to debounce here, perhaps on requestAnimationFrame
			updateCharts();
		});

		// dimension and group for looking up currently selected markers
		idDimension = ndx.dimension(function(p, i) { return i; });
		idGrouping = idDimension.group(function(id) { return id; });



		renderAll();


	});


}

// Renders the specified chart
function render(method) {
  d3.select(this).call(method);
}

// Renders all of the charts
function updateCharts() {
  //domCharts.each(render);
}

// set visibility of markers based on crossndx
function updateMarkers() {

	var heatMapPoints = [];

	var pointIds = idGrouping.all();

	for (var i = 0; i < pointIds.length; i++) {
		var p = data[i];
		if(p.heatMapPoint){heatMapPoints.push(p.heatMapPoint);}
	}

	var pointArray = new google.maps.MVCArray(heatMapPoints);

	if(heatmap) heatmap.setMap(null);

	heatmap = new google.maps.visualization.HeatmapLayer({
		data: pointArray
	});


	heatmap.setMap(map);
}
// Whenever the brush moves, re-render charts and map markers
function renderAll() {
	dc.renderAll();
  updateMarkers();
  //updateCharts();
}
window.renderAll = renderAll();


// Reset a particular histogram
window.reset = function(i) {
  charts[i].filter(null);
  renderAll();
};
