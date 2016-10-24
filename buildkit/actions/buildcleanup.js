var Action = require("../libraries/Action.js");

var buildcleanup = new Action({

	initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "UglifyJS": "uglify-js"
        });

    },

	perform: function(options, done, started) {
		
		options = options || {};
		
		options.root = fsext.replace(options.root, options);
		options.root = fsext.expand(options.root);

		var output = "";

	    started();

	    var files = fsext.glob(options.root, options.globs);

	    if (files.length > 0) {
		    fsext.remove(options.root, options.globs);
		    
		}

	    if (options.deleteRoot && fs.existsSync(options.root)) {
	    	fs.rmdirSync(options.root);
	    }

		done(options);
	}

});

module.exports = buildcleanup;