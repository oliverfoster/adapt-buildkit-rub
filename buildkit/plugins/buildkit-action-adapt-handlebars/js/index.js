'use strict';

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this.onActionsReset();
	}

	loadHandlebarsCompiler() {
		//FIX FOR HANDLEBARS CLIENT/COMPILER VERSION INCOMPATIBILITY > 
		var clientCode = fs.readFileSync("src/core/js/libraries/handlebars.js").toString();

		if (clientCode.match(/handlebars 1.0.0/gi)) {
			GLOBAL.hbsCompiler = require("../libs/handlebars.1.3.0.js");
		} else if (clientCode.match(/handlebars v2.0.0/gi)) {
			GLOBAL.hbsCompiler = require("../libs/handlebars.2.0.0.js");
		} else if (clientCode.match(/handlebars v3/gi)) {
			GLOBAL.hbsCompiler = require("../libs/handlebars.3.0.3.js");
		} else {
			logger.error("Handlebars version not found");
			process.exit(0);
		}
		//< FIX FOR HANDLEBARS CLIENT/COMPILER VERSION INCOMPATIBILITY
		
	}

	setupEventListeners() {
		events.on("actions:reset", () => { this.onActionsReset(); });
		events.on("action:run:handlebars", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionsReset() {
		this.loadHandlebarsCompiler();
	}

	onActionRun(options, start, end) {
		options = options || {};
		
		options.dest = Location.contextReplace(options.dest, options);

		var globs = [].concat(options.globs);
		if (options.exclusionGlobs) {
			globs = globs.concat(options.exclusionGlobs);
		}

		var tree = treecontext.Tree(options.src, ".");
		options.globs = Location.contextReplace(options.globs, options);
        var globs = new GlobCollection(options.globs, options.folderexclusions);
        var files = tree.mapGlobs(globs).files;
		
		if (fs.existsSync(options.dest) && options.switches.force !== true) {
			var destStat = fs.statSync(options.dest);
			var changed = false;

	        for (var i = 0, l = files.length; i < l; i++) {
	            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
	                changed = true;
	                break;
	            }
	        }

		    if (!changed) {
	        	return end();;
	        }
		}

		start();

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

		options.partialGlobs = Location.contextReplace(options.paritalGlobs, options);
		var paritalGlobs = new GlobCollection(options.paritalGlobs);

		for (var i = 0, l = files.length; i < l; i++) {
			var file = files[i];

			var contents = fs.readFileSync(file.location).toString();
			try {
				var precompiled = hbsCompiler.precompile(contents);
			} catch(e) {
				return end("File: " + file+"\n" + e);
			}

			var isPartial = paritalGlobs.filter([file]);
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

		output+="});";

		if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
		if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		FileSystem.mkdir(path.dirname(options.dest));

		fs.writeFile(options.dest, output, function() {
			end();
		});
	}
	
}

module.exports = Plugin;
