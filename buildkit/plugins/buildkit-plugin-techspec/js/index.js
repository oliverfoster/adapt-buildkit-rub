"use strict";

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this.config = null;
	}

	setupEventListeners() {
		events.on("config:ready", (config) => { this.onConfigReady(config); });
		events.on("actions:build", (actions) => { this.onActionsBuild(actions); });
	}

	onConfigReady(config) {
		this.config = config;
	}

	onActionsBuild(actions) {
		//update techspec settings from buildkit-config.json
		if (!this.config.techspec) return;

		for (var i = 0, l = actions.length; i < l; i++) {
			var action = actions[i];
			if (!action.techspec) continue
			
			action.techspec = _.deepExtend({}, action.techspec, this.config.techspec);
		}
	}
}

module.exports = Plugin;