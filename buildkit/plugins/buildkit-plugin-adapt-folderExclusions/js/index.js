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
		events.on("build:prep", (terminal, actions) => { this.onBuildPrep(actions); });
		events.on("actions:build", (actions) => { this.onActionsBuild(actions); });
	}

	onConfigReady(config) {
		this.config = config;
	}

	onBuildPrep(actions) {
		if (!this.config.folderexclusions) return;

		if (this.config.folderexclusions.global) {
			if (_.keys(this.config.folderexclusions.global).length > 0) {
				logger.noticeThrough("Exclusions:"+_.reduce(this.config.folderexclusions.global, function(memo, value){ return memo += " " + value; }, ""));
			}
		}
		if (this.config.folderexclusions.course) {
			if (_.keys(this.config.folderexclusions.course).length > 0) {
				for (var course in this.config.folderexclusions.course) {
					if (!_.contains(this.config.terminal.courses, course)) continue;
					if (_.keys(this.config.folderexclusions.course[course]).length > 0) {
						logger.noticeThrough(course +" - Exclusions:"+_.reduce(this.config.folderexclusions.course[course], function(memo, value){ return memo += " " + value; }, ""));
					}
				}
			}
		}

	}

	onActionsBuild(actions) {
		//add extensions variable to action so that i can be use in path/glob declarations
		if (!this.config.folderexclusions) return;
		
		for (var i = 0, l = actions.length; i < l; i++) {
			var action = actions[i];
			var course = action.course;

			if (course) {
				if (this.config.folderexclusions.course && this.config.folderexclusions.course[course]) {
					action.folderexclusions = _.deepExtend({}, this.config.folderexclusions.course[course]);
					action.folderexclusions = _.map(action.folderexclusions, function(item) {
						return "!src/*/"+item;
					})
					continue;
				}
			}
			
			action.folderexclusions = _.deepExtend({}, this.config.folderexclusions.global);
		}
	}
}

module.exports = Plugin;