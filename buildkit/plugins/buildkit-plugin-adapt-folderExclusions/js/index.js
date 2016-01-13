'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("plugins:initialized", () => { this.onPluginsInitialized(); });
	}

	onPluginsInitialized() {
		
	}
	
}

module.exports = Plugin;
