'use strict';

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this._outputCache = {};
	}

	setupEventListeners() {
		events.on("action:run:javascriptbundle", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		
		options = options || {};
		options.dest = Location.contextReplace(options.dest, options);

		var output = "";

		if (options.globs) {

		    if (options['@buildOnce'] && this._outputCache[options['@name']]) {
	            return end();
	        }

		    start();

		    var globs = [].concat(options.globs);
			if (options.exclusionGlobs) {
				globs = globs.concat(options.exclusionGlobs);
			}

			var tree = treecontext.Tree(options.src, ".");
			var globs = new GlobCollection(globs);
			var bowerFiles = tree.mapGlobs(globs).files;

			options.requires = [];

			for (var i = 0, l = bowerFiles.length; i < l; i++) {
				var bowerFile = bowerFiles[i];
				if (!fs.existsSync(bowerFile.location)) continue;

				try {
					
					var json = JSON.parse(fs.readFileSync(bowerFile.location).toString());
					if (!json.main) continue;
					var mainLocation = path.join(bowerFile.dirname,json.main);
					if (!fs.existsSync(mainLocation)) {
						logger.error(json.name,"cannot find main", mainLocation);
						continue;
					}
					var main = Location.toRelative(mainLocation, tree.Location.location);
					var loc = new Location(main, tree.Location.location);
					var libname = loc.relativeLocation.slice(0, -loc.extname.length);
					options.requires.push(libname);

				} catch(e) {}

			}
			
		}

		messages.post({
			plugin: "javascriptbundle",
			course: options.course,
			bundleName: options.bundleName
		}, options.requires || null);

		return end();
		
	}

}

module.exports = Plugin;
