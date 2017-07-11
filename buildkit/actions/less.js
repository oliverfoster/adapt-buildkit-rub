var Action = require("../libraries/Action.js");

var less = new Action({

	initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "lessCompiler": "less",
            "sourcemaps": "../libraries/sourcemaps.js"
        });

    },

	perform: function(options, done, started) {
		
		options = _.extend({}, options, { sourceMap: options });

		options.dest = fsext.replace(options.dest, options);

		var globs = [].concat(options.globs);
		if (options.exclusionGlobs) {
			globs = globs.concat(options.exclusionGlobs);
		}

		var output = "";
		if (typeof options.src == "string") options.src = [options.src];

		if (fs.existsSync(options.dest) && options.switches.force !== true && !options.switches.forceall) {
			var destStat = fs.statSync(options.dest);
			for (var s = 0, sl = options.src.length; s < sl; s++) {
				if (fs.existsSync(options.src[s])) {
			        var files = fsext.glob(options.src[s], globs, { dirs: false });
			        var changed = false;
			        for (var i = 0, l = files.length; i < l; i++) {
			            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
			                changed = true;
			                break;
			            }
			        }
			    }
			    if (changed) break;
		    }

		    var mapExists = false;
            if (fs.existsSync(options.dest + ".map")  ) {
                mapExists = true;
            } 
            changed = (mapExists == (!options.switches.debug)) || changed;
            
		    if (!changed) {
		    	return done(options);
		    }
		}

		started();

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
	    if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		var includeFile = "";

		if (options.config) {

			options.config = fsext.replace(options.config, options);
			
			var screenSize = {
				"small": 520,
				"medium": 760,
				"large": 900
			};
			try {
				var configjson = JSON.parse(fs.readFileSync(options.config).toString());
				screenSize = configjson.screenSize || screenSize;
			} catch (e) {}

			console.log("screen size:", screenSize);

			includeFile += "\n@adapt-device-small:"+screenSize.small+";";
			includeFile += "\n@adapt-device-medium:"+screenSize.medium+";";
			includeFile += "\n@adapt-device-large:"+screenSize.large+";\n";

		}

		for (var s = 0, sl = options.src.length; s < sl; s++) {
			var files = fsext.glob(options.src[s], globs, { dirs: false });

			for (var i = 0, l = files.length; i < l; i++) {
				var file = files[i];
				var relativePath = file.path.substr(process.cwd().length+1);
				includeFile += '@import "' + relativePath + '";\n';
			}
		
		}

		options.includeFile = includeFile;

		options = _.extend({}, options, { sourceMap: options });

		switch (options.switches.debug) {
		case true:
			if (options.switches.quick) delete options.sourceMap;
            options.compress = false;
            break;
        default:
        	delete options.sourceMap;
        	options.compress = !options.switches.quick;
        	break;
        } 


		lessCompiler.render(options.includeFile, options, complete);

		function complete(error, output) {
			if (error) {
				var output = "";
				for (var k in error) {
					switch (typeof error[k]) {
					case "object": case "function": case "undefined": case "null":
						break;
					default:
						output += k +": " + JSON.stringify(error[k]) + "\n";
					}
				}
				done(options, output);
				return;
			}
			fsext.mkdir(path.dirname(options.dest));

			fs.writeFileSync(options.dest, output.css);
			if (output.map) {
				fs.writeFileSync(options.dest + ".map", output.map);
				if (options.sourceMapRelocate) sourcemaps.relocate(options.dest + ".map", options.sourceMapRelocate);
			}
			done(options);
		}
	}
	
});

module.exports = less;


