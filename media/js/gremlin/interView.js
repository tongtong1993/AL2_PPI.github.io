var buildHTMLTree = function(query){
    //get parent object for the html tree
    var parent = $('#selection_list');
    parent.text("");
    //list file type and path
    //$("#model_type").attr("value",query.file.type); 
    
    var arr=[]
    //loops through selections and creates a selection tree
    for(var selection_index in query.selections){
        var selection_object = query.selections[selection_index];
        var aug = augmentSelection(selection_object);

        if(selection_object.style != undefined){
            arr.push(createSelection(aug,selection_object.style,selection_index,"style"));
        }
        if(selection_object.surface != undefined){
            arr.push(createSelection(aug,selection_object.surface,selection_index,"surface"))
        }
        if(selection_object.labelres != undefined){
            arr.push(createSelection(aug,selection_object.labelres,selection_index,"labelres"))
        }
    }
    for(var i in arr){
        if(arr[i]!= undefined)
            parent.append(arr[i])
    }
    //this adds spinners to things with spinner as a class this is here because they need to ba  a part of the dom before this is called
    $('<li id = "spacer"><br><br><br></li>').appendTo(parent)
}

var addSelection = function(type){
    var surface  = type == "surface"
    if(type == "style")      
        query.selections.push({"style":{line:{}}})
    else if(type == "surface")
        query.selections.push({"surface":{}})
    else if(type == "labelres")
        query.selections.push({"labelres":{}})
    buildHTMLTree(query);
    render(surface);
}

var deleteSelection = function(spec){
    delete query.selections[spec.dataset.index][spec.dataset.type];
    if(query.selections[spec.dataset.index].surface == undefined && query.selections[spec.dataset.index].style == undefined && query.selections[spec.dataset.index].labelres == undefined)
        delete query.selections[spec.dataset.index]
    
    buildHTMLTree(query);
    render(spec.dataset.type == "surface");
}

var addModelSpec = function(type,selection){
    var current_selection;
    current_selection = query.selections[selection.dataset.index]
    
    if(type == "style" || type == "surface" || type == "labelres"){
        if(current_selection[type]==null)
            current_selection[type]={};
        else
            console.err(type+" already defined for selection");//TODO error handling
    }
    
    buildHTMLTree(query);
    render();
}

var addStyleSpec = function(model_spec){
    var defaultKey = "";
    var defaultValue = {};
    query.selections[model_spec.dataset.index][model_spec.dataset.type][defaultKey]=defaultValue;
    
    buildHTMLTree(query);
    render();
}

var deleteStyleSpec = function(spec){
    delete query.selections[spec.dataset.index][spec.dataset.type][spec.dataset.attr]
    
    buildHTMLTree(query);
    render();
}

var addOtherAttribute= function(spec){
    var defaultKey = "";
    var defaultValue = "";
    query.selections[spec.dataset.index][spec.dataset.type.toLowerCase()][defaultKey]=defaultValue;
    
    buildHTMLTree(query);
    render();
}

var deleteOtherAttribute = function(spec){
    delete query.selections[spec.dataset.index][spec.dataset.type][spec.dataset.attr]
    
    buildHTMLTree(query);
    render(spec.dataset.type == "surface");
}

var addAttribute = function(style_spec){
    var defaultKey = "";
    var defaultValue = "";
    query.selections[style_spec.dataset.index][style_spec.dataset.type][style_spec.dataset.styletype][defaultKey]=defaultValue;

    buildHTMLTree(query);
    render();
}

var deleteStyleAttribute = function(spec){
    delete query.selections[spec.dataset.index]["style"][spec.dataset.type][spec.dataset.attr]
    buildHTMLTree(query);
    render();
}

