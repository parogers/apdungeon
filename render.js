
var Render = {
    configure: function(width, height, div) {
	PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
	// Disable the ticker sinc we don't use it (rendering happens as needed)
	PIXI.ticker.shared.autoStart = false;
	PIXI.ticker.shared.stop();

	RES.renderer = PIXI.autoDetectRenderer({
	    width: width,
	    height: height,
	    //	antialias: true,
	    // Required to prevent flickering in Chrome on Android (others too?)
	    preserveDrawingBuffer: true,
	    //	clearBeforeRender: true
	});

	if (div) {
	    div.appendChild(RES.renderer.view);
	}
    },

    getRenderer: function() {
	return RES.renderer;
    }

};


