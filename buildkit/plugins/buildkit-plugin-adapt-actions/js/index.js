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
		events.on("action:end", (action) => { this.onActionEnd(action); });
		events.on("action:error", (action, err, terminateQueue) => { this.onActionError(action, err, terminateQueue); });
	}

	onActionEnd(action) {
		//intentionally blank
	}

	onActionError(action, err, terminateQueue) {
		if (action.options.course) {
			logger.warn(action.options.course + " - " + action.options["@displayName"]);
			logger.notice(err);
		} else {
			logger.warn(action.options["@displayName"]);
			logger.notice(err);
		}
		terminateQueue();
	}
}

module.exports = Plugin;