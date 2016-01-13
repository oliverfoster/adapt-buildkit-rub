"use strict";

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("watches:expand", (watches) => { this.onWatchesExpand(watches); });
	}

	onWatchesExpand(watches) {
		var expanded = [];
		var courses = this.config.terminal.courses;

		watches = _.filter(watches, (item) => {
			if (item.expand) {
				if (courses.length === 0) {
					var cloned = _.deepExtend({}, item);
					var options = _.deepExtend({}, this.config.terminal);
					options.course = "";
					cloned.path = Location.contextReplace(cloned.path, options);
					cloned.globs = Location.contextReplace(cloned.globs, options);
					expanded.push(cloned);
				} else {
					for (var i = 0, l = courses.length; i < l; i++) {
						var cloned = _.deepExtend({}, item);
						var options = _.deepExtend({}, this.config.terminal);
						options.course = courses[i];
						cloned.path = Location.contextReplace(cloned.path, options);
						cloned.globs = Location.contextReplace(cloned.globs, options);
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



