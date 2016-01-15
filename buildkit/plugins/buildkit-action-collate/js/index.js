'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:collate", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {

		options.src = Location.contextReplace(options.src, options);
		options.dest = Location.contextReplace(options.dest, options);

		var diffGlobs = Location.contextReplace(options.diffGlobs, options);
		var globs = Location.contextReplace(options.globs, options);

		if (options.folderexclusions) {
			globs = globs.concat(options.folderexclusions);
		}

		if (options.switches.force) options.force = true;

		start();

		FileSystem.collate(options.src, options.dest, options.on, globs, diffGlobs, function() {
			end();
		}, options);
	}
	
}

module.exports = Plugin;
