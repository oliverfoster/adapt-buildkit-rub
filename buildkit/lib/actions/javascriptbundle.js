var fsext = require("../utils/fsext");
var logger = require("../utils/logger.js");
var path = require("path");
var fs = require("fs");
var _ = require("underscore");
var chalk = require("chalk");
var hbs = require("handlebars");

var defaults = {
		src: process.cwd(),
		dest: path.join(process.cwd(), "bundles.js")
	};


module.exports = {

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
	        	return done(null, options);
	        }
	    }

		options.requires = {};

		var base = options.src;

		fsext.walkSync(base, function(groupDirs, files) {

			groupDirs = fsext.globMatch(groupDirs, options.globs, options);

			for (var g = 0, lg = groupDirs.length; g < lg; g++) {
				var groupDir = groupDirs[g];
				fsext.walkSync(groupDir.path, function(pluginDirs) {

					pluginDirs = fsext.globMatch(pluginDirs, options.globs, options);

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
				});
			}
		});

		output+="require(";
		if (options.requires) {
			output+=JSON.stringify(_.values(options.requires), null, "\t")+",";
		}
		output+="function(){});";

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
		if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		fsext.mkdirp({dest:path.dirname(options.dest)});
		fs.writeFileSync(options.dest, output);

		done(null, options);
	},

	reset: function() {
		
	}
	
};