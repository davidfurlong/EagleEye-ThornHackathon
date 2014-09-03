'use strict';

var dayOfWeekChart = dc.rowChart("#day-of-week-chart");
var filesizeHistogram = dc.barChart("#filesize-histogram");
var ageHistogram = dc.barChart("#age-histogram");
var worldChart = dc.geoChoroplethChart("#world-chart");
var fileTypeChart = dc.pieChart("#filetype-chart");
var cityChart = dc.rowChart("#city-chart");
var timeseriesChart = dc.lineChart("#timeseries-chart");
var volumeChart = dc.barChart("#volume-chart");


var fileNameChart = dc.rowChart("#filename-chart");
var userNameChart = dc.rowChart("#username-chart");
var ipChart = dc.rowChart("#ip-chart");

var bubbleChart = dc.bubbleChart("#bubble-chart");


// var apiChart = dc.pieChart("#api-chart");
// var userStepsChart = dc.pieChart("#usersteps-chart");

// var sleeptimeChart = dc.barChart("#sleeptime-histogram");
// var bedtimeChart = dc.barChart("#bedtime-histogram");

worldChart.on("preRender", function(chart) {
    chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
});
worldChart.on("preRedraw", function(chart) {
    chart.colorDomain(d3.extent(chart.data(), chart.valueAccessor()));
});

var dw = $(document).width()
var minDate, maxDate;

queue()
	.defer(d3.tsv,'files.tsv')
	.defer(d3.tsv,'out_small.tsv')
	.await(totalFunc);

