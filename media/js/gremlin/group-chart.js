$(document).ready(function() {

  var countingFile = path + "/" + "count_atoms_and_interactions.csv";
      
  var supportList = [];
  var groupList = [];
  
  var dataset = {};

  var contextOptions = {};

  var colorScale = d3.scale.category20();
  var blueScale = d3.scale.linear().range(["rgb(204, 235, 197)", "rgb(8, 64, 129)"])

  //Margin, Width and height
  var margin = {top: 40, right: 20, bottom: 40, left: 30};

  // This values are changed in updateMeasures() method
  var w, h, maxRoundBand;
  var xScale, yScale, xAxis, yAxis, yLineScale, yLineScale;

  var groupedTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10,0])
    .html(function(key,keyValue,value) {
      var html = "<p><strong>" + key + ": </strong><span>" + keyValue + "</span></p>" +
	      "<p><strong>Frequency: </strong><span>" + value + "</span></p>";	  
      return html;
    });
   
  // Charging all the Atom Types information.
  d3.csv(countingFile, function(csv) {    

    dataset = csv;

    var atomsBtnLabel = {};
    var interBtnLabel = {};

    var $atomsBtn = $('.atom-types-buttons');
    var $interBtn = $('.inter-types-buttons');

    for (var i in dataset) {
      var obj = dataset[i];

      if ( $.inArray(obj.support, supportList) === -1 ) supportList.push( obj.support );
      if ( $.inArray(obj.group, groupList) === -1 ) groupList.push( obj.group );

      for (var k in obj) {
        
        if ( k.indexOf("atoms") !== -1 || k.indexOf("inter") !== -1 ) { 
          var type = k.replace(/(atoms|inter)/,"");

          var aux = type.split("/");
          for (var j in aux) {        
            aux[j] = aux[j]
              .replace(/([a-z])([A-Z])/g, '$1 $2')
              .toLowerCase()
              .replace(/^./, function(str){ return str.toUpperCase(); });        
          }

          type = aux.join("/");

          var auxObj, $targetElem;
          if (k.indexOf("atoms") !== -1) {
            auxObj = atomsBtnLabel;
            $targetElem = $atomsBtn; 
          } 
          else {
            auxObj = interBtnLabel;
            $targetElem = $interBtn; 
          }
          
          if ( type in auxObj === false ) {
            $targetElem.append('<button class="btn btn-xs btn-success" key="' + k + '">' + type + '</button>');
            auxObj[type] = 1;
          }
        }
      }    
    }

    groupList.sort(function(a,b) { return a - b });
    supportList.sort(function(a,b) { return a - b });

    // Set the color palettes
    groupList.forEach(function(d) { colorScale(d); });  
    blueScale.domain( d3.extent(supportList) );    
  });

  $('body').on("click", ".atom-types-buttons .btn", function(){
    $('.chart-buttons .btn').removeClass("active");  
    var $elem = $(this).addClass("active");
    var value = $elem.attr("key");
    var title = $elem.text();
    
    initChart(value, title, "Atom");
  });

   $('body').on("click", ".inter-types-buttons .btn", function(){
    $('.chart-buttons .btn').removeClass("active");  
    var $elem = $(this).addClass("active");
    var value = $elem.attr("key");
  
    initChart(value,"Interaction");
  });

  $('body').on("click", '.group-opt-buttons .btn', function(){
    $('.group-opt-buttons .btn').removeClass("active");
    var $elem = $(this).addClass("active");
    
    switchGroup( $elem.attr("id") );   
  });
    
  d3.selectAll("button.group-btn").on("click",function(){ switchGroup(d3.select(this).attr("id")) });
  
  $(".radio-btn").on("click", function() {    
    $(".group-btn").removeClass("btn-active");     
    $(this).addClass("btn-active");
  });

  function initChart(type, title, infoType, group) {
    
    group = (group !== undefined) ? group : (contextOptions.atualGroup !== undefined) ? contextOptions.atualGroup : "groupChart";    
    var chart = "groupedChart";
    
    if( type !== contextOptions.atualType || group !== contextOptions.atualGroup ) {     
      var atualSortType = contextOptions.sortBy || "Key",
          selectedSlices = contextOptions.selectedSlices || false;
	  
      var multiview = (chart !== "groupedChart") ? true : false;
      
      contextOptions = { 
        "atualType": type,
        "atualTitle": title,
        "atualInfo": infoType,
        "atualGroup": group,
        "atualChart": chart,
        "isMultiview": multiview,
        "sortBy": atualSortType,
        "selectedSlices": selectedSlices
      };   

      $("#chartsDiv .alert").remove();
      
      constructChart(dataset);    
    }
  }
  
  function switchGroup(groupSelected) {
    if(groupSelected !== contextOptions.atualGroup) {
      if (contextOptions.atualType === undefined) {
        contextOptions.atualGroup = groupSelected; // Updating the chart which is now selected
      }
      else {   
        // Initialize a new chart.
        initChart(contextOptions.atualType,contextOptions.atualTitle,contextOptions.atualInfo,groupSelected);
      }
    }
  }

  function constructChart(data) {  
    updateView();          
    updateMeasures();     
    
    var targetDiv = "groupedChartDiv";            
    constructGroupedChart(data,targetDiv);   
  }

  function updateMeasures() {
    w = 400 - margin.left - margin.right,
    h = 300 - margin.top - margin.bottom;
	  
    if( contextOptions.atualChart === "groupedChart") {
      w = w * 2;
    }     
    
    maxRoundBand = w - 30;
    xScale = d3.scale.ordinal()
      .rangeRoundBands([0, maxRoundBand], .7);

    yScale = d3.scale.linear()
	    .range([h, 0]);
	    
    xAxis = d3.svg.axis()
	    .scale(xScale)
	    .orient("bottom");

    yAxis = d3.svg.axis()
	    .scale(yScale)
	    .orient("left")
	    .tickFormat(d3.format("d"))		
    
    yLineScale = d3.scale.linear()
	    .range([h, 0]);
    
    yLineAxis = d3.svg.axis()
	    .scale(yLineScale)
	    .orient("right")
	    .tickFormat(function(d) { return d; });
  }

  // Hide/show the correct chart screen.
  function updateView() {

    $('#groupedChartDiv').removeClass("hidden");
    // var showPieOptions = false;

    // d3.selectAll('.min-size-div').classed('hidden',true);
    // if ( contextOptions.isMultiview === true ) {        
    //   d3.selectAll('.normal-size-div').classed('hidden',true);     
    //   if (contextOptions.atualChart === "barChart") { d3.select("#minBarChartDiv").classed('hidden',false); }
    //   else { 
    //     d3.select("#minPieChartDiv").classed('hidden',false);
    //     d3.selectAll('#pieLegendDiv').classed('hidden',false);
    //     showPieOptions = true;
    //   }
    // }
    // else { d3.selectAll('.normal-size-div').classed('hidden',false); }        
  }

  function constructGroupedChart(data,targetDiv) {

    var selGroup = (contextOptions.atualGroup === "groupChart") ? groupList : supportList;
    var keys = (contextOptions.atualGroup === "groupChart") ? supportList : groupList;
   
    var values = {};
    for(var i in dataset) {
      var d = dataset[i];
      // Get the group type.
      var g = (contextOptions.atualGroup === "groupChart") ? d["group"] : d["support"];
      // Get the bar values inside a group.
      var k = (contextOptions.atualGroup === "groupChart") ? "support" : "group";
      
      var array = (values[g]) ? values[g] : [];
      var barKey = (contextOptions.atualGroup === "groupChart") ? Number(d[k]).toFixed(1) : d[k];
      array.push({"barKey": barKey, "value": d[contextOptions.atualType]});
      values[g] = array;
    }        
    values = d3.entries(values);
    
    var maxValue = d3.max(values,function(d){ return d3.max(d.value,function(d){ return Number(d.value); }) });
    
    var color;
    if (contextOptions.atualGroup === "groupChart") {
      color = blueScale; 
    }
    else { 
      color = colorScale;
    }
    
    groupedData = {
      "data": values,
      "groups": selGroup,
      "barKeys": keys,
      "max": maxValue,
      "colors": color
    }
      
    var chartExists = (d3.select("#" + targetDiv).html() !== "");      
    d3.select("#" + targetDiv).attr("type",contextOptions.atualType);
    
    // If chart to a specific type do not exist, construct it.  
    if ( chartExists === false ) {    
      newGroupedChart(groupedData,targetDiv);
    }  
    else {         
      updateGroupedChart(groupedData,targetDiv);
    }  
  }

  function newGroupedChart(groupedData,targetDiv) {
    var label = getTitle(contextOptions.atualTitle);
    
    var x0 = d3.scale.ordinal()
	    .rangeRoundBands([0, w - 30], .4)
	    .domain(groupedData.groups);
      
    var x1 = d3.scale.ordinal()
	    .domain(groupedData.barKeys)
	    .rangeRoundBands([0, x0.rangeBand()]);
	
    var y = d3.scale.linear()
	    .range([h, 0])
	    .domain([0,groupedData.max]);    
	      
    var xAxis = d3.svg.axis()
	    .scale(x0)
	    .orient("bottom");

    var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left")
	    .tickFormat(d3.format("d"));
	    
    var svg = d3.select("#" + targetDiv).append("div")
        .attr("class","col-md-12")
        .attr("id","group-" + contextOptions.atualType)
      .append("svg")        
        .attr("viewBox", "0 0 " + (w + margin.left*2 + margin.right*2) + " " + (h + margin.top + margin.bottom))
        .attr("preserveAspectRatio", "xMidYMid meet")    	
      .append("g") 
    	.attr("transform",function() {
    	  return "translate(" + margin.left + "," + margin.top + ")";
    	});
	  
    svg.call(groupedTip);
	    
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + h + ")")
      .call(xAxis)
      .append("text")
      .attr("dy", ".71em")
      .style("text-anchor", "start")
      .text(label)
      .attr("class","bar-label-xAxis")
      .attr("y","25px");
      
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text(function() { 	
        return (contextOptions.atualInfo === "Atom") ? "Number of vertices" : "Number of edges";
      })
      .attr("class","bar-label-yAxis");
    
    var groupPadding = 0;
    
    var groups = svg.append("g")
      .attr("class","data-group")
      .selectAll("g.group-rect")
      .data(groupedData.data)
      .enter().append("g")
      .attr("class", "group-rect")
      .attr("transform", function(d) { return "translate(" + (x0(d.key) + groupPadding) + "," + 0 + ")"; })
      .attr("position-group", function(d) { return x0(d.key) + groupPadding; });
    
    groups.selectAll("rect")
      .data( function(d){ return(d.value); }) 
      .enter().append("rect")
      .attr("width", x1.rangeBand())
      .attr("x", function(d) { return x1(d.barKey); })
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return h - y(d.value); })
      .style("fill", function(d) { 
        return groupedData.colors(d.barKey); 
      })
      .on('mouseover', function(d) { 
    	  var barKey = (contextOptions.atualGroup === "groupChart") ? "Support" : "Group";
    	  d3.select(this).call(groupedTip.show(barKey, d.barKey, d.value));
      })
      .on('mouseout', groupedTip.hide);
    
    var legend = svg.append("g")
    	.attr("class","legend-group")  
    	.attr("transform", function(d, i) { return "translate(" + (w + 30) + "," + (-24) + ")"; })
      .selectAll(".legend")
      .data(groupedData.barKeys)
      .enter().append("g")    
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(" + 0 + "," + i * 18 + ")"; });

    legend.append("rect")
      .attr("x", 5)
      .attr("width", 13)
      .attr("height", 13)
      .style("stroke", 'gray')
      .style("fill", function(d) { return groupedData.colors(d) });

    legend.append("text")
      .attr("x", 0)
      .attr("y", 6)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) {
        var label = (contextOptions.atualGroup === "groupChart") ? "Support" : "Group";
        return label + " " + d;
      });
  }

  function updateGroupedChart(groupedData, targetDiv) {  
    var label = getTitle(contextOptions.atualTitle);    
    
    var x0 = d3.scale.ordinal()
	    .rangeRoundBands([0, w - 30], .4)
	    .domain(groupedData.groups);
      
    var x1 = d3.scale.ordinal()
	    .domain(groupedData.barKeys)
	    .rangeRoundBands([0, x0.rangeBand()]);
	
    var y = d3.scale.linear()
	    .range([h, 0])
	    .domain([0,groupedData.max]);    
	      
    var xAxis = d3.svg.axis()
	    .scale(x0)
	    .orient("bottom");

    var yAxis = d3.svg.axis()
	    .scale(y)
	    .orient("left")
	    .tickFormat(d3.format("d"));
      
    var svg = d3.select("#" + targetDiv).select("svg g");  
    
    svg.select(".x.axis").transition().duration(1000).call(xAxis);
    svg.select(".bar-label-xAxis").text(label);    
    svg.select(".y.axis").transition().duration(1000).call(yAxis);
       
    var groupPadding = 0;    
    var groups = svg.select(".data-group").selectAll(".group-rect").data(groupedData.data);
	
    groups.exit().remove();
      
    groups.enter().append("g")
      .attr("class", "g group-rect")        
      .attr("transform", function(d) { return "translate(" + w + "," + 0 + ")"; });	
      
    var bars = groups.selectAll("rect").data( function(d){ return(d.value); });
    bars.enter().append("rect")    
      .attr("x", function(d) { return x1(d.barKey); })        
      .attr("height", function(d) { return h - y(0); })
      .attr("y", function(d) { return y(0); })
      .style("fill","white")
      .on('mouseover', function(d) { 	
	  var barKey = (contextOptions.atualGroup === "groupChart") ? "Support" : "Group";
	  d3.select(this).call(groupedTip.show(barKey, d.barKey, d.value));
      })
      .on('mouseout', groupedTip.hide);
    
    bars.exit().remove();
    
    bars.transition()
      .duration(1000)    
      .style("fill", function(d) { return groupedData.colors(d.barKey); })
      .attr("width", x1.rangeBand())
      .attr("x", function(d) { return x1(d.barKey); })    
      .attr("y", function(d) { return y(d.value); })
      .attr("height", function(d) { return h - y(d.value); });
           
    groups
      .attr("position-group", function(d) { return x0(d.key) + groupPadding; })
      .transition()
      .duration(1000)
      .attr("transform", function(d) { return "translate(" + (x0(d.key) + groupPadding) + "," + 0 + ")"; });      
      
    var legendGroup = svg.select(".legend-group");
    
    legendGroup.selectAll(".legend").remove();
   
    var legends = legendGroup.selectAll(".legend")
      .data(groupedData.barKeys)
      .enter().append("g")    
    	.attr("class", "legend")
    	.attr("transform", function(d, i) { return "translate(" + 0 + "," + i * 18 + ")"; });
    
    legends.append("rect")
      .attr("x", 5)
      .attr("width", 13)
      .attr("height", 13)
      .style("stroke", "gray")
      .style("fill", function(d) { return groupedData.colors(d) });

    legends.append("text")
      .attr("x", 0)
      .attr("y", 6)
      .attr("dy", ".35em")
      .style("text-anchor", "end")
      .text(function(d) {
    	  var label = (contextOptions.atualGroup === "groupChart") ? "Support" : "Group";
    	  return label + " " + d;
      });    
  }

  function getTitle(id) {
    return "# " + id;
  }

});
