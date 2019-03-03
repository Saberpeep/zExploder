# zExploder
A javascript bookmarklet that displays z-indexes in a 3d view.

This tool displays elements that have a z-index set in a 3d representation.
z-indexed elements are outlined in red and are ordered based on their z-index relative to their peers.


How To Use
-------
1. Copy the contents of `bookmarklet.txt` to the url field of a bookmark in your browser.
2. Put the bookmark on your bookmarks bar.
3. Visit (almost) any site and click the bookmark to load the tool into that page.
4. To exit, simply reload the page


Controls:
------------
1. Drag mouse to rotate
2. Scroll wheel to zoom in and out

Extras:
------------
* Set `zExploder.DEBUG_MODE ` to ` true` to get more debug info in your javascript console.
* Set `zExploder.LAYER_DEPTH ` to a value in px for how far apart you want the layers to be displayed.
* Run `zExploder.init()` to refresh the tool. (you must run this after changing LAYER_DEPTH)