"use strict";

class Build {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("build:start", (terminalOptions, selectedActions) => { this.onBuildStart(terminalOptions, selectedActions); });
	}

	onBuildStart(terminalOptions, selectedActions) {
		this.startBuildOperations(terminalOptions, selectedActions);
	}

	startBuildOperations(terminalOptions, actions) {

		logger.notice("Building...");
		logger.hold(true);
		
		actionqueue.reset();

		events.emit("actions:expand", terminalOptions, actions);

		actionqueue.start();

	}
}

module.exports = Build;