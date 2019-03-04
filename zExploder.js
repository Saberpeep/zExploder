(function(zExploder) {
    zExploder.init = function() {
        if (zExploder.ALREADY_RUNNING){
            return main();   
        }
        zExploder.ALREADY_RUNNING = true;
        //persistent config
        zExploder.LAYER_DEPTH = 100; //z distance in pixels that layers are separated by in the render.
        zExploder.STARTING_ANGLE = 45; //angle in deg at which the view is rotated at init.
        zExploder.STARTING_ZOOM = -100; //z translation in vh at which the view is zoomed at init.
        zExploder.BASE_PERSPECTIVE = 2000; //perspective in px of view at init.
        zExploder.DEBUG_MODE = false; //set true to enable additional debug messages in the console.
        
        //jq check
        if (typeof jQuery === "undefined" || jQuery.fn.jquery < "3.2.1") {
            console.log("zExploder: jQuery 3.2.1 or greater not present, loading jQ");
            loadjQ();
        }else{
            main();
        }
    };
    function loadjQ() {
        var script = document.createElement("script");
        script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.min.js';
        script.type = 'text/javascript';
        script.onload = function() {
            main();
        }
        document.getElementsByTagName("head")[0].appendChild(script);
    }
    
    function main(){
        zExploder.layers = [];
        var $document = $(document),
            $window = $(window),
            $html = $("html"),
            $body = $("body"),
            body = document.getElementsByTagName("body")[0];
        
        function getZIndex(el){
            var $el = $(el);
            var thisZIndex = parseInt($el.css('z-index'));
            if (isNaN(thisZIndex)){
                thisZIndex = 0;
            }
            return thisZIndex;
        }
        
        //GATHER LAYERS
        //-gather elements by zindex and assemble layers
        var uniqueIndexes = [];
        var elementsWithzindex = $('*').filter(function() {
            if ($(this).css('z-index') != "auto"){
                var thisZIndex = getZIndex(this);

                if (!uniqueIndexes.includes(thisZIndex)){
                    uniqueIndexes.push(thisZIndex);
                }
                return true;
            }else{
                return false;
            }
        });
        zExploder.DEBUG_MODE && console.log("zExploder: elements with z-index set: ", elementsWithzindex);
        uniqueIndexes = uniqueIndexes.sort(function(a, b){return a - b});
        zExploder.DEBUG_MODE && console.log("zExploder: unique z-indexes: ", uniqueIndexes);
        
        //if there is no 0 layer, insert one (that will be blank)
        if (uniqueIndexes.indexOf(0) == -1){
            uniqueIndexes.push(0);
            uniqueIndexes = uniqueIndexes.sort(function(a, b){return a - b});
        }

        //-assemble layers array
        //--fill out blank layers
        var layerBaseline = 0;
        for(var i = 0; i < uniqueIndexes.length; i++){
            zExploder.layers.push({
                zIndex: uniqueIndexes[i],
                els: []
            });
            if (uniqueIndexes[i] < 0){
                layerBaseline++;
            }
        }
        //--fill layers with elements
        elementsWithzindex.each(function(i){
            var thisZIndex = getZIndex(this);

            for (var j = 0; j < zExploder.layers.length; j++){
                if (thisZIndex == zExploder.layers[j].zIndex){
                    $.data(this, "layer", j);
                    zExploder.layers[j].els.push(this);
                    
                }
            }
        });
        console.log("zExploder: layers generated: ", zExploder.layers);
        zExploder.DEBUG_MODE && console.log("zExploder: layerBaseline: ", layerBaseline);

        //RENDER
        //-generate transform css string for the body el
        //- This is to do with the fact that all the tranforms must be set as one string,
        //- but we may only want to change one value at a time.
        var lastZoom;
        var lastYdeg;
        function getBodyTransformString(Ydeg, zoom){
            if (!Ydeg) Ydeg = lastYdeg; else lastYdeg = Ydeg;
            if (!zoom) zoom = lastZoom; else lastZoom = zoom;
            return "translateZ(" + zoom + "vh) rotateY(" + Ydeg + "deg)";
        }
        
        //-apply style rules
        $html.css({
            "perspective": zExploder.BASE_PERSPECTIVE + "px",
            "background-color": "#2e2e2e",
            "height": "100%"
        })
        $body.css({
            "transform-style": "preserve-3d",
            "transform-origin": "center",
            "transform": getBodyTransformString(zExploder.STARTING_ANGLE, zExploder.STARTING_ZOOM),
            "user-select": "none",
            "height": "100%"
        });
        
        //-apply styles to layers
        for (var i = 0; i < zExploder.layers.length; i++){
            //each layer
            for (var j =0; j < zExploder.layers[i].els.length; j++){
                //each element
                var $this = $(zExploder.layers[i].els[j]);
                //calculate parent offset
                // This is needed because children are translated with their parents, 
                // and this is used to offset that, so child translations are independant.
                
                //gather parents of this element that are also present in the array elementsWithzindex
                var parentsWithTransform = $this.parents().filter(function() {
                    
                    var thisParent = this;
                    var found = false;
                    elementsWithzindex.each(function(i){
                        if (this == thisParent){
                            found = true;  
                        }
                    });
                    return found;
                });
                
                //tally up total layer depth of a child element.
                // only applies to elements with transformed parents.
                // this is somewhat of a work in progress, but works as long as the page isnt too complex.
                var totalParentDepth = 0;
                parentsWithTransform.each(function(){
                    totalParentDepth += $.data(this, "layer") - layerBaseline;
                });
                
                if (totalParentDepth != 0){
                    zExploder.DEBUG_MODE && console.log("zExploder: Element adjusted by parent depth", totalParentDepth, "(" + i + " - " + layerBaseline + " - " + totalParentDepth + ")", $this[0], parentsWithTransform);
                } 
                //apply css
                // Multiplying the default LAYER_DEPTH pixels by the layer number
                // gives the layers a consistent relative 3d offset based on their layer order,
                // rather than absolute z-index.
                $this.css({
                    "transform": "translateZ(" + (zExploder.LAYER_DEPTH * (i - layerBaseline - totalParentDepth)) + "px)",
                    "border": "1px solid red"
                });
                //reveal hidden elements
                if($this.css("display") == "none" || $this.css("visibility") == "hidden"){
                    $this.css({
                        "display": "initial",
                        "visibility": "visible",
                        "border": "1px solid blue"
                    });
                }
            }
        }
        
        //-returns value in px of translateZ on given element
        function getTranslateZ(el) {
            var obj = $(el);
            var matrix = obj.css("transform");
            var x = matrix.split(',');
            var len = x.length;
            return parseInt(x[len-2]);
        }
        
        //-gather elements that already have transformations applied and give them preserve-3d
        var elementsWithTransform = $('*').filter(function() {
            return $(this).css('transform') != "none";
        });
        zExploder.DEBUG_MODE && console.log("zExploder: elements with transform set: ", elementsWithTransform, "(changing to preserve-3d...)");
        elementsWithTransform.css("transform-style", "preserve-3d");
        
        //-gather elements that have position set to fixed, and change it to absolute
        var elementsWithFixed = $('*').filter(function() {
            return $(this).css('position') == "fixed";
        });
        zExploder.DEBUG_MODE && console.log("zExploder: elements with position set to fixed: ", elementsWithFixed, "(changing to absolute...)");
        elementsWithFixed.css("position", "absolute");
        
        
        //CONTROLS
        var offset = 0, startX, firstRun = true;
        //-rotate on drag
        $html
        .on('mousedown', function (e) {
            if (firstRun){
                startX = e.pageX - offset - zExploder.STARTING_ANGLE;
                firstRun = false;
            }else{
                startX = e.pageX - offset;
            }
            zExploder.DEBUG_MODE && console.log("zExploder: mouse down - startX: ", startX);
        })
        .on('mouseup', function() {
            zExploder.DEBUG_MODE && console.log("zExploder: mouse up");
            startX = null;
        });
        $html[0].onmousemove = function (e) {
            if(startX) {
                offset = e.pageX - startX;
                if (offset > 360){
                    offset = 0;
                    startX = e.pageX - offset;
                }
                if (offset < 0){
                    offset = 360;
                    startX = e.pageX - offset;
                }
                $body.css("transform", getBodyTransformString(offset));
                zExploder.DEBUG_MODE && console.log("zExploder: mouse drag - offset: ", offset);
            }
            /*detect if mouse leaves window*/
            $html[0].onmouseleave = function(e) {
                zExploder.DEBUG_MODE && console.log("zExploder: mouse out");
                $("#demowrap").trigger("mouseup");
            };
        };
        //-override image dragging
        $("img").on('mousedown', function (e) {
            zExploder.DEBUG_MODE && console.log("zExploder: image drag prevented");
            e.preventDefault();
        });
        $("img").on("mousemove", function(e) {
            e.preventDefault();
        });
        //-zoom on wheel scroll
        $html[0].addEventListener("wheel", function(e){
            zExploder.DEBUG_MODE && console.log("zExploder: wheel");
            e.preventDefault();
            $body.css("transform", getBodyTransformString(null, lastZoom = lastZoom + (e.deltaY / -10)));
        }, false);
        //adjust perspective on scrollbar scroll
        window.addEventListener("scroll", function(e){
            $html.css("perspective", (zExploder.BASE_PERSPECTIVE + window.scrollY) + "px")
            zExploder.DEBUG_MODE && console.log("zExploder: adjusting perspective...", zExploder.BASE_PERSPECTIVE + window.scrollY);
        });
        
    }//end main
}( window.zExploder = window.zExploder || {}));

