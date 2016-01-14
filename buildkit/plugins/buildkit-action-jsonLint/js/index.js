'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:jsonlint", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		start();
		
		if (options.root === undefined) options.root = "";

		options.src = Location.contextReplace(options.src, options);
		options.src = Location.toAbsolute(options.src);

		var tree = treecontext.Tree(options.src, ".");
		options.globs = Location.contextReplace(options.globs, options);
		var globs = new GlobCollection(options.globs);
		var list = tree.mapGlobs(globs).files;

		var errors = "";
		for (var i = 0, l = list.length; i < l; i++) {
			var jsonstring = fs.readFileSync(list[i].location).toString();
			var lint = JSONLint(jsonstring);
			if (lint.error) {
				errors+="\nFile: " +list[i].relativeLocation+ "\nError: " + lint.error + "\nLine: " + lint.line + "\nCharacter: " + lint.character+"\n";
			}
		}
		
		if (errors) {
			end(errors);
		} else {
			end();
		}
	}
	
}

module.exports = Plugin;
