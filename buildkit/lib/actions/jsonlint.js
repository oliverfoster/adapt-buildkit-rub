var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");
var JSONLint = require("json-lint");

module.exports = {

	perform: function(options, done) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);

		options.src = hbs.compile(options.src)(options);
		options.src = fsext.relative(options.src);

		var list = fsext.glob(options.src, options.globs, { dirs: false });

		var errors = "";
		for (var i = 0, l = list.length; i < l; i++) {
			var jsonstring = fs.readFileSync(list[i]+"").toString();
			var lint = JSONLint(jsonstring);
			if (lint.error) {
				errors+="\nFile: " +list[i]+ "\nError: " + lint.error + "\nLine: " + lint.line + "\nCharacter: " + lint.character+"\n";
			}
		}
		
		done(errors, options);

	},

	reset: function() {
		
	}
	
};