$(document).ready(function() {

	var vertNumFile = path + "/vert_number.csv";
	var mappingFile = path + "/files_mapping.json";		    

    var vertNumber = {};
    var mapping = {};
    
    var groupsNumber;
    var support = ["0.1","0.2","0.3","0.4","0.5","0.6","0.7","0.8","0.9","1.0"];
    var pdbs;
    
    var colorScale = d3.scale.linear().range(["#FFFFFF","#276EB3"]);

    var colorNodes = d3.scale.category20();
    var colorEdges = d3.scale.category20();

    var atomTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {           
        return "<strong>Atom type:</strong> <span style='color:white'>" + d.atomType + "</span><br>";
      });

    var linkTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {      
        return "<strong>Interaction type:</strong> <span style='color:white'>" + d.interactionType + "</span>";
      });

    d3.csv(vertNumFile,function(csv) {
    	vertNumber = csv;

      	var groupsObj = {};
      	var numGroups = 0;
      	for (var i in vertNumber) {      		
	    	if ( (vertNumber[i].group in groupsObj) === false ){
	    		groupsObj[ vertNumber[i].group ] = 1;
	    		++numGroups;
	    	}
      	}
      	groupsNumber = numGroups;

      	d3.json(mappingFile, function(json) {    
			mapping = json;	  

			initGroupingTable(vertNumber);  
      	});
    });

    $('.table-div').on('click','a.graphs-link',showGraphs);
    
    $('.table-selection-buttons button').on('click',changeTables);
    
    function changeTables(){
		
		$('.table-selection-buttons button').removeClass("active");
        selectedTable = $(this).addClass("active").text();

		var tableId = (selectedTable === "Simple table") ? "simpleTableDiv" : "groupingTableDiv";
		
		$('.table-responsive').addClass("hidden");
		
		if ( $('#' + tableId).length === 0) {
		    if (tableId === "simpleTableDiv") initSimpleTable(vertNumber);    
		    else initGroupingTable(vertNumber);    
		}
		
		$('#' + tableId).removeClass("hidden");
		
		if (tableId === "simpleTableDiv"){
		    $('.fixedHeader').remove();
		    $('#secondaryOptionDiv').addClass('hidden');
		}
		else {
		    $('#secondaryOptionDiv').removeClass('hidden');
		    var table = $('#' + tableId + ' table');
		    new $.fn.dataTable.FixedHeader( table );
		}
    }

    function initGroupingTable(dataset) {
      
		var tableDiv = d3.select(".table-div").append("div")
		      .attr("class","table-responsive")
		      .attr("id","groupingTableDiv");
		
		var table = tableDiv.append("table").attr("class","table dataTable");
		
		var trHead = table.append("thead").append("tr");
		trHead.append("th").text("Group")
		trHead.append("th").text("Support")
		trHead.append("th").text("Pattern size")
		trHead.append("th").text("Occurrences");
		
		var bodyTable = table.append("tbody");
		
		var labels = ["group","support","patternSize","occurrences"];
		
		$.each(dataset,function(i) {
		    var d = dataset[i];
		    
		    var tr = bodyTable.append("tr");  
		    for (var l in labels) {   
				var label = labels[l];
				var html;
				if (label === "occurrences") { 
				    html = "<a class='graphs-link cursor-pointer' group='" + d["group"] + "' support='" + d["support"] + 
				      "' pattern='" + d["patternSize"] + "'>" + d[label] + "</a>";
				}
				else { html = d[label]; }
				
				tr.append("td").html( html );
		    }
		});
		
		applyGroupingDataTable();
    }
    
    function initSimpleTable(dataset) {
      
		var tableDiv = d3.select(".table-div").append("div")
			.attr("class", function(){ 
				return (groupsNumber > 6) ? "table-responsive fixed-first-col" : "table-responsive";
			})
		    .attr("id","simpleTableDiv");
		
		var table = tableDiv.append("table").attr("class","table dataTable table-striped");
		
		var trHead = table.append("thead").append("tr");
		trHead.append("th").attr("rowspan",2).text("Pattern size");
		
		var trHeadGroups = table.select("thead").append("tr");
		for (var s in support) {  
		    trHead.append("th")
		      .attr("colspan",groupsNumber)
		      .attr("class",function() { return "th-" + (s % 2); })
		      .html( function() { return (s == 0) ? "<strong>Support: </strong>" + support[s] : support[s] });
		      
		    for (var i=1; i <= groupsNumber; ++i) {
		    	trHeadGroups.append("th").attr("class","th-groups").text(i);
		    }
		}

		var bodyTable = table.append("tbody");
		
		var dataByPatternSize = {};
		var maxVal = 0;
		for (var i in dataset) {
			var d = dataset[i];  
			var pattern = ( dataByPatternSize[d.patternSize] ) ? dataByPatternSize[d.patternSize] : [];
			pattern.push(d);
			dataByPatternSize[d.patternSize] = pattern;

			if (maxVal < Number(d.occurrences)) maxVal = Number(d.occurrences);
		}		

		colorScale.domain([0,maxVal]);

		for (var k in dataByPatternSize) {
			var tr = bodyTable.append("tr");
			tr.append("td").text(k);
			for (var s in support) {
				for (var i=1; i <= groupsNumber; ++i) {
					tr.append("td").attr("id","td-" + k + "-" + i + "-" + support[s].replace(".","") );
				}
			}

			for (var j in dataByPatternSize[k] ) {
				var d = dataByPatternSize[k][j];
				$("#td-" + k + "-" + d.group + "-" + d.support.replace(".",""))
				  .css("background",function() { return colorScale(d.occurrences); })
				  .html(d.occurrences);
			}      
		}
    }

    function applyGroupingDataTable() {
		$.fn.dataTableExt.oSort["group-desc"] = function (x, y) {
		    return $.fn.dataTableExt.oSort["group-asc"](y,x);
		};
		
		$.fn.dataTableExt.oSort["group-asc"] = function (x, y) {       
		    return Number(x) - Number(y);
		}
		      
		var table = $('#groupingTableDiv table').DataTable({
			"columnDefs": [
				{ "type": "group", "targets": 0 },
				{ "visible": false, "targets": 0},
				{ "type": "support", "targets": 1 },
				{ "visible": false, "targets": 1},
				{"className": "dt-center", "targets": "_all"}
			],
			"displayLength": 25,
			"paginate": false,
			"info": false,
			"drawCallback": function ( settings ) {
			    var api = this.api();
			    var rows = api.rows( {page:'current'} ).nodes();
			    var groupCol = api.column(0,{page:'current'}).data();
			    var supportCol = api.column(1,{page:'current'}).data();
			    
			    var lastSupport = null;
			    var lastGroup = null;
			    
			    api.column(0, {page:'current'} ).data().each( function ( group, i ) {
			      var support = supportCol[i];
			      
		      		if (group !== lastGroup || support !== lastSupport) {
						$(rows).eq( i ).before(
						      '<td class="group group-col-0" colspan="1">Group: '+ group +'</td>' + 
						      '<td class="group group-col-1" colspan="1">Support: '+ support +'</td>'
						  );

						lastGroup = group;
						lastSupport = support; 
		      		}
			    });
			},
			initComplete: function () {
			    var api = this.api();
			    
			    var sortValues = function(a,b) { return Number(a) - Number(b) }			
			    
			    api.columns(0).indexes().flatten().each( function ( i ) {
					var column = api.column( i );
					
					var $select = $('#groupSelection');

					$select.append('<option value="">All</option>');

					$select.on('change', function(){ 
						var val = $.fn.dataTable.util.escapeRegex( $(this).val() );

						column.search( val ? '^'+val+'$' : '', true, false ).draw();
					});

					column.data().unique().sort(sortValues).each( function ( d, j ) {
					    $select.append( '<option value="'+d+'">'+d+'</option>' )
					});
			    })
			}
		});
		    
		new $.fn.dataTable.FixedHeader( table );
		
		$.fn.dataTable.ext.search.push(
		    function( settings, data, dataIndex ) {
				var minPat = parseInt( $('#minPattern').val(), 10 );
				var minOccur = parseInt( $('#minOccurrences').val(), 10 );
				
				var pattern = parseFloat( data[2] ) || 0; // use data for the pattern size column
				var occurrence = parseFloat( data[3] ) || 0; // use data for the pattern size column
			
				if ( ( isNaN( minPat ) && isNaN( minOccur ) ) || 
				     ( minPat <= pattern && isNaN( minOccur ) ) ||
				     ( isNaN( minPat ) && minOccur <= occurrence ) ||
				     ( minPat <= pattern && minOccur <= occurrence ) )
				{
				    return true;
				}

				return false;
		    }
		);
		
		$('#minPattern, #minOccurrences').keyup( function() {	   
		    table.draw();
		} );
		
		// Order by the grouping
		$('#groupingTableDiv table').on( 'click', 'td.group', function () {    
			var currentOrder = table.order()[0];
			var isGroupOne = $(this).hasClass('group-col-1');
			
			// Order by the support
			if(isGroupOne) {
			    if ( currentOrder[0] === 1 && currentOrder[1] === 'asc' ) {
				table.order( [ 1, 'desc' ] ).draw();
			    }
			    else {
				table.order( [ 1, 'asc' ] ).draw();
			    }
			}
			// Order by the group
			else {
			  
			    if ( currentOrder[0] === 0 && currentOrder[1] === 'asc' ) {
				table.order( [ 0, 'desc' ] ).draw();
			    }
			    else {
				table.order( [ 0, 'asc' ] ).draw();
			    }
			}
			
		});
    }

    function showGraphs() {

		var obj = $(this);
		var group = obj.attr("group"),
		    support = obj.attr("support"),
		    patternSize = obj.attr("pattern");

  		var patterns = mapping
  			.filter(function(d){ return (d.group == group && d.support == support); })
  			.map(function(d){
  				return d.patterns.filter(function(pObj){ return (pObj.patternSize == patternSize) });      			
  			});

  		var graphsDiv = d3.select('.main-graphs-div .row');
        graphsDiv.selectAll(".graph-div").classed("hidden", true);

  		$('#patternsViewModal').modal({ keyboard: true });

  		$('#patternsViewModal').on('shown.bs.modal', function () {
  			$(this).off('shown.bs.modal');			
  			
  			var graphDivSize = 3;
  			
			for (var k in patterns[0]) {
				var obj = patterns[0][k];				
				
				var graphFile = path + "/patterns/g"  + group + ".gsp_" + support + ".maximal.fp.patternIndex" + obj.patternLabel + ".json";

				var divId = "patternGraph-" + group + "-" + support.replace(".","_") + "-" + obj.patternLabel;
				
				if ( graphsDiv.select("#" + divId).empty() ) {					
					var newGraphDiv = graphsDiv.append("div")
		                .attr("class", "graph-div col-md-" + graphDivSize)
		                .attr("id", divId);

					var panel = newGraphDiv.append("div").attr("class", "box box-default box-solid");
					var panelHead = panel.append("div").attr("class", "box-header with-border");
					
					panelHead.append("p").html("<strong>Pattern: </strong>" + obj.patternLabel);

					var panelBox = panelHead.append('div').attr("class","box-tools pull-right");
		            panelBox.append("button").attr("class", "btn btn-box-tool").attr("data-widget","collapse").append("i").attr("class","fa fa-minus");

		            var panelBody = panel.append("div").attr("class", "box-body");

		            var graphConf = {                    
		                    "panelIndex": obj.patternLabel,
		                    "radius": 6,
		                    "linkDistanceBase": 27,
		                    "setLinkDistanceDinamically": true,
		                    "maxHeight": 100,
		                    "maxWidth": $( panelBody[0] ).width()
		                };

		            createGraph(graphFile, panelBody, graphConf);
		        }
		        else {				        
		        	graphsDiv.select("#" + divId).classed("hidden", false);
		        }
			}
  		});	
	}

	function createGraph(file, targetDiv, graphConf) {
    
        d3.json(file, function(error, graph) {

            var maxWidth = graphConf.maxWidth;
            var maxHeight = graphConf.maxHeight;
            var radius = graphConf.radius;

            var svg = targetDiv.append("svg")	                
                .attr("viewBox", "0 0 " + maxWidth + " " + maxHeight)
                .attr("preserveAspectRatio", "xMidYMid meet")      
                .call(atomTip)
                .call(linkTip);

            var node, link;

            var k = Math.sqrt(graph.nodes.length / (maxWidth * maxHeight));
            var force = d3.layout.force()
                .charge(-1 / k)
                .gravity(3 * k)
                .size([maxWidth, maxHeight])
                .nodes(graph.nodes)
                .links(graph.links)
                .linkDistance( graphConf.linkDistanceBase )
                .start();

            // If the links is to be set dinamically, it will use the property distance in each Link object to dinamically set the link size.
            if ( graphConf.setLinkDistanceDinamically ) {
                var maxDistance = d3.max(graph.links, function(d) {
                    return d.distance;
                });

                force.linkDistance(function(d) {
                   return (graphConf.linkDistanceBase * (d.distance / maxDistance));
                });    
            }            

            link = svg.append("g")
               .selectAll(".link")
               .data(graph.links)
               .enter().append("line")
               .attr("class", "link")
               .attr("stroke", function(d) {          
                 return colorEdges( d.interactionTypeInt );
               })
               .style("stroke-opacity", .8)
               .style("stroke-width", "3px")
               .on("mouseover", function(d) {
                 d3.select(this).call( linkTip.show(d) );
               })
               .on("mouseout", function(d) {
                 d3.select(this).call( linkTip.hide() );
               });

            node = svg.append("g")
                .selectAll("circle")
                .data(graph.nodes)
                .enter()
                .append("circle")
                    .attr("class", "nodes")
                    .attr("r", radius - .75)        
                    .style("fill", function(d) {
                        return colorNodes( d.atomTypeInt );
                    })
                    .style("stroke", function(d) {
                        return d3.rgb( colorNodes( d.atomTypeInt ) ).darker();
                    })
                    .style("stroke-width", "1.5px")
                    .call(force.drag)
                    .on("mouseover", function(d) {
                        d3.select(this).call(atomTip.show(d));
                    })
                    .on("mouseout", function(d) {
                        d3.select(this).call(atomTip.hide());
                    });

            force.on("tick", function() {                
                node.attr("cx", function(d) {                     
                        return d.x = Math.max(radius, Math.min(maxWidth - radius, d.x));
                    })
                    .attr("cy", function(d) { 
                        return d.y = Math.max(radius, Math.min(maxHeight - radius, d.y));                        
                    });

                link.attr("x1", function(d) { return d.source.x; })
                    .attr("y1", function(d) { return d.source.y; })
                    .attr("x2", function(d) { return d.target.x; })
                    .attr("y2", function(d) { return d.target.y; });
            });	        
        });
    }

});