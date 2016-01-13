'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:copy", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {

		options.src = Location.contextReplace(options.src, options);
		options.dest = Location.contextReplace(options.dest, options);

		start();

		FileSystem.copy(options.src, options.dest, options.globs, function() {
			end();
		});
	}
	
}

module.exports = Plugin;