function totalFunc (error,files,data) {

	var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
	var numberFormat = d3.format(".2f");
	var numRecords = 0;

	files.forEach(function (d) {
		if(d.age=='') d.age=null;
		d.age = JSON.parse(d.age);
		if(d.age){d.minAge = Math.min.apply(null,d.age);}
		else{d.minAge=-10;}
	});

	data.forEach(function (d) {

		++numRecords;

		d.dd = dateFormat.parse(d.DateTime);				// pre-calculate month for better performance

		if(minDate==undefined){
			minDate = d.dd;
			maxDate = d.dd;
		}

		if( d.dd < minDate ) minDate = d.dd;
		if( d.dd > maxDate ) maxDate = d.dd;

		//d.month = d3.time.month(d.dd);
		//d.week = d3.time.week(d.dd);
		d.day = d3.time.day(d.dd);

		if(d.City=='') d.City='?';


		// convert to numeric types
		d.FileSize = +d.FileSize;

	
	});

	var ndx = crossfilter(data);
	var all = ndx.groupAll();


	dc.dataCount(".dc-data-count")
		.dimension(ndx)
		.group(all)
		// (optional) html, for setting different html for some records and all records.
		// .html replaces everything in the anchor with the html given using the following function.
		// %filter-count and %total-count are replaced with the values obtained.
		.html({
		some:"<strong>%filter-count</strong> selected out of <strong>%total-count</strong> records | <a href='javascript:dc.filterAll(); dc.renderAll();''>Reset All</a>",
		all:"All downloads selected. (<strong>%total-count</strong>) Please click on a graph to apply filters."
		});

	var w = $(document).width()*(10/12); 
	var width = w;
	var height = w/2;

	var countries = ndx.dimension(function (d) {
		return d.CountryCode;
	});
	var countrygroup = countries.group();
	//var mostDownloads = countrygroup.


	var zoom = d3.behavior.zoom()
	    .scale(1 << 12)
	    .scaleExtent([1 << 9, 1 << 23])
	    .translate([width / 2, height / 2])
	    .on("zoom", zoomed);

	var projection = d3.geo.mercator().center([0,25]).scale(200);

	function zoomed() {
		projection
		.translate(d3.event.translate)
		.scale(d3.event.scale);
		worldChart.render();
	}

	var zoom = d3.behavior.zoom()
	        .translate(projection.translate())
	        .scale(projection.scale())
	        .scaleExtent([200, 8 * 200])
	        .on("zoom", zoomed);



    var svg = d3.select("#world-chart")
        .call(zoom);

    // svg.on("mousedown.zoom", null);
    // svg.on("mousemove.zoom", null);
    svg.on("dblclick.zoom", null);
    svg.on("touchstart.zoom", null);
    svg.on("wheel.zoom", null);
    svg.on("mousewheel.zoom", null);
    svg.on("MozMousePixelScroll.zoom", null);


    $('#zoom-in').click(function(){
    	zoom.scale(zoom.scale()*2);
    	zoom.event(svg);
    });
    $('#zoom-out').click(function(){
    	zoom.scale(zoom.scale()/2);
    	zoom.event(svg);
    });
    
	d3.json("geo/ne-countries-50m.json", function (worldJson) {

		worldChart
			.width(w)
			.height(w*(1/2))
			.transitionDuration(0)
			.dimension(countries)
			.group(countrygroup)
			.projection(projection)
			.colors(d3.scale.quantize().range(["#FFEBD6", "#F5CBAE", "#EBA988", "#E08465", "#D65D45", "#CC3527", "#C40A0A"]))
			.colorDomain([0, 3000])		// FIXME - Determine color domain programmatically
			.colorCalculator(function (d) { return d ? worldChart.colors()(d) : '#efefef'; })
			.overlayGeoJson(worldJson.features, "countries", function (d) {
				return d.properties.iso_a2;
			})
			.title(function (d){
				return "Country: " + d.key;
			});


		// dimension by week
		var tsDim = ndx.dimension(function (d) {
			return d.day;
		});
		// group by total movement within month
		var tsGroup = tsDim.group();


		timeseriesChart
			.renderArea(true)
			.width(dw).height(100)
			.transitionDuration(1000)
			.margins({top: 30, right: 50, bottom: 25, left: 50})
			.dimension(tsDim)
			.mouseZoomable(false)
			// Specify a range chart to link the brush extent of the range with the zoom focue of the current chart.
			.rangeChart(volumeChart)
			.x(d3.time.scale().domain([minDate, maxDate]))
			.round(d3.time.day.round)
			.xUnits(d3.time.days)
			.elasticY(true)

			.renderHorizontalGridLines(true)
			// .legend(dc.legend().x(800).y(10).itemHeight(13).gap(5))
			.brushOn(true)
			// Add the base layer of the stack with group. The second parameter specifies a series name for use in the legend
			// The `.valueAccessor` will be used for the base layer
			.group(tsGroup, "Downloads per day")
// 			.valueAccessor(function (d) {
// 				return d.value.count ? d.value.sumSteps / d.value.count : 0;
// 			})
			// stack additional layers with `.stack`. The first paramenter is a new group.
			// The second parameter is the series name. The third is a value accessor.
/*
			.stack(userWeekStepsGroup, "Index Move",function (d) {
				//return d.value.sumSteps;
				return d.value.count ? d.value.sumSteps / d.value.count : 0;
			})
*/
			// title can be called by any stack layer.
			.title(function (d) {
				var value = d.value.avg ? d.value.avg : d.value;
				if (isNaN(value)) value = 0;
				return dateFormat(d.key) + "\n" + numberFormat(value);
			});

		timeseriesChart.yAxis().ticks(3)

		volumeChart.width(dw)
			.height(50)
			.margins({top: 0, right: 50, bottom: 20, left: 40})
			.dimension(tsDim).group(tsGroup)
			.valueAccessor(function (d) {
				return d.value.count ? d.value.sumStairs / d.value.count : 0;
			})
			.centerBar(true)
			.gap(1)
			.x(d3.time.scale().domain([new Date(2013, 8, 1), new Date(2014, 8, 31)]))
			.round(d3.time.week.round)
			.alwaysUseRounding(true)
			.xUnits(d3.time.weeks);


















		var fileTypeDim = ndx.dimension(function (d) { return d['File Extension']; });
		var fileTypeGroup = fileTypeDim.group();


		fileTypeChart
			.width(150).height(150).radius(65).innerRadius(0)
			.dimension(fileTypeDim).group(fileTypeGroup)
			.renderLabel(true)
			.transitionDuration(500)
			;


		var cityDim = ndx.dimension(function (d) { return d.City; });
		var cityGroup = cityDim.group();


		cityChart
			.width(200).height(450)
			.dimension(cityDim).group(cityGroup)
			.ordering(function(d) { return -d.value })
			.elasticX(true)
			.rowsCap(17).othersGrouper(false)
			.renderLabel(true)
			.transitionDuration(500)
			.xAxis().tickFormat(function(v) { return "" })
			;



		var dayNames=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
		var dayOfWeek = ndx.dimension(function (d) {
			var day = d.dd.getDay();
			return day;
		});
		var dayOfWeekGroup = dayOfWeek.group();//.reduceSum(function(d) { return d.steps; });


		dayOfWeekChart.width(180).height(210).margins({top: 10, left: 10, right: 10, bottom: 20})
			.group(dayOfWeekGroup).dimension(dayOfWeek)
			// assign colors to each value in the x scale domain
			//.ordinalColors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
			.label(function (d) { return dayNames[d.key]; })
			// title sets the row text
			.title(function (d) { return d.value; })
			.elasticX(true)
			.xAxis().ticks(4);





		var fileSizeDim = ndx.dimension(function (d) {
			return Math.round(d.FileSize/10000000);
		});
		var fileSizeGroup = fileSizeDim.group();


		filesizeHistogram.width(500).height(200)
			.margins({top: 10, right: 50, bottom: 30, left: 40})
			.dimension(fileSizeDim).group(fileSizeGroup)
			.elasticY(true)
			// .centerBar(true)
			.gap(1)
			.round(dc.round.floor).alwaysUseRounding(true)
			.x(d3.scale.linear().domain([0, 25]))
			.elasticX(true)

			//.colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
			//.colorAccessor(function (d) { return d.key; })
			//.colorDomain([0, 10]) //(optional) define color domain to match your data domain if you want to bind data or color

			.renderHorizontalGridLines(true)
			// customize the filter displayed in the control span
			.filterPrinter(function (filters) {
				var filter = filters[0], s = "";
				s += numberFormat(filter[0])*100 + "MB -> " + numberFormat(filter[1])*100 + "MB";
				return s;
			});
		filesizeHistogram.xAxis().tickFormat(function (v) { return v*100 + " MB"; });
		filesizeHistogram.yAxis().ticks(5);





		var ageDim = ndx.dimension(function (d) {
			var minAge = files[d.FileName].minAge;
			return minAge;
		});

		var ageGroup = ageDim.group();


		ageHistogram.width($(document).width()*0.5).height(200)
			.margins({top: 10, right: 50, bottom: 30, left: 40})
			.dimension(ageDim).group(ageGroup)
			.elasticY(true)
			// .centerBar(true)
			.gap(1)
			.round(dc.round.floor).alwaysUseRounding(true)
			.x(d3.scale.linear().domain([0, 18]))

			.colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
			.colorAccessor(function (d) { return d.key; })
			.colorDomain([0, 18]) //(optional) define color domain to match your data domain if you want to bind data or color

			.renderHorizontalGridLines(true)
			// customize the filter displayed in the control span
			.filterPrinter(function (filters) {
				var filter = filters[0], s = "";
				s += numberFormat(filter[0]) + "years old -> " + numberFormat(filter[1]) + "years old";
				return s;
			});
		ageHistogram.xAxis().tickFormat(function (v) { return v + " yo"; });
		ageHistogram.yAxis().ticks(5);





		var fileNameDim = ndx.dimension(function (d) {
			return d.FileName;
		});
		var fileNameGroup = fileNameDim.group();


		fileNameChart.width(dw/2).height(500).margins({top: 20, left: 10, right: 10, bottom: 20})
			.dimension(fileNameDim).group(fileNameGroup)
			.ordering(function(d) { return -d.value })
			.rowsCap(20).othersGrouper(false)
			.label(function (d) { return files[d.key]['fileName']; })
			// title sets the row text
			//.title(function (d) { return d.value; })
			.elasticX(true)
			.xAxis().ticks(4);




		function addSet(p, col) {
			if (col in p.set) p.set[col]++;
			else{
				p.set[col] = 1;
				p.count++;
			}
			return p;
		}
		function removeSet(p, col) {
			p.set[col]--;
			if(p.set[col] == 0){
				delete p.set[col];
				p.count--;
			}
			return p;
		}
		function initSet() {
			return {set: {}, count: 0};
		}





		var userNameDim = ndx.dimension(function (d) {
			return d.Username;
		});
		var userNameGroup = userNameDim.group();/*.reduce(
			function (p, v) {
				++p.downloads;
				if(!(v.City in p.cities)) p.cities[v.City]=0;
				++p.cities[v.City];
				return p;
			},
			function (p, v) {
				--p.downloads;
				--p.cities[v.City]
				if(p.cities[v.City] == 0){
					delete p.cities[v.City];
				}
				return p;
			},
			function () {
				return {downloads:0, cities:{}, cityCount:0};
			}
        );*/


		userNameChart.width(dw/4-30).height(500).margins({top: 20, left: 10, right: 10, bottom: 20})
			.dimension(userNameDim).group(userNameGroup)
			.ordering(function(d) { return -d.value })
			//.ordering(function(d) { return -d.value.downloads })
			.rowsCap(20).othersGrouper(false)
			//.valueAccessor(function (d) { return d.value.downloads; })
			.label(function (d) { return 'User: '+d.key+' Downloads: '+d.value; })
			// title sets the row text
			//.title(function (d) { return d.value; })
			.elasticX(true)
			.xAxis().ticks(4);









		var ipDim = ndx.dimension(function (d) {
			return d.IPAddress;
		});
		var ipGroup = ipDim.group();


		ipChart.width(dw/4).height(500).margins({top: 20, left: 10, right: 10, bottom: 20})
			.dimension(ipDim).group(ipGroup)
			.ordering(function(d) { return -d.value.downloads })
			.rowsCap(20).othersGrouper(false)
			//.valueAccessor(function (d) { return d.value.downloads; })
			//.label(function (d) { return 'User: '+d.key+' Cities: '+Object.keys(d.value.cities).length; })
			// title sets the row text
			//.title(function (d) { return d.value; })
			.elasticX(true)
			.xAxis().ticks(4);







		// dimension by user
		var userDim = ndx.dimension(function (d) { return d.CountryCode; });
		var userGroup = userDim.group().reduce(
			function (p, v) {
				++p.downloads;
				p.sumSize += v.FileSize;
				var minAge = files[v.FileName].minAge;
				if(minAge && minAge > 0){
					++p.ageCount;
					p.sumMinAge += minAge;
				}
				return p;
			},
			function (p, v) {
				--p.downloads;
				p.sumSize -= v.FileSize;
				var minAge = files[v.FileName].minAge;
				if(minAge && minAge > 0){
					--p.ageCount;
					p.sumMinAge -= minAge;
				}
				return p;
			},
			function () {
				return {downloads: 0, ageCount: 0, sumMinAge:0, sumSize:0};
			}
		);



		bubbleChart
			.width(dw).height(250).margins({top: 10, right: 50, bottom: 30, left: 40})
			.transitionDuration(1500)
			.dimension(userDim).group(userGroup)
	// 		.x(d3.scale.linear().domain([0, 12])).elasticX(false)
	// 		.keyAccessor(function (p) {		// X 
	// 			var avgTimeAsleep = p.value.sleepCount ? p.value.sumTimeAsleep/p.value.sleepCount : 0;
	// 			if(!avgTimeAsleep){
	// 				return -100;
	// 			}
	// 			return avgTimeAsleep;
	// 		})
			.x(d3.scale.linear().domain([0, 10])).elasticX(false)
			//.keyAccessor(function (p) { return p.value.downloads ? p.value.sumSize/1000000/p.value.downloads : 0; })
			.keyAccessor(function (p) { return Math.log(p.value.downloads); })

			.y(d3.scale.linear().domain([0, 18]))
			//.valueAccessor(function (p) { return p.value.downloads; })
			.valueAccessor(function (p) {
				var avg = p.value.ageCount ? p.value.sumMinAge/p.value.ageCount : 0;
				console.log(avg);
				return avg;
			})
			.elasticY(false)

			//.colors(colorbrewer.RdYlGn[9]) // (optional) define color function or array for bubbles
			//.colors(colorbrewer.YlOrRd[9]) // (optional) define color function or array for bubbles
			//.colorAccessor(function (p) { return getAvg(p,'count','sumCalories'); })
			//.colorDomain([0, 4000]) //(optional) define color domain to match your data domain if you want to bind data or color

			.r(d3.scale.linear().domain([0, 100]))
			.radiusValueAccessor(function (p) { return 10; })
			.maxBubbleRelativeSize(0.07)

			.yAxisPadding(5).xAxisPadding(10)

			.renderHorizontalGridLines(true).renderVerticalGridLines(true)
			.xAxisLabel('').yAxisLabel('')
			//.renderLabel(true).label(function (p) { return ""+p.key+" ("+p.value.count+")"; })
			.renderTitle(true).title(function (p) {
				return [p.key+' ('+p.value.count+' days of activity)',
					"Total Steps: " + numberFormat(p.value.sumSteps),
					"Index Gain in Percentage: " + numberFormat(p.value.percentageGain) + "%",
					"Fluctuation / Index Ratio: " + numberFormat(p.value.fluctuationPercentage) + "%"]
					.join("\n");
			})
			;

		bubbleChart.yAxis().tickFormat(function (v) {
			if(v<0){v='';}
			return v; 
		});






   
		dc.renderAll();

		$('.container').show();
		$('#loading').hide();


	});	// end geojson import

	
}	// end total function

//#### Version
//Determine the current version of dc with `dc.version`
d3.selectAll("#version").text(dc.version);
