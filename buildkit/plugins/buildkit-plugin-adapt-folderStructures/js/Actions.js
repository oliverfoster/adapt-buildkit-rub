"use strict";

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("actions:expand", (options, actions) => { this.onActionsExpand(options, actions); });
	}

	onActionsExpand(terminalOptions, actions) {
		switch(terminalOptions.switches.type) {
		case "builds/courses/course":
			this.buildBuildCoursesFolders(terminalOptions, actions);
			break;
		case "src/courses/course":
			this.buildSrcCoursesFolders(terminalOptions, actions);
			break;
		case "src/course":
			this.buildSrcCourseFolder(terminalOptions, actions);
			break;
		}

	}

	buildBuildCoursesFolders(terminalOptions, actions) {
		var tree = treecontext.Tree(Location.toAbsolute(terminalOptions.outputDest));
		var dirs = _.pluck(tree.populate().dirs, "filename");

		var shouldPopuplateCourses = terminalOptions.courses.length === 0;
		
		for (var i = 0, l = dirs.length; i < l; i++) {
			var dir = dirs[i];

			if (shouldPopuplateCourses) {
				terminalOptions.courses.push(dir);
			}

			if (terminalOptions.courses.length > 0)
				if (terminalOptions.courses.indexOf(dir) == -1) continue;

			var opts = _.deepExtend({}, terminalOptions, { course: dir });
			events.emit("actions:run", opts, actions);
		}
	}

	buildSrcCoursesFolders(terminalOptions, actions) {
		var tree = treecontext.Tree(Location.toAbsolute(terminalOptions.srcCoursesPath));
		var dirs = _.pluck(tree.populate().dirs, "filename");

		var shouldPopuplateCourses = terminalOptions.courses.length === 0;

		for (var i = 0, l = dirs.length; i < l; i++) {
			var dir = dirs[i];

			if (shouldPopuplateCourses) {
				terminalOptions.courses.push(dir);
			}

			if (terminalOptions.courses.length > 0)
				if (terminalOptions.courses.indexOf(dir) == -1) continue;

			var opts = _.deepExtend({}, terminalOptions, { course: dir });
			events.emit("actions:run", opts, actions);
		}

	}

	buildSrcCourseFolder(terminalOptions, actions) {
		var opts = _.deepExtend({}, terminalOptions, { course: "" });
		events.emit("actions:run", opts, actions);
	}

}

module.exports = Plugin;
