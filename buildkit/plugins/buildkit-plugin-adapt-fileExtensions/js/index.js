"use strict";


var defaults = {
	"json":"json",
	"hbs":"hbs",
	"less":"less",
	"js":"js"
};

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
		events.on("watch:prep", (watch) => { this.onWatchPrep(watch); });
		events.on("actions:build", (actions) => { this.onActionsBuild(actions); });
	}

	onConfigReady(config) {
		this.config = config;
	}

	onBuildPrep(actions) {
		if (!this.config.fileextensions) return;

		if (this.config.fileextensions.global) {
			if (_.keys(this.config.fileextensions.global).length > 0) {
				logger.noticeThrough("Extensions:"+_.reduce(this.config.fileextensions.global, function(memo, value, key){ return memo += " " + key + ">" + value; }, ""));
			}
		}
		if (this.config.fileextensions.course) {
			if (_.keys(this.config.fileextensions.course).length > 0) {
				for (var course in this.config.fileextensions.course) {
					if (!_.contains(this.config.terminal.courses, course)) continue;
					if (_.keys(this.config.fileextensions.course[course]).length > 0) {
						logger.noticeThrough(course+" - Extensions:"+_.reduce(this.config.fileextensions.course[course], function(memo, value, key){ return memo += " " + key + ">" + value; }, ""));
					}
				}
			}
		}

	}

	onWatchPrep(watch) {
		if (!this.config.fileextensions) return;

		if (watch.course) {
			if (this.config.fileextensions.course && this.config.fileextensions.course[watch.course]) {
				watch.fileextensions = _.deepExtend({}, defaults, this.config.fileextensions.course[watch.course]);
				return;
			}
		}
		
		watch.fileextensions = _.deepExtend({}, defaults, this.config.fileextensions.global);
	}

	onActionsBuild(actions) {
		//add extensions variable to action so that i can be use in path/glob declarations
		if (!this.config.fileextensions) return;
		
		for (var i = 0, l = actions.length; i < l; i++) {
			var action = actions[i];
			var course = action.course;

			if (course) {
				if (this.config.fileextensions.course && this.config.fileextensions.course[course]) {
					action.fileextensions = _.deepExtend({}, defaults, this.config.fileextensions.course[course]);
					continue;
				}
			}
			
			action.fileextensions = _.deepExtend({}, defaults, this.config.fileextensions.global);
		}
	}
}

module.exports = Plugin;