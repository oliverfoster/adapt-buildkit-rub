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
		events.on("action:end", (action) => { this.onActionEnd(action); });
		events.on("action:error", (action, err, terminateQueue) => { this.onActionError(action, err, terminateQueue); });
	}

	onConfigReady(config) {
		this.config = config;
	}

	onActionEnd(action) {
		//intentionally blank
		if (this.config.terminal.switches.verbose) {
			if (action.options.course) {
				logger.verboseThrough(action.options.course + " - " + action.options["@displayName"], action.runningTime());
			} else {
				logger.verboseThrough(action.options["@displayName"], action.runningTime());
			}
		}
	}

	onActionError(action, err, terminateQueue) {
		if (action.options.course && !action.options['@buildOnce']) {
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