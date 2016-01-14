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
		events.on("watches:expand", (watches) => { this.onWatchesExpand(watches); });
	}

	onConfigReady(config) {
		this.config = config;
	}

	onWatchesExpand(watches) {
		var expanded = [];
		var courses = this.config.terminal.courses;

		watches = _.filter(watches, (item) => {
			if (item.expand) {
				if (courses.length === 0) {
					var cloned = _.deepExtend({}, this.config.terminal, item);
					cloned.course = "";
					events.emit("watch:prep", cloned);
					cloned.path = Location.contextReplace(cloned.path, cloned);
					cloned.globs = Location.contextReplace(cloned.globs, cloned);
					expanded.push(cloned);
				} else {
					for (var i = 0, l = courses.length; i < l; i++) {
						var cloned = _.deepExtend({}, this.config.terminal, item);
						cloned.course = courses[i];
						events.emit("watch:prep", cloned);
						cloned.path = Location.contextReplace(cloned.path, cloned);
						cloned.globs = Location.contextReplace(cloned.globs, cloned);
						expanded.push(cloned);
					}
				}
				return false;
			}
			return true;
		});

		watches = watches.concat(expanded);

		events.emit("watches:expanded", watches);

	}

}

module.exports = Plugin;



