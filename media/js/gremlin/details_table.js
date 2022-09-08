$(document).ready(function() {
  
  var ligands = {};
  var ligands_by_pdb = {};

  var dataset;

  var groupFile = path + "/" + "group-info.csv";

  var colorNodes = d3.scale.category20();
  var colorEdges = d3.scale.category20();

  var atomTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        var res_lig_title = (d.isLigand) ? "Ligand" : "Residue";
        return "<strong>" + res_lig_title + ":</strong> <span style='color:white'>" + d.residueName + "</span><br><br>" +
          "<strong>" + res_lig_title + " Number:</strong> <span style='color:white'>" + d.residueNumber + "</span><br><br>" +
          "<strong>Atom name:</strong> <span style='color:white'>" + d.atomName + "</span><br><br>" +
          "<strong>Chain:</strong> <span style='color:white'>" + d.chain + "</span><br><br>" +
          "<strong>Atom type:</strong> <span style='color:white'>" + d.atomType + "</span><br>";
      });

  var linkTip = d3.tip()
    .attr('class', 'd3-tip')
    .offset([-10, 0])
    .html(function(d) {      
      var sourceName = d.source.residueName + d.source.residueNumber + ":" + d.source.atomName;
      var targetName = d.target.residueName + d.target.residueNumber + ":" + d.target.atomName;

      return "<strong>Edge: </strong> <span style='color:white'>" + sourceName + " - " + targetName + "</span><br><br>" + "<strong>Interaction type:</strong> <span style='color:white'>" + d.interactionType + "</span><br><br>" + "<strong>Distance:</strong> <span style='color:white'>" + Number(d.distance).toFixed(5) + " Å</span><br>";
    });
  
  d3.csv(groupFile,function(csv) {
    
    dataset = csv;

    var $table = $("#groupDetails");    
    var $body = $table.find("tbody");
    
    var groups = {};
    var url = "http://www.pdb.org/pdb/explore.do?structureId=";

    var groupedCSV = d3.nest()
    	.key(function(d) { return d.group })
    	.key(function(d) { return d.pdb + ":" + d.chain })
    	.entries(csv);

    groupedCSV.forEach(function(d) {

    	var $row = $("<tr></tr>").appendTo($body);

    	var $col1 = $("<td></td>").appendTo($row);

    	// var ligIconHtml = '<a href="#" class="ligand-view" title="Click here to see all the ligands of this group." group="' + d.key + '"><span class="fa fa-share-alt"></span></a>';
		  var graphIconHtml = '<a href="#" class="graph-view" title="Click here to see all the input graphs of this group." group="' + d.key + '"><span class="fa fa-connectdevelop"></span></a>';
    	$col1.append( d.key + " " + graphIconHtml );

    	var $col2 = $("<td></td>").appendTo($row);

    	var tdHtml = d.values.map(function(d){ 
	    	var pdbId = d.key.substr(0,4);
	    	var pdbLink = '<a href="' + url + (pdbId) + '" target="_blank">' + d.key + '</a>';

	    	return d.values.map(function(d) { return d.graph + " (" + pdbLink + ")" }).join(", ");
	    }).join(", ");

    	$col2.html(tdHtml);
    });
    
    $table.DataTable({
		"paginate": false,
		"info": false
    });       
  })
      
	$("tbody").on("click","tr td a.ligand-view", function() {

		var group = $(this).attr("group");
		
		var imgUrl = 'http://www.pdb.org/pdb/images/';
		var pdbUrl = 'http://www.pdb.org/pdb/explore.do?structureId=';
		var ligUrl = 'http://pdb.org/pdb/ligand/ligandsummary.do?hetId=';

		var groupData = dataset.filter(function(d){ return d.group == group; });
		
		var $modal = $('#ligandsViewModal .modal-body .row');
		$modal.find(".ligands-div").addClass("hidden");

		var divId = "ligandsDiv-" + group;

		if ( $modal.find("#" + divId).length === 0 ) {
			var $newLigandsDiv = $('<div class="col-md-12 ligands-div" id="' + divId + '"></div>').appendTo($modal);

			var ligandsRead = {};
			for (var k in groupData) {
				var obj = groupData[k];

				if ( obj.ligand in ligandsRead === false ) {
					ligandsRead[ obj.ligand ] = obj.ligand;

					var linkToLigand = '<a href="' + ligUrl + obj.ligand + '" target="_blank" title="Click here to see this ligand at the pdb.org">' + obj.ligand + '</a>';

					var thumbnail = 
						'<div class="col-md-2">' +
							'<div class="thumbnail" id="thumb-' + obj.ligand + '">' +
								'<img src="' + imgUrl + obj.ligand + '_600.gif" alt="' + obj.ligand + '" title="Click here to see the original image"/>' +
								'<div class="caption">' +
					  				'<p>Ligand: <strong>' + linkToLigand + '</strong></p>' +
					  				'<p>PDB id: <a href="' + pdbUrl + obj.pdb + '" target="_blank"' +
					    				' title="Click here to see this PDB at the pdb.org">' + obj.pdb + '</a></p>' +
								'</div>' +
							'</div>' +
						'</div>';

					$newLigandsDiv.append(thumbnail);
				}
			}
		}

		$modal.find("#" + divId).removeClass("hidden");

		$('#ligandsViewModal').modal({ keyboard: true });
	});
      
	$('#ligandsViewModal').on('click','.thumbnail img',function(){
	  window.open(this.src,"_blank");
	});
  
	$("tbody").on("click","tr td a.graph-view",function() {
		
		var group = $(this).attr("group");		
		var groupData = dataset.filter(function(d){ return d.group == group; });

		var $modal = $('#graphsViewModal .modal-body .row');
		$modal.find(".graphs-div").addClass("hidden");

		var divId = "graphsDiv-" + group;

		$('#graphsViewModal').modal({ keyboard: true });

		$('#graphsViewModal').on('shown.bs.modal', function () {
  			$(this).off('shown.bs.modal');

			if ( $modal.find("#" + divId).length === 0 ) {

				var $newLigandsDiv = $('<div class="col-md-12 graphs-div" id="' + divId + '"></div>').appendTo($modal);

				var graphDivSize = 3;

				for (var k in groupData){
					var obj = groupData[k];
					
					var newGraphDiv = d3.select( $newLigandsDiv.get(0) ).append("div")
		                .attr("class", "graph-div col-md-" + graphDivSize)
		                .attr("id", divId);

					var panel = newGraphDiv.append("div").attr("class", "box box-default box-solid");
					var panelHead = panel.append("div").attr("class", "box-header with-border");
					
					panelHead.append("p").html("<strong>PDB: </strong>" + obj.pdb + ":" + obj.chain + "</br><strong>Graph: </strong>" + obj.graph);

					var panelBox = panelHead.append('div').attr("class","box-tools pull-right");
		            panelBox.append("button").attr("class", "btn btn-box-tool").attr("data-widget","collapse").append("i").attr("class","fa fa-minus");

		            var panelBody = panel.append("div").attr("class", "box-body");

					var graphFile = path + "/graphs/json_1.0/g" + obj.group + "." + obj.pdb + "." + obj.chain + "." + obj.graph + ".graph.json";

		            var graphConf = {                    
		                    "panelIndex": obj.graph,
		                    "radius": 6,
		                    "linkDistanceBase": 27,
		                    "setLinkDistanceDinamically": true,
		                    "maxHeight": 100,
		                    "maxWidth": $( panelBody[0] ).width()
		                };

		            createGraph(graphFile, panelBody, graphConf);
				}			
			}
		});

		$modal.find("#" + divId).removeClass("hidden");


 //      var td = this.parentNode;
 //      var group = td.textContent;
 //      var links = $(td).siblings("td").find("a");
 //      var pdbs = $.map($(td).siblings("td").find("a"),function(d){ return d.text });
      
 //      var pdbUrl = 'http://www.pdb.org/pdb/explore.do?structureId=';
      
 //      $('#graphByGroupViewModal .modal-header .modal-title').text("Group " + group + " graphs");      
 //      var modal = $('#graphByGroupViewModal .modal-body .row').empty();
      
 //      for (var i in pdbs) {
	// var pdb = pdbs[i];
	// var filename = inputGraphsFile + pdb + ".xml.svg";
	// var thumbnail = '<div class="col-md-3">' +
	//   '<div class="thumbnail" id="thumb-' + pdb + '">' +
	//       '<img src="' + filename + '" alt="' + pdb + '"/>' +
	//       '<div class="caption">' +
	// 	'<h5><strong><a href="' + pdbUrl + pdb.substr(0,4) + '" target="_blank"' +
	// 	      ' title="Click here to see this PDB at the pdb.org">' + pdb + '</a></strong></h5>' +
	//       '</div>' +
	//   '</div>' +
	// '</div>';
	// modal.append(thumbnail);
	    
	
 //      }
      
 //      $('#graphByGroupViewModal').modal({ keyboard: true });
	}); 
	
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