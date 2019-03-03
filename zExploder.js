(function(zExploder) {
    zExploder.init = function() {
        if (zExploder.ALREADY_RUNNING){
            return main();   
        }
        zExploder.ALREADY_RUNNING = true;
        
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
    
    //persistent config
    zExploder.LAYER_DEPTH = 100;
    zExploder.DEBUG_MODE = false;
    
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

            var thisZIndex = getZIndex(this);

            if (!uniqueIndexes.includes(thisZIndex)){
                uniqueIndexes.push(thisZIndex);
            }

            return $(this).css('z-index') != "auto";
        });
        zExploder.DEBUG_MODE && console.log("zExploder: elements with z-index set: ", elementsWithzindex);
        uniqueIndexes = uniqueIndexes.sort(function(a, b){return a - b});
        zExploder.DEBUG_MODE && console.log("zExploder: unique z-indexes: ", uniqueIndexes);

        //-assemble layers array
        //--fill out blank layers
        for(var i = 0; i < uniqueIndexes.length; i++){
            zExploder.layers.push({
                zIndex: uniqueIndexes[i],
                els: []
            });
        }
        //--fill layers with elements
        elementsWithzindex.each(function(i){
            var thisZIndex = getZIndex(this);

            for (var j = 0; j < zExploder.layers.length; j++){
                if (thisZIndex == zExploder.layers[j].zIndex){
                    zExploder.layers[j].els.push(this);
                }
            }
        });
        console.log("zExploder: layers generated: ", zExploder.layers);

        //RENDER
        //-generate transform css string for the body el
        //- This is to do with the fact that all the tranforms must be set as one string,
        //- but we may only want to change one value at a time.
        var lastZoom;
        var lastYdeg;
        function getBodyTransformString(Ydeg, zoom){
            if (!Ydeg) Ydeg = lastYdeg; else lastYdeg = Ydeg;
            if (!zoom) zoom = lastZoom; else lastZoom = zoom;
            return "translateY(" + ( 1 - (zoom / 2)) + "px) translateZ(" + zoom + "vh) rotateY(" + Ydeg + "deg)";
        }
        
        //-apply style rules
        $html.css({
            "perspective": "2000px",
            "background-color": "#2e2e2e",
            "height": "100%"
        })
        $body.css({
            "transform-style": "preserve-3d",
            "transform-origin": "center",
            "transform": getBodyTransformString(45, -100),
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
                    elementsWithzindex.each(function(){
                        if (this == thisParent){
                            found = true;  
                        }
                    });
                    return found;
                });
                var totalParentDepth = 0
                parentsWithTransform.each(function(){
                    totalParentDepth++;
                })
                if (totalParentDepth != 0){
                    zExploder.DEBUG_MODE && console.log("zExploder: Element adjusted by parent depth", totalParentDepth, $this[0], parentsWithTransform);
                } 
                //apply css
                // Multiplying the default LAYER_DEPTH pixels by the layer number
                // gives the layers a consistent relative 3d offset based on their layer order,
                // rather than absolute z-index.
                $this.css({
                    "transform": "translateZ(" + ((zExploder.LAYER_DEPTH * i) - (zExploder.LAYER_DEPTH * totalParentDepth)) + "px)",
                    "border": "1px solid red"
                });
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
        var offset = 0, startX;
        //-rotate on drag
        $html
        .on('mousedown', function (e) {
            zExploder.DEBUG_MODE && console.log("zExploder: mouse down");
            startX = e.pageX - offset;
        })
        .on('mouseup', function() {
            zExploder.DEBUG_MODE && console.log("zExploder: mouse up");
            startX = null;
        });
        $html[0].onmousemove = function (e) {
            if(startX) {
                zExploder.DEBUG_MODE && console.log("zExploder: mouse drag");
                offset = e.pageX - startX;
                if (offset > 360){
                    offset = 0;
                    startX = e.pageX - offset;
                }
                if (offset < 0){
                    offset = 360;
                    startX = e.pageX - offset;
                }
                $body.css("transform", getBodyTransformString(offset - 45));
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
        //-zoom on scroll
        $html[0].addEventListener("wheel", function(e){
            zExploder.DEBUG_MODE && console.log("zExploder: wheel");
            e.preventDefault();
            $body.css("transform", getBodyTransformString(null, lastZoom = lastZoom + (e.deltaY / -10)));
        });
        
    }//end main
}( window.zExploder = window.zExploder || {}));

