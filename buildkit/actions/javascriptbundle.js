var Action = require("../libraries/Action.js");

var javascriptbundle = new Action({
	_outputCache: {},

	initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore"
        });

    },

	perform: function(options, done, started) {
		
		options = options || {};
		options.dest = fsext.replace(options.dest, options);

		var output = "";

		var globs = [].concat(options.globs);
		if (options.exclusionGlobs) {
			globs = globs.concat(options.exclusionGlobs);
		}

		if (fs.existsSync(options.dest) && options.switches.force !== true) {
	        var files = fsext.glob(options.src, globs);
	        var destStat = fs.statSync(options.dest);
	        var changed = false;
	        for (var i = 0, l = files.length; i < l; i++) {
	            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
	                changed = true;
	                break;
	            }
	        }
	        if (!changed) {
	        	return done(options);
	        }
	    }

	    if (options['@buildOnce'] && this._outputCache[options['@name']]) {
            return done(options);
        }

	    started();

		options.requires = {};

		var base = options.src;

		var listGroups = fsext.list(base);
		var groupDirs = fsext.filter(listGroups.dirs, globs);

		for (var g = 0, lg = groupDirs.length; g < lg; g++) {
			var groupDir = groupDirs[g];
			var listPluginPath = fsext.list(groupDir.path);
			var pluginDirs = listPluginPath.dirs

			pluginDirs = fsext.filter(pluginDirs, globs);

			for (var p = 0, lp = pluginDirs.length; p < lp; p++) {
				var pluginDir = pluginDirs[p];
				

				var bowerJSONPath = path.join( pluginDir.path, "bower.json");
				if (!fs.existsSync( bowerJSONPath )) continue;

				var bowerJSON;
				try {
					bowerJSON = JSON.parse(fs.readFileSync(bowerJSONPath));
				} catch(e) {
					console.log(e);
				}
				if (bowerJSON.main == undefined) continue;

				var pluginMainPath = path.join(pluginDir.path, bowerJSON.main);
				var req = pluginMainPath.substr(base.length);
				req = req.replace(/\\/g, "/");
				if (req.substr(0,1) == "/") req = req.substr(1);

				req = req.slice(0, -path.extname(req).length);

				options.requires[req] = req;
			}
		}

		output+="define(";
		if (options.requires) {
			output+=JSON.stringify(_.values(options.requires), null, "\t")+",";
		}
		output+="function(){});";

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
		if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		fsext.mkdir(path.dirname(options.dest));

		 if (options['@buildOnce']) {
		 	this._outputCache[options['@name']] = true;
		 }

		fs.writeFileSync(options.dest, output);

		done(options);
	},

	reset: function() {
		this._outputCache = {};
	}

});

module.exports = javascriptbundle;
