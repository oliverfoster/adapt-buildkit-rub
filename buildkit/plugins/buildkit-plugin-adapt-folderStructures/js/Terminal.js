"use strict";

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("config:finish", (config) => { this.onConfigFinish(config); });
	}

	onConfigFinish(config) {
		this.config = config;
		this.finishConfig();
	}

	finishConfig() {
		this.setTerminalDirectoryLayout();
		this.setTerminalSwitches();
		this.setTerminalDefaults();
	}

	setTerminalDirectoryLayout() {
		//select directory layout
		if (fs.existsSync("./src/course")) {
			this.config.terminal.switches.type = "src/course";
			this.config.terminal.switches.typeName = "Adapt Learning";
		} else if (fs.existsSync("./src/courses")) {
			this.config.terminal.switches.type = "src/courses/course"
			this.config.terminal.switches.typeName = "Kineo src/courses";
		} else {
			this.config.terminal.switches.type = "builds/courses/course";
			this.config.terminal.switches.typeName = "Kineo src/builds";
		}
	}

	setTerminalSwitches() {
		//take config.switches and apply
		var switchRules = this.config.terminal.switchRules;
		var newSwitches = {};
		for (var i = 0, l = switchRules.length; i < l; i++) {
			var switchRule = switchRules[i];
			var found = _.findWhere([this.config.terminal.switches], switchRule.on || {});
			if (found) {

				for (var k in switchRule.alwaysSet) {
					this.config.terminal.switches[k] = switchRule.alwaysSet[k];
				}
				for (var k in switchRule.unspecifiedSet) {
					newSwitches[k] = this.config.terminal.switches[k] !== undefined ? this.config.terminal.switches[k] : switchRule.unspecifiedSet[k];
				}
			}
		}

		_.extend(this.config.terminal.switches, newSwitches);

	}

	setTerminalDefaults() {
		//take config.defaults and apply

		switch(this.config.terminal.switches.type) {
		case "builds/courses/course":
			this.config.terminal.outputDest = this.config.terminal.multipleDestPath;
			break;
		case "src/courses/course":
			this.config.terminal.outputDest = this.config.terminal.multipleDestPath;
			break;
		case "src/course":
			this.config.terminal.outputDest = this.config.terminal.singleDestPath;
			break;
		}

	}

}

module.exports = Plugin;