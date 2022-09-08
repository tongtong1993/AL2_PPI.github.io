$(document).ready(function() {

    var listGraphsFile = path + "/" + "list-graphs";
    var listPatternGraphsFile = path + "/" + "list-patterns-graphs";
    var groupInfoFile = path + "/" + "group-info.csv";

    var listInputGraphs = [];
    var listPatternsGraphs = [];
    
    var groupsList = [];
    var graphsByGroup = {};
    var verticesNumber = {};

    var patternsByPanelIndex = {};

    var selectedSupport;
    var contextOptions = {};

    var graphRadius = 6 - 0.75;

    var interGlviewers = {};
    
    var inputGraphAtomTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {
        var res_lig_title = (d.isLigand) ? "Ligand Residue" : "Residue";
        return "<strong>" + res_lig_title + ":</strong> <span style='color:white'>" + d.residueName + "</span><br><br>" +
          "<strong>" + res_lig_title + " Number:</strong> <span style='color:white'>" + d.residueNumber + "</span><br><br>" +
          "<strong>Atom name:</strong> <span style='color:white'>" + d.atomName + "</span><br><br>" +
          "<strong>Chain:</strong> <span style='color:white'>" + d.chain + "</span><br><br>" +
          "<strong>Atom type:</strong> <span style='color:white'>" + d.atomType + "</span><br>";
      });

    var patternGraphAtomTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {           
        return "<strong>Atom type:</strong> <span style='color:white'>" + d.atomType + "</span><br>";
      });

    var patternGraphLinkTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {      
        return "<strong>Interaction type:</strong> <span style='color:white'>" + d.interactionType + "</span>";
      });

    var inputGraphLinkTip = d3.tip()
      .attr('class', 'd3-tip')
      .offset([-10, 0])
      .html(function(d) {      
        var sourceName = d.source.residueName + d.source.residueNumber + ":" + d.source.atomName;
        var targetName = d.target.residueName + d.target.residueNumber + ":" + d.target.atomName;

        return "<strong>Edge: </strong> <span style='color:white'>" + sourceName + " - " + targetName + "</span><br><br>" + "<strong>Interaction type:</strong> <span style='color:white'>" + d.interactionType + "</span><br><br>" + "<strong>Distance:</strong> <span style='color:white'>" + Number(d.distance).toFixed(5) + " Å</span><br>";
      });

    var colorNodes = d3.scale.category20();
    var colorEdges = d3.scale.category20();

    $('.support-buttons button').on("click", function(){
        $('.support-buttons button').removeClass("active");

        selectedSupport = $(this).addClass("active").text();

        // Create a new configuration to the selected Support.
        if ( selectedSupport in contextOptions === false ) newContextOptions();

        readData();
    });

    $('body').on("click", ".multiselect-div .dropdown-toggle",function() {    
        $(this).parent().toggleClass('open');
    });

    $('body').on('click', function(e) {

        if ( !$('.multiselect-div').is(e.target) &&
                $('.multiselect-div').has(e.target).length === 0 &&
                    $('.multiselect-div.open').has(e.target).length === 0
            ){
                $('.multiselect-div').removeClass('open');
                return;
            }

        $('.multiselect-div').each(function() {
            if (!$(this).is($(e.target).parents('.multiselect-div'))) {
              $(this).removeClass('open');
            }
        });
    });

    $('body').on("click", ".atom-color-selector ul li a", function(event) {
    	var selValue = $(this).text();

    	var colorNodesBy;        
        if (selValue === "Atoms type") colorNodesBy = "atomType";
        else if (selValue === "Molecule") colorNodesBy = "molecule";

        $(this).parents('ul').siblings('button').html(selValue + ' <span class="caret"></span>');

        colorGraphNodes(colorNodesBy);
    });

    $('body').on("click", ".groups-selector ul li input", function(event) {
        var multiselect = $(this).parents('.multiselect-div');
        var selections = getSelections(multiselect);

        contextOptions[selectedSupport]["groupSelection"] = selections;

        var text;
        if ( selections.length === 0 ) { text = "Any selected group"; }
        else { text = selections.length + " selected group(s)"; }

        multiselect.find('.multiselect-selected-text').text(text);

        updateGraphDivs();
    });

    $('body').on("click", ".vertices-num-selector ul li input", function(event) {
        var multiselect = $(this).parents('.multiselect-div');
        var selections = getSelections(multiselect);

        contextOptions[selectedSupport]["vertNumberSelection"] = selections;

        var text;
        if ( selections.length === 0 ) { text = "Any selected vertice number"; }
        else { text = selections.length + " selected vertice(s) number"; }

        multiselect.find('.multiselect-selected-text').text(text);

        updateGraphDivs();
    });

    $('body').on("click", ".atom-type-selector ul li input", function(event) {
        var multiselect = $(this).parents('.multiselect-div');
        var selections = getSelections(multiselect);

        contextOptions[selectedSupport]["atomTypeSelection"] = selections;

        var text;
        if ( selections.length === 0 ) { text = "Any selected atom"; }
        else { text = selections.length + " selected atom(s)"; }

        multiselect.find('.multiselect-selected-text').text(text);

       	updateGraphDivs();
    });

    $('body').on("click", ".inter-type-selector ul li input", function(event) {
        var multiselect = $(this).parents('.multiselect-div');
        var selections = getSelections(multiselect);

        contextOptions[selectedSupport]["interTypeSelection"] = selections;

        var text;
        if ( selections.length === 0 ) { text = "Any selected interaction"; }
        else { text = selections.length + " selected interaction(s)"; }

        multiselect.find('.multiselect-selected-text').text(text);

    	updateGraphDivs();
    });

    //$('body').on("click", ".show-ligand-link", displayLigands);

  	$('#ligandsViewModal').on('click','.thumbnail img',function(){
    	window.open(this.src,"_blank");
	});
	
    $('body').on("click", ".pattern-filter", function() {

        var $linkElem = $(this);

        $(".pattern-graph-div .box").removeClass("border-success");
        var $selectedPanel = $linkElem.closest('.box').addClass("border-success");    

        var panelIndex = $linkElem.attr("panelIndex");
    	var patternIndex = Number( $linkElem.attr("patternIndex") );
        var patternGroup = $linkElem.attr("group");

        var inputGraphs = patternsByPanelIndex[panelIndex];

        contextOptions[selectedSupport]["filteredByPattern"] = true;
        contextOptions[selectedSupport]["patternIndex"] = patternIndex;
        contextOptions[selectedSupport]["patternGroup"] = patternGroup;
        contextOptions[selectedSupport]["showInputGraphs"] = inputGraphs;

        updateGraphDivs();
    });

    $('body').on("click", '.remove-pattern-btn', function() {
    	contextOptions[selectedSupport]["filteredByPattern"] = false;
        contextOptions[selectedSupport]["patternIndex"] = "";
        contextOptions[selectedSupport]["patternGroup"] = "";
        contextOptions[selectedSupport]["showInputGraphs"] = [];

        $(".pattern-graph-div .box").removeClass("border-success");

        updateGraphDivs();
    });

    $('body').on('click', '.show-inter-view', showInteractionViewer);

    $('body').on('keyup', '.search-nodes-input', searchNodes);

    function newContextOptions() {    
        contextOptions[selectedSupport] = {
          "vertNumberSelection": [],
          "groupSelection": [],
          "atomTypeSelection": ["Acceptor","Aromatic", "Donor","Hydrophobic","Negative","Positive"], 
            "interTypeSelection": ["Aromatic","Hydrogen bond","Hydrophobic","Repulsive","Salt bridge","Disulfide Bridge"],
            "filteredByPattern": false,
          "patternIndex": "",
            "patternGroup": "",
            "showInputGraphs": []
        };
    }

    // $('#glv-sphere').on('click', function() {
    //     glv_id = $(".inter-view-div:visible").attr('id').substring(11)
    //     var glviewer = interGlviewers[glv_id]
    //     //console.log(glviewer)
    //     glviewer.setStyle({},{sphere:{}});
    //     glviewer.render();
    // });

    // $('#glv-cartoon').on('click', function() {
    //     glv_id = $(".inter-view-div:visible").attr('id').substring(11)
    //     var glviewer = interGlviewers[glv_id]
    //     //console.log(glviewer)
    //     glviewer.setStyle({},{cartoon:{}});
    //     glviewer.render();
    // });

    function readData(){

        var $div = $('.main-pattern-graph-div, .main-input-graph-div')
            .removeClass("hidden")
            .css("opacity",0);
        
        queue()            
            .defer(readGroupInfo)
            .defer(readInputGraphs)
            .defer(readPatternGraphs)
            .await(function(error){

                if (error === null) {
                                                        
                    createNewMenu();                    
                    loadPatternGraph();
                    loadInputGraph();

                    var numGraphs = $("#inputGraph-Support-" + selectedSupport.replace(".","_") + " .box:visible").length;
                    $('.graphs-info').removeClass("hidden").html("Number of showed graphs: <strong>" + numGraphs + "</strong>");
                    
                    var graphDivId = "inputGraph-Support-" + selectedSupport.replace(".","_");
                    var graphDiv = d3.select("#" + graphDivId);


                    $div.css("opacity", 1);
                    $('.disabled').removeClass("disabled").attr("disabled", null);
                }

            });     
    }

    function createNewMenu(){

        var $mainDiv = $('#secondaryOptionDiv');

        $mainDiv.find(".opt-div").addClass("hidden");
        
        var menuId = "optDiv-Support-" + selectedSupport.replace(".","_");
        if ( $mainDiv.find( "#" + menuId ).length === 0 ) {

            var $newMenu = $( '<div class="opt-div" id="' + menuId + '"></div>' );
            $mainDiv.append( $newMenu);

            var atomColorSelectorHtml =
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label">Color nodes by:</label>' +
                        '<div class="col-md-3">' +
				            '<div class="btn-group btn-block atom-color-selector">' +
				              '<button type="button" class="btn btn-xs btn-block btn-default dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
				                'Atoms type <span class="caret"></span>' +
				              '</button>' +
				              '<ul class="dropdown-menu">' +
				                '<li><a><label>Atoms type</label></a></li>' +
				                '<li><a><label>Molecule</label></a></li>' +					           
				              '</ul>' +
				            '</div>' +
		        		'</div>' +
		        	'</div>' +
		        '</div>';


            $newMenu.append(atomColorSelectorHtml);

            var atomTypeSelectorHtml = 
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label"> Filter by atoms type: </label>' +
                        '<div class="col-md-3">' +
                            '<div class="btn-group btn-group-justified multiselect-div disabled atom-type-selector" disabled="disabled">' +
                                '<button type="button" class="dropdown-toggle btn btn-default btn-xs disabled" aria-expanded="false" disabled="disabled">' +
                                    '<span class="multiselect-selected-text"> 6 selected atom(s) </span> <b class="caret"></b>' +
                                '</button>' +
                                '<ul class="dropdown-menu">' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Acceptor">Acceptor</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Aromatic">Aromatic</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Donor">Donor</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Hydrophobic">Hydrophobic</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Negative">Negative</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Positive">Positive</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Disulfide Bridge">Disulfide Bridge</label></a></li>' +
                                '</ul>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            $newMenu.append(atomTypeSelectorHtml);
             
            var interTypeSelectorHtml =
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label">Filter by interactions type:</label>' +
                        '<div class="col-md-3">' +
                            '<div class="btn-group btn-group-justified multiselect-div disabled inter-type-selector" disabled="disabled">' +
                                '<button type="button" class="dropdown-toggle btn btn-default btn-xs disabled" aria-expanded="false" disabled="disabled">' +
                                    '<span class="multiselect-selected-text">5 selected interaction(s)</span><b class="caret"></b>' +
                                '</button>' +
                                '<ul class="dropdown-menu">' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Aromatic">Aromatic stacking</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Hydrogen bond">Hydrogen bond</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Hydrophobic">Hydrophobic</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Repulsive">Repulsive</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Salt bridge">Salt bridge</label></a></li>' +
                                    '<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="Disulfide bridge">Disulfide bridge</label></a></li>' +
                                '</ul>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            $newMenu.append(interTypeSelectorHtml);

            var groupsSelectorHtml =
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label">Filter by group:</label>' +
                        '<div class="col-md-3">' +
                            '<div class="btn-group btn-group-justified multiselect-div disabled groups-selector" disabled="disabled">' +
                                '<button type="button" class="dropdown-toggle btn btn-default btn-xs disabled" aria-expanded="false" disabled="disabled">' +
                                    '<span class="multiselect-selected-text"></span> <b class="caret"></b>' +
                                '</button>' +
                                '<ul class="dropdown-menu"></ul>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            $newMenu.append(groupsSelectorHtml);

            var verticesNumSelectorHtml =
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label">Filter by vertices number:</label>' +
                        '<div class="col-md-3">' +
                            '<div class="btn-group btn-group-justified multiselect-div disabled vertices-num-selector" disabled="disabled">' +
                                '<button type="button" class="dropdown-toggle btn btn-default btn-xs disabled" aria-expanded="false" disabled="disabled">' +
                                    '<span class="multiselect-selected-text"></span> <b class="caret"></b>' +
                                '</button>' +
                                '<ul class="dropdown-menu"></ul>' +
                            '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            $newMenu.append(verticesNumSelectorHtml);

            var removePatternBtnHtml =
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label">Remove pattern selection:</label>' +
                        '<div class="col-md-3">' +                        	
                            '<button type="button" class="btn btn-block btn-xs btn-default remove-pattern-btn">Remove pattern selection!</button>' +
                        '</div>' +
                    '</div>' +
                '</div>';

            $newMenu.append(removePatternBtnHtml);

            var findResiduesHtml =
                '<div class="row secondary-opt">' +
                    '<div class="col-md-12">' +
                        '<label class="col-md-3 control-label">Search for a residue or atom:</label>' +
                        '<div class="col-md-3">' +
                            '<input type="text" class="form-control input-xs search-nodes-input" placeholder="E.g.: LEU83, N, LEU83:N">'
                        '</div>' +
                    '</div>' +
                '</div>';

            $newMenu.append(findResiduesHtml);

            var $multiselectDiv = $newMenu.find('.groups-selector');            
            var $ul = $multiselectDiv.find('ul');
            
            var groupsObj = {};
            for (var k in graphsByGroup) {            
                var groups = graphsByGroup[k].group;

                for (var i in groups) {
                    if ( (groups[i] in groupsObj) === false ){
                        groupsObj[ groups[i] ] = 1;
                        $ul.append('<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="' + groups[i] + '">' + groups[i] + '</label></a></li>');
                    }
                }
            }

            var $li = $ul.find("li").sort(function(a,b){
                var valA = Number( $(a).find("input[type=checkbox]").val() );
                var valB = Number( $(b).find("input[type=checkbox]").val() );
                
                return valA - valB;
            });

            $li.detach().appendTo($ul);      

            $multiselectDiv.find('.multiselect-selected-text').text( Object.keys(groupsObj).length + " selected group(s)");
            $multiselectDiv.find('.dropdown-menu input').prop("checked", true);

            $newMenu.find('.multiselect-div .dropdown-menu input').prop("checked", true);
        }

        $mainDiv.find( "#" + menuId ).removeClass("hidden");
    }

    function readGroupInfo(callback) {
        
        if ( $.isEmptyObject(graphsByGroup) == false ) {

        	contextOptions[selectedSupport]["groupSelection"] = groupsList;

            callback(null);
        }
        else {

            d3.csv(groupInfoFile, function(error, data){    

                if (error) callback("error");
 
                var groupsObj = {};
                
                for (var i in data) {

                	var graphObj = ( data[i].graph in graphsByGroup ) ? graphsByGroup[ data[i].graph ] : {};
                    
                	if ( data[i].graph in graphsByGroup === false ) {
                        var newObj = { "graph": data[i]["graph"], "group": [ data[i]["group"] ], "ligand": data[i]["ligand"] };
                        
                        if ( "subgroup" in data[i] ) newObj["subgroup"] = data[i]["subgroup"];

                		graphsByGroup[ data[i]["graph"] ] = newObj;
                	}
                	else {
                		var graphObj = graphsByGroup[ data[i]["graph"] ];                	
                		graphObj["group"].push( data[i]["group"] );
                	}

                    if ( (data[i].group in groupsObj) === false ){
                        groupsObj[ data[i].group ] = 1;
                    }
                }    

                groupsList = Object.keys(groupsObj);

                contextOptions[selectedSupport]["groupSelection"] = groupsList;                

                callback(null);
            }); 
        }
    }

    function readInputGraphs(callback){

        if ( listInputGraphs.length > 0 ) {
            callback(null);  
        } 
        else {                    
            $.get(listGraphsFile, function(data){
                        
                var lines = data.split("\n");
                
                listInputGraphs = lines.map(function(d){

                    if ( d === "" ) return undefined;

                    var regex = /.*\/json_(\d+(\.\d+)*)/;
                    
                    var match = d.match(regex);
                    if ( match ) {                                

                        var filename = d.replace(/^.*[\\\/]/, '')
                        var info = filename.split(".");

                        var group = info[0].replace("g","");                        
                        var support = match[1];                       
                    	
                        var pathFile = path + "/" + d;
                        return { "pdb": info[1], "chain": info[2], "graph": info[3], "group": group, "support": support, "file": pathFile };
                    }
                    else return undefined;

                }).filter(function(d) { return (typeof d !== 'undefined') }).sort(function(a,b){ return a.graph - b.graph });
                
                callback(null);

            }).fail(function(){

                callback("error");

            });
        }
    }

    function readPatternGraphs(callback) {

        if (listPatternsGraphs.length > 0) {
            callback(null);
        }
        else {

            $.get(listPatternGraphsFile, function(data){ 
                        
                var lines = data.split("\n");

                listPatternsGraphs = lines.map(function(d){

                    if ( d === "" ) return undefined;

                    var regex = /g(\d+)\.gsp_(\d+(\.\d+)*)\.maximal\.fp\.patternIndex(\d+)\.json/;

                    var match = d.match(regex);
                    if (match) {
                        var group = match[1];
                        var support = match[2];
                        var patternIndex = match[4];

                        var pathFile = path + "/" + d;
                        return { "group": group, "support": support, "patternIndex": patternIndex, "file": pathFile };
                    }
                    else undefined;

                }).filter(function(d) { return (typeof d !== 'undefined') }).sort(function(a,b){ return a.group - b.group });
                
                callback(null);
            }).fail(function(){

                callback("error");

            });
        }
    }

    function loadInputGraph() {

        var graphsDiv = d3.select(".main-input-graph-div");

        graphsDiv.selectAll(".input-graph-div").classed("hidden", true);

        var graphDivId = "inputGraph-Support-" + selectedSupport.replace(".","_");
        var graphDiv = d3.select("#" + graphDivId);

        if ( graphDiv.empty() ) {

            graphDiv = graphsDiv.append("div")
                .attr("class","col-md-12 input-graph-div")
                .attr("id", graphDivId)
    
            var graphDivSize = 3;
            var graphPerRow = 12/graphDivSize;
            var rowCount = 0;
            var row = graphDiv.append("div").attr("class","row");

            var q = queue(200);
            //console.log(listInputGraphs)
            for ( var k in listInputGraphs ) {
                
                var obj = listInputGraphs[k];

                if ( obj.support != selectedSupport ) continue;

                var graphObj = graphsByGroup[ obj.graph ];            
               
                var group = obj.group;

	            var newGraphDiv = row.append("div")
	                .attr("class", "col-md-" + graphDivSize)
	                .attr("group", group )
	                .attr("graph", obj.graph );

                //console.log(k,obj.graph)
	            var panel = newGraphDiv.append("div").attr("class", "box box-default box-solid");

	            var panelHead = panel.append("div").attr("class", "box-header with-border");

                var panelBox = panelHead.append('div').attr("class","box-tools pull-right");
                panelBox.append("button")
                        .attr("class", "btn btn-box-tool show-inter-view")
                        .attr("pdb", obj.pdb)
                        .attr("chain", obj.chain)
                        .attr("ligand", graphObj.ligand)
                    .append("i")
                        .attr("class","fa fa-eye");
                panelBox.append("button").attr("class", "btn btn-box-tool").attr("data-widget","collapse").append("i").attr("class","fa fa-minus");
	            
                var molText = '<strong>' + obj.pdb + ":" + obj.chain + '</strong>, <strong>Graph:</strong> ' + obj.graph + ', ' + 
                    '</br><strong>Ligand Chain:</strong> ' +  graphObj.ligand;
                var rowHtml = '<p>' + molText + '</p>';
	            $( panelHead[0] ).append(rowHtml);

                var groupText = '<strong>Group:</strong> ' + group;
                if ( "subgroup" in graphObj ) groupText += ', <strong>Subgroup:</strong> ' + graphObj.subgroup;
                rowHtml = '<p>' + groupText + '</p>';
                $( panelHead[0] ).append(rowHtml);

	            var panelBody = panel.append("div").attr("class", "box-body");
	        
	            var graphConf = {
	                    "dataType": "input",
	                    "panelIndex": k,
	                    "radius": graphRadius,
	                    "linkDistanceBase": 27,
	                    "setLinkDistanceDinamically": true,
	                    "maxHeight": 130,
	                    "maxWidth": $( panelBody[0] ).width()
	                };
                    
    	        q.defer(createGraph, obj.file, panelBody, graphConf);    	        
            }

            q.await(function(error) {
            	if (error === null) {
            		var optDivId = "optDiv-Support-" + selectedSupport.replace(".","_");
    	            var $multiselectDiv = $('#' + optDivId + ' .vertices-num-selector');
    	            var $ul = $multiselectDiv.find('ul');
    	                	                     
    	            for (var k in verticesNumber) {
    	                $ul.append('<li><a tabindex="0"><label class="checkbox"><input type="checkbox" value="' + k + '">' + k + '</label></a></li>');
    	            }

    	            contextOptions[selectedSupport]["vertNumberSelection"] = Object.keys(verticesNumber);

    	            $multiselectDiv.find('.multiselect-selected-text').text(Object.keys(verticesNumber).length + " selected vertice(s) number");
    	            $multiselectDiv.find('.dropdown-menu input').prop("checked", true);

    	            $('.disabled').removeClass("disabled").attr("disabled", null);
    	        }
            });
        }

        graphDiv.classed("hidden", false);
    }

    function loadPatternGraph() {

        var patternGraphs = d3.select(".main-pattern-graph-div");
        patternGraphs.selectAll(".pattern-graph-div").classed("hidden", true);

        var patternDivId = "patternGraph-Support-" + selectedSupport.replace(".","_");
        
        var patternDiv = d3.select("#" + patternDivId);

        if ( patternDiv.empty() ) {

            patternDiv = patternGraphs.append("div")
                .attr("class","col-md-12 pattern-graph-div")
                .attr("id", patternDivId);

            var q = queue();
            
            for (var k in listPatternsGraphs) {                
                    
                var obj = listPatternsGraphs[k];                               
                
                if ( obj.support !== selectedSupport ) continue;                            
                
                var newGraphDiv = patternDiv.append("div").attr("class", "col-md-12");

                var panel = newGraphDiv.append("div").attr("class", "box box-default box-solid");

                var panelHead = panel.append("div").attr("class", "box-header");
                
                panelHead.append('div').attr("class","box-tools pull-right").append("button").attr("class", "btn btn-box-tool").attr("data-widget","collapse").append("i").attr("class","fa fa-minus");                

                var rowHtml = '<p><a href="#" class="clear-link pattern-filter" panelIndex="' + k + '" group="' + obj.group + '" patternIndex="' + obj.patternIndex + '"><span class="fa fa-filter" ></span> Filter...</a></p>';

                $( panelHead[0] ).append(rowHtml);

                var panelBody = panel.append("div").attr("class", "box-body");                
                                
                var graphConf = {
                    "dataType": "pattern",
                    "panelIndex": k,
                    "radius": graphRadius,
                    "linkDistanceBase": 27,
                    "setLinkDistanceDinamically": false,
                    "maxHeight": 100,
                    "maxWidth": $( panelBody[0] ).width()
                };

                q.defer(createGraph, obj.file, panelBody, graphConf);                
            }

            q.await(function(error){});
        }

        patternDiv.classed("hidden", false);
    }

    function createGraph(file, targetDiv, graphConf, callback) {
    
        d3.json(file, function(error, graph) {

        	if ( error ) {
        		callback("error");
        	}
        	else {
	            var maxWidth = graphConf.maxWidth;
	            var maxHeight = graphConf.maxHeight;
	            var radius = graphConf.radius;

	            var atomTip = ( graphConf.dataType === "pattern" ) ? patternGraphAtomTip : inputGraphAtomTip;
	            var linkTip = ( graphConf.dataType === "pattern" ) ? patternGraphLinkTip : inputGraphLinkTip;

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
                    .alpha(0.5)
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

                //if(graph.nodes.length === 6 && graph.links.length === 5) console.log(graph)

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
	                    .attr("r", radius)        
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

                force.on('end', function() { console.log('ended!'); });
                
	            if (graphConf.dataType === "pattern") {
	                patternsByPanelIndex[ graphConf.panelIndex ] = graph.graphproperties.inputgraphs;                
	            }
	            else if ( graphConf.dataType === "input" ) {
	            	verticesNumber[ graph.nodes.length ] = 1;
	            }

	            callback(null);
	        }
        });
    }

    function colorGraphNodes(colorNodesBy) {

        var inputGraphDiv = d3.select( "#inputGraph-Support-" + selectedSupport.replace(".","_") );

        inputGraphDiv.selectAll("svg").selectAll(".nodes")
            .style("fill", function(d) {
            	console.log(d.color)
                if ( colorNodesBy === "atomType") return colorNodes( d.atomTypeInt );
                else if ( colorNodesBy === "molecule") return d.color;
            })
            .style("stroke", function(d) {
                if ( colorNodesBy === "atomType") return d3.rgb( colorNodes( d.atomTypeInt ) ).darker();
                else if ( colorNodesBy === "molecule") return d3.rgb(d.color).darker();                        
            });
    }

    function updateGraphDivs() {
        
        var inputGraphId = "inputGraph-Support-" + selectedSupport.replace(".","_");
        
        var $graphsDiv = $('#' + inputGraphId + " > div > div").addClass("hidden");
        
        $graphsDiv.filter(function(){

            var vertNumber = d3.select(this).select("svg").selectAll(".nodes").size().toString();
            var isVertNumberInList = ( $.inArray( vertNumber, contextOptions[selectedSupport]["vertNumberSelection"] ) !== -1 );        
            
            var $div = $(this);

            var graphGroup = $div.attr("group");            
            var isGroupInList = ( $.inArray(graphGroup, contextOptions[selectedSupport]["groupSelection"]) !== -1 );

            var graphIndex = Number( $div.attr("graph") ); 
            
            var isFilteredByPattern = contextOptions[selectedSupport]["filteredByPattern"];           
            var hideGraphBasedOnSelectedPattern = false;
            if ( isFilteredByPattern ) {
                //console.log(graphIndex,contextOptions[selectedSupport]["showInputGraphs"])
                //console.log(contextOptions[selectedSupport]["patternGroup"],graphGroup)
            	var isGraphInFilteredPattern = ( $.inArray(graphIndex, contextOptions[selectedSupport]["showInputGraphs"]) !== -1 );
            	var isSamePatternGroup = ( contextOptions[selectedSupport]["patternGroup"] == graphGroup );

            	hideGraphBasedOnSelectedPattern = ( isGraphInFilteredPattern && isSamePatternGroup) ? false : true;
            }

            return (isVertNumberInList && isGroupInList && (hideGraphBasedOnSelectedPattern === false) );

        }).removeClass("hidden");
        
        var inputGraphDiv = d3.select( "#" + inputGraphId );
        var nodes = inputGraphDiv.selectAll(".nodes").style("opacity", .2);
  		var links = inputGraphDiv.selectAll(".link").style("opacity", .2);
        
  		nodes.filter( function(d) {
			var types = d.atomType.split("/");

            var isAtomTypeSelected = false;
			for (var i in types) {        
				if ( $.inArray(types[i], contextOptions[selectedSupport].atomTypeSelection) !== -1 ) isAtomTypeSelected = true;
			}

            var isToRemoveFocus = false;
            var isFilteredByPattern = contextOptions[selectedSupport]["filteredByPattern"]; 
            if ( isFilteredByPattern ) {
                isToRemoveFocus = ( $.inArray(contextOptions[selectedSupport].patternIndex, d.patterns) !== -1 ) ? false : true;
            }
            // console.log("d\n",d,types,contextOptions[selectedSupport].atomTypeSelection,"fbp\n",selectedSupport,contextOptions[selectedSupport]['filteredByPattern'],
            //     "pid\n",contextOptions[selectedSupport].patternIndex,"patterns\n",d.patterns) 

            return ( isAtomTypeSelected && (isToRemoveFocus === false) );

  		}).style("opacity", 1);

  		links.filter( function(d) { 
  			var types = d.interactionType.split("/");

            var isInterTypeSelected = false;
  			for (var i in types) {        
				if ( $.inArray(types[i], contextOptions[selectedSupport]["interTypeSelection"]) !== -1 ) isInterTypeSelected = true;
			}

            var isToRemoveFocus = false;
            var isFilteredByPattern = contextOptions[selectedSupport]["filteredByPattern"]; 
            if ( isFilteredByPattern ) {
                isToRemoveFocus = ( $.inArray(contextOptions[selectedSupport]["patternIndex"], d.patterns) !== -1 ) ? false : true;
                  
            }
            //console.log(d.target)
            //if (d.target.residueNumber === "515" && d.target.atomName === 'NH1') { console.log(d,isToRemoveFocus,isInterTypeSelected,types,contextOptions[selectedSupport]['interTypeSelection']);}
            //if (d.source.residueNumber === "515" && d.source.atomName === 'NH1') { console.log(d,isToRemoveFocus,isInterTypeSelected,types,contextOptions[selectedSupport]['interTypeSelection']);}
            return ( isInterTypeSelected && (isToRemoveFocus === false) );

  		}).style("opacity", 1);


        var numGraphs = $graphsDiv.find(".box:visible").length;    
        $('.graphs-info').removeClass("hidden").html("Number of showed graphs: <strong>" + numGraphs + "</strong>");

        // Updating Pattern graph.
        var patternGraphId = "patternGraph-Support-" + selectedSupport.replace(".","_");
        $graphsDiv = $('#' + patternGraphId + " > div > div").addClass("hidden");

        $graphsDiv.filter(function() {
        	var vertNumber = d3.select(this).select("svg").selectAll(".nodes").size().toString();
            var isVertNumberInList = ( $.inArray( vertNumber, contextOptions[selectedSupport]["vertNumberSelection"] ) !== -1 );

            var graphGroup = $(this).find('.pattern-filter').attr("group");
            var isGroupInList = ( $.inArray(graphGroup, contextOptions[selectedSupport]["groupSelection"]) !== -1 );

            return (isVertNumberInList && isGroupInList);
        }).removeClass("hidden");
    }

    function getSelections(multiselect) {    
        var selections = [];

        multiselect.find('input[type="checkbox"]:checked').each(function() {
            var item = $(this).val();
            selections.push(item);
        });

        return selections;
    }  

    function displayLigands() {

        var group = $(this).attr("group");
        var pdb = $(this).attr("pdb");
        var ligandTarget = $(this).text();

        var inputGraphId = "inputGraph-Support-" + selectedSupport.replace(".","_");    
        
        var visibleGraphs = {};
        $("#" + inputGraphId + " > div > div:visible").each(function(){
            var graph = $(this).attr("graph");
            visibleGraphs[ graph ] = 1;
        });        
	
        var allLigands = {};
        for (var k in graphsByGroup) { 
            var obj = graphsByGroup[k];

            if ( $.inArray(group, obj.group) === -1 ) continue;

            if ( obj.graph in visibleGraphs === false ) continue;
                        
            var ligands = obj.ligand.split("/");

            for (var i in ligands) {
                var ligand = ligands[i];
                allLigands[ligand] = 1;
            }
        }

        var imgUrl = 'http://www.pdb.org/pdb/images/';
        var pdbUrl = 'http://www.pdb.org/pdb/explore.do?structureId=';
    	var ligUrl = 'http://pdb.org/pdb/ligand/ligandsummary.do?hetId=';

    	var modal = $('#ligandsViewModal .modal-body .row').empty();

    	var slidesHtml;
        for ( var lig in allLigands )  {

        	var linkToLigand = '<a href="' + ligUrl + lig + '"' +
				' target="_blank" title="Click here to see this ligand at the pdb.org">' + lig + '</a>';

			var info = lig;			

			var thumbnailClass = (lig === ligandTarget) ? "thumbnail border-success" : "thumbnail";

			var thumbnail = 
				'<div class="col-md-2">' +
					'<div class="' + thumbnailClass + '" id="thumb-' + lig + '">' +
						'<img src="' + imgUrl + lig + '_600.gif" alt="' + lig + '" title="Click here to see the original image"/>' +
						'<div class="caption">' +
			  				'<p>Ligand: <strong>' + linkToLigand + '</strong></p>' +
			  				'<p>PDB id: <a href="' + pdbUrl + pdb + '" target="_blank"' +
			    				' title="Click here to see this PDB at the pdb.org">' + pdb + '</a></p>' +
						'</div>' +
					'</div>' +
				'</div>';
			
			modal.append(thumbnail);
        }
        
    	$('#ligandsViewModal').modal({ keyboard: true });    
    }

    function showInteractionViewer() {
        var $btn = $(this);

        var pdb = $btn.attr("pdb");
        var chain = $btn.attr("chain");
        var ligand = $btn.attr("ligand");

    	var $divPanel = $btn.parents('.box');
        var graph = $btn.closest(".box").parent().attr('graph')


    	var svg = d3.select( $divPanel.get(0) ).select("svg");
    	var links = svg.selectAll(".link");
    	
    	var interactions = [];	

    	links.data().forEach(function(d){
    		var interObj = {};

    		interObj["sourceChain"] = d.source.chain;
    		interObj["sourceResName"] = d.source.residueName;
    		interObj["sourceResNumber"] = d.source.residueNumber;
    		interObj["sourceAtomName"] = d.source.atomName;
    		
    		interObj["targetChain"] = d.target.chain;
    		interObj["targetResName"] = d.target.residueName;
    		interObj["targetResNumber"] = d.target.residueNumber;
    		interObj["targetAtomName"] = d.target.atomName;

    		interObj["interType"] = d.interactionType;
    		        
            var isToRemoveFocus = false;
            var isFilteredByPattern = contextOptions[selectedSupport]["filteredByPattern"]; 
            if ( isFilteredByPattern ) {
                isToRemoveFocus = ( $.inArray(contextOptions[selectedSupport]["patternIndex"], d.patterns) !== -1 ) ? false : true;
            }

            interObj["interTypeColor"] = colorEdges( d.interactionTypeInt ).toUpperCase().replace("#","0x");

            if ( isToRemoveFocus ) {
                interObj["interTypeColor"] = "0xF5F5F5";
            }    
            
    		interactions.push(interObj);
    	});

        var filename = pdb + "." + chain + ".pdb";
        var pdbFile = pdbPath + "/" + filename;

        var molViewId = "inter-view-" + pdb + "-" + chain;
        
        var interObj = { 
            "file": pdbFile, 
            "pdb": pdb,
            "chain": chain,
            "tChain": ligand,
            "interactions": interactions, 
            "targetDiv": molViewId,
            "graph":graph,
            "support":selectedSupport
        };

        loadInterView(interObj);

        $('#interViewModal').modal({ keyboard: true });
    }

    function loadInterView(obj) {

        var $mainDiv = $('.main-inter-view-div');
        $mainDiv.find('> div').addClass("hidden");

        if ( $("#" + obj.targetDiv).length === 0 ) {
            
            $mainDiv.append('<div id="' + obj.targetDiv + '" class="inter-view-div"></div>');            

            constructProteinView(obj);

        } else {

            var glviewer = interGlviewers[ obj.pdb + "-" + obj.chain ];

            loadStyles(glviewer,obj)
            setProteinResidues(glviewer, obj);

            glviewer.zoomTo({
                resi: obj.interactions.map(a => a['targetResNumber'])
            });      
            glviewer.zoom(0.4);

            glviewer.render();

            interViewControl(glviewer,obj)

        }

       //glviewer.styles[]
        //setProteinResidues(glviewer, obj)
        //glviewer.render();

        $mainDiv.find( "#" + obj.targetDiv ).removeClass("hidden");    
        // $('#glv-cartoon').on('click', function() {
        //     glv_id = $(".inter-view-div:visible").attr('id').substring(11)
        //     //glviewer = interGlviewers[glv_id]
        //     //console.log(glviewer)
        //     glviewer.setStyle({},{cartoon:{}});
        //     glviewer.render();
        // });

        
    }

    function constructProteinView(obj) { 
        // Read PDB file
        $.get(obj.file, function(data) {

            var glviewer = $3Dmol.createViewer(obj.targetDiv, { defaultcolors: $3Dmol.elementColors['Jmol'] });
            glviewer.setBackgroundColor(0xFFFFFF);

            var m = glviewer.addModel(data, "pdb");
            glviewer.mapAtomProperties($3Dmol.applyPartialCharges);

            glviewer.styles = new Object()        
            
            loadStyles(glviewer,obj)
        
            glviewer.zoomTo({
                resi: obj.interactions.map(a => a['targetResNumber'])
            });

            setProteinResidues(glviewer, obj)
        
            glviewer.zoom(0.4);

            glviewer.render();
            
            interViewControl(glviewer,obj)
            // Save the glviewer reference to future uses.
            interGlviewers[ obj.pdb + "-" + obj.chain ] = glviewer;
            objString = "cartoon:color~yellowgreen,opacity~0.9;line:hidden~false"
            console.log($3Dmol.specStringToObject(objString))
            console.log(decodeString(objStr ="select=all&style=cartoon:color~yellowgreen,opacity~0.9;line:hidden~false"))
        });
        
    }

    function setProteinResidues(glviewer, obj) {
        // var sourceRes = new Set()
        // var targetRes = new Set()

        model = glviewer.getModel();

        for ( var i in obj.interactions ) {

            var interObj = obj.interactions[i];
            //console.log(interObj)
            var sourceSelection = { chain: interObj.sourceChain, resn: interObj.sourceResName, resi: interObj.sourceResNumber };        
            //glviewer.addStyle(sourceSelection, { stick: {colorscheme: 'cyanCarbon'} });

            var targetSelection = { chain: interObj.targetChain, resn: interObj.targetResName, resi: interObj.targetResNumber };        
            //glviewer.addStyle(targetSelection, { stick: {colorscheme: 'greenCarbon'} });

            var sourceAtomSelection = {
                chain: interObj.sourceChain,
                resn: interObj.sourceResName,
                resi: interObj.sourceResNumber,
                atom: interObj.sourceAtomName
            };
            var sourceAtoms = model.selectedAtoms(sourceAtomSelection); 

            if ( sourceAtoms.length === 1 ) {
              var sourceAtom = sourceAtoms[0];
              addLabelToAtom(glviewer, sourceAtom, interObj.sourceAtomName);
            }

            var targetAtomSelection = {
                chain: interObj.targetChain,
                resn: interObj.targetResName,
                resi: interObj.targetResNumber,
                atom: interObj.targetAtomName
            };
            var targetAtoms = model.selectedAtoms(targetAtomSelection);

            if ( targetAtoms.length === 1 ) {
              var targetAtom = targetAtoms[0];
              addLabelToAtom(glviewer, targetAtom, interObj.targetAtomName);
            }

            var sourceAtom = sourceAtoms[0];
            var targetAtom = targetAtoms[0];

            var interColor = interObj.interTypeColor;            
            
            glviewer.addArrow({
                start: {
                    x: sourceAtom.x,
                    y: sourceAtom.y,
                    z: sourceAtom.z
                },
                end: {
                    x: targetAtom.x,
                    y: targetAtom.y,
                    z: targetAtom.z
                },
                radius: 0.05,
                color: interColor,
                mid: 0.99    
            });
        }
    }

    function addLabelToAtom (viewer, atom, label) {
        viewer.addLabel(label, {
          fontSize: 11,
          position: {
            x: atom.x,
            y: atom.y,
            z: atom.z
          },
          backgroundColor: "white",
          fontColor: "black"
        });
    }

    function searchNodes() {
    	updateGraphDivs()
        var value = $(this).val().toUpperCase();

        var inputGraphId = "inputGraph-Support-" + selectedSupport.replace(".","_");
        
        var inputGraphDiv = d3.select( "#" + inputGraphId );
        var nodes = inputGraphDiv.selectAll(".nodes").style("r", graphRadius);
    
        if ( value !== '' ) {        
            nodes.filter(function(d){
                var resName = d.residueName;
                var resNum = d.residueNumber;
                var resAtom = d.atomName;

                var resNameAndNum = resName + resNum;
                var resNameAndAtom = resName + ":" + resAtom;
                var resNameAndNumAndAtom = resNameAndNum + ":" + resAtom;
                
                return ( resName.indexOf(value) !== -1 || resNum.indexOf(value) !== -1 || resAtom.indexOf(value) !== -1 || resNameAndAtom.indexOf(value) !== -1 ||
                            resNameAndNum.indexOf(value) !== -1 || resNameAndNumAndAtom.indexOf(value) !== -1 );

            }).style("r", (graphRadius * 2 ));
        }

        var inputGraphDivs = inputGraphDiv.selectAll(".col-md-3").filter(":not(.hidden)");//.each(i => console.log(i));
        //inputGraphDivs.classed("hidden",true)
        console.log(inputGraphDivs[0].length)
        // inputGraphDivs.filter(function (d,i) {
        // 	console.log(d)
        // })
        inputGraphDivs[0].forEach(function(d,i){
        	console.log(d)
        	var graphDiv = d3.select(d)
        	if ( value !== '' ) {
	           
	            graphDiv.classed("hidden",true)
	            var hide = graphDiv.selectAll(".nodes").filter(function(d) {
	                var resName = d.residueName;
	                var resNum = d.residueNumber;
	                var resAtom = d.atomName;

	                var resNameAndNum = resName + resNum;
	                var resNameAndAtom = resName + ":" + resAtom;
	                var resNameAndNumAndAtom = resNameAndNum + ":" + resAtom;
	                
	                return ( resName.indexOf(value) !== -1 || resNum.indexOf(value) !== -1 || resAtom.indexOf(value) !== -1 || resNameAndAtom.indexOf(value) !== -1 ||
	                            resNameAndNum.indexOf(value) !== -1 || resNameAndNumAndAtom.indexOf(value) !== -1 );
		        })

	            if(hide[0].length > 0) {
	            	graphDiv.classed("hidden",false)
	            }   
        	} else {
        		graphDiv.classed("hidden",false)
        	}
        
        })


        var numGraphs = inputGraphDiv.selectAll(".col-md-3").filter(":not(.hidden)")[0].length
        console.log(numGraphs)
        $('.graphs-info').removeClass("hidden").html("Number of showed graphs: <strong>" + numGraphs + "</strong>");
        //updateGraphDivs()
    }

    function setBaseStyle(viewer,obj) {
    
        var key = obj.support + "-" + obj.graph    
        var styles = []
    
        styles.push([{ chain: obj.chain},{ cartoon: {colorscheme: 'greenCarbon',opacity:0.5}}])
        styles.push([{ chain: obj.tChain},{ cartoon: {colorscheme: 'cyanCarbon',opacity:0.5}}])

        var {source, target} = getInterResidues(obj)

        source = Object.entries(source)[0]
        target = Object.entries(target)[0]
    
        styles.push([{chain:source[0], resi:Array.from(source[1])},{ stick: {colorscheme: 'greenCarbon'} }])
        styles.push([{chain:target[0], resi:Array.from(target[1])},{ stick: {colorscheme: 'cyanCarbon'} }])
    
        styles.forEach(style => style.isBase = true)

        viewer.styles[key] = styles

    }

    var loadStyles = (viewer,obj) => {
        viewer.removeAllShapes();
        viewer.removeAllLabels();
        viewer.setStyle({},{});

        if(!(obj.support + "-" + obj.graph in viewer.styles)) {
            setBaseStyle(viewer,obj)
        }

        viewer.styles[obj.support + "-" + obj.graph].forEach(style => viewer.addStyle(style[0],style[1]))
    }

    var getInterResidues = obj => obj.interactions.reduce((acc,cur) => {

        if (!(cur.sourceChain in acc.source)) {
            acc.source[cur.sourceChain] = new Set()
        }
        acc.source[cur.sourceChain].add(cur.sourceResNumber)

        if (!(cur.targetChain in acc.target)) {
            acc.target[cur.targetChain] = new Set()
        }
        acc.target[cur.targetChain].add(cur.targetResNumber)
    
        return acc
    },{source:new Object(),target:new Object()})

    // function addSelection(type) {
    //     if(type == "style")
    //         console.log("style")
    //     else if(type == "surface")
    //         console.log("surface")
    //     else if(type == "label")
    //         console.log("label")
    // }
    
    // function interViewControl(viewer,obj) {

    //     var styles = viewer.styles[obj.support + "-" + obj.graph]

    //     console.log(styles)
    //     $('#addStyle').on('click', function() {
    //         addSelection('style')
    //         $('#selection-list').append(StylesWindow())

    //     })

    //     $('#addSurface').on('click', function() {
    //         addSelection('surface')
    //     })

    //     $('#addLabelRes').on('click', function() {
    //         addSelection('label')
    //     })
    // }

    // function loadStylesSpecs(styles) {

    // }

    function StylesWindow() {
        box=//"<div class='row'>" +
                "<div class='input-group'>" +
                    // "<div class='input-group-prepend'>" +
                    "<span class='input-group-text'> Style </span>" +
                    // "</div>" +
                    "<input type='text' class='form-control'>" +
                    // "<div class='box-header'>" + 
                    //     "Style" +
                    // "<div class='box-body'>" +
                    // "</div>" +
                "</div>" 
        box='<div class="row">'+
                '<div class="col-md-12">' +
                    '<label class="col-md-3 control-label">Style</label>'+
                    '<div class="col-md-3">'+
                        '<input type="text" class="form-control input-xs search-nodes-input" placeholder="E.g.: LEU83, X01, N, LEU83:N, X01:N8">'+
                    '</div>'+
                '</div>'+
            '</div>'
        return box
    }

    var decodeString = objString => objString.split("&").reduce((acc,cur) => {
        cur = cur.split("=")
        if(cur.length == 2) {
            acc[cur[0]] = cur[1]
        }
        return acc
    },new Object)

});