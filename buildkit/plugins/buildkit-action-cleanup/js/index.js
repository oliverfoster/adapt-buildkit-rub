'use strict';

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this.hasCleaned = {};
	}

	setupEventListeners() {
		events.on("plugins:initialized", () => { this.onPluginsInitialized(); });
		events.on("action:run:cleanup", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onPluginsInitialized() {
		
	}

	onActionRun(options, start, end) {
		if (this.hasCleaned[options['@name']] && options['@buildOnce']) return end();

		start();
		options = options || {};
		
		options.src = Location.contextReplace(options.src, options);
		options.src = Location.toAbsolute(options.src);

		var output = "";

	    var tree = treecontext.Tree(options.src, ".");
	    var globs = new GlobCollection(options.globs);
	    var list = tree.mapGlobs(globs);

	    if (list.files.length > 0 || list.dirs.length > 0) {
		    FileSystem.remove(options.src, options.globs);
		}

	    if (options.deleteRoot && fs.existsSync(options.src)) {
	    	fs.rmdirSync(options.src);
	    }

	   	this.hasCleaned[options['@name']] = true;

		end();
	}
	
}

module.exports = Plugin;
