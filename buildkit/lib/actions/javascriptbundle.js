var Action = require("../utils/Action.js");

var defaults = {
		src: process.cwd(),
		dest: path.join(process.cwd(), "bundles.js")
	};


var javascriptbundle = new Action({

	initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "hbs": "handlebars"
        });

    },

	perform: function(options, done) {
		options = _.extend({}, defaults, options);
		options.dest = hbs.compile(options.dest)(options);

		var output = "";

		if (fs.existsSync(options.dest) && options.switches.force !== true) {
	        var files = fsext.glob(options.src, options.globs);
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

		options.requires = {};

		var base = options.src;

		var listGroups = fsext.list(base);
		var groupDirs = fsext.filter(listGroups.dirs, options.globs);

		for (var g = 0, lg = groupDirs.length; g < lg; g++) {
			var groupDir = groupDirs[g];
			var listPluginPath = fsext.list(groupDir.path);
			var pluginDirs = listPluginPath.dirs

			pluginDirs = fsext.filter(pluginDirs, options.globs);

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

		output+="require(";
		if (options.requires) {
			output+=JSON.stringify(_.values(options.requires), null, "\t")+",";
		}
		output+="function(){});";

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
		if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		fsext.mkdir(path.dirname(options.dest));
		fs.writeFileSync(options.dest, output);

		done(options);
	}

});

module.exports = javascriptbundle;