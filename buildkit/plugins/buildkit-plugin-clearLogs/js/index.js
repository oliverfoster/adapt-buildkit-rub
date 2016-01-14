'use strict';

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this._logsCleared = {};
	}

	setupEventListeners() {
		events.on("config:ready", (config) => { this.onConfigReady(config); });
	}

	onConfigReady(config) {
		this.config = config;

		if (this.config.clearLogs === false) return;

		logger.noticeThrough("Clearing logs...");

		this._logsCleared = {};
		
		for (var a = 0, al = config.actions.length; a < al; a++) {
			var options = config.actions[a];
			if (!options.logPath) continue

			if (this._logsCleared[options.logPath]) continue;

			if (options.buildConfig && options.buildConfig.clearLogs === false) {
				logger.file(options.logPath, ">" + (new Date()).toString() + "<", false);
			} else {
				logger.file(options.logPath, ">" + (new Date()).toString() + "<" , true);
			}

			this._logsCleared[options.logPath] = true;

		}
	}
	
}

module.exports = Plugin;
