var Action = require("../libraries/Action.js");

var handlebars = new Action({

	initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore"
        });

        //FIX FOR HANDLEBARS CLIENT/COMPILER VERSION INCOMPATIBILITY > 
		function checkHandlebarsVersion() {
			var data = fs.readFileSync("src/core/js/libraries/handlebars.js").toString();

			var hbs;
			if (data.match(/handlebars 1.0.0/gi)) {
				hbs = require("./resources/handlebars.1.3.0.js");
			} else if (data.match(/handlebars v2.0.0/gi)) {
				hbs = require("./resources/handlebars.2.0.0.js");
			} else if (data.match(/handlebars v3/gi)) {
				hbs = require("./resources/handlebars.3.0.3.js");
			} else if (data.match(/handlebars v4/gi)) {
				hbs = require("./resources/handlebars.4.0.5.js");
			} else {
				console.log("Handlebars version not found");
				process.exit(0);
			}

			return hbs;
		}
		//< FIX FOR HANDLEBARS CLIENT/COMPILER VERSION INCOMPATIBILITY
		global['hbsCompiler'] = checkHandlebarsVersion();

    },

	perform: function(options, done, started) {
		options = options || {};
		
		options.dest = fsext.replace(options.dest, options);

		var globs = [].concat(options.globs);
		if (options.exclusionGlobs) {
			globs = globs.concat(options.exclusionGlobs);
		}
		
		if (typeof options.src == "string") options.src = [options.src];

		if (fs.existsSync(options.dest) && options.switches.force !== true) {
			var destStat = fs.statSync(options.dest);
			var changed = false;
			for (var s = 0, sl = options.src.length; s < sl; s++) {
				if (fs.existsSync(options.src[s])) {
			        var files = fsext.glob(options.src[s], globs, { dirs: false });
			        for (var i = 0, l = files.length; i < l; i++) {
			            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
			                changed = true;
			                break;
			            }
			        }
			    }
			    if (changed) break;
		    }
		    if (!changed) {
	        	return done(options);;
	        }
		}

		started();

		var spacer = "";
		if (options.debug) {
			spacer = "\n";
		}
		
		var output = "";
		output+="define(";
		if (options.defines) {
			output+= '"'+options.defines+'",';
		}
		if (options.requires) {
			output+=JSON.stringify(_.values(options.requires))+",";
		}
		output+="function(";
		if (options.requires) {
			output+=_.keys(options.requires).join(",");
		}
		output+="){"+spacer;

		output+=(options.precontext ? options.precontext+spacer : "");
		output+=options.context+"={};"+spacer;

		for (var s = 0, sl = options.src.length; s < sl; s++) {
			var files = fsext.glob(options.src[s], globs, { dirs: false });

			for (var i = 0, l = files.length; i < l; i++) {
				var file = files[i];

				var contents = fs.readFileSync(file+"").toString();
				try {
					var precompiled = hbsCompiler.precompile(contents);
				} catch(e) {
					return done(options, "File: " + file+"\n" + e);
				}

				var isPartial = fsext.filter([file], options.paritalGlobs);
				if (isPartial.length > 0) {
					output+= "Handlebars.registerPartial('"+file.filename+"',Handlebars.template("+precompiled+"));"+spacer;
				} else {
					if (options.context) {
						output+=options.context+"['"+file.filename+"']=Handlebars.template(";
					};

					output+= precompiled;

					if (options.context) {
						output+=");"+spacer;
					} else {
						output+=spacer;
					}
				}
			}
		}

		output+="});";

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
		if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		fsext.mkdir(path.dirname(options.dest));

		fs.writeFile(options.dest, output, function() {
			done(options);
		});
	}

});

module.exports = handlebars;


