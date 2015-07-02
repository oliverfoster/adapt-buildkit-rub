var Action = require("../utils/Action.js");

var jsonlint = new Action({

	initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "JSONLint": "json-lint"
        });

    },

	perform: function(options, done, started) {
		started();
		
		if (options.root === undefined) options.root = "";

		options.src = fsext.replace(options.src, options);
		options.src = fsext.expand(options.src);

		var list = fsext.glob(options.src, options.globs, { dirs: false });

		var errors = "";
		for (var i = 0, l = list.length; i < l; i++) {
			var jsonstring = fs.readFileSync(list[i]+"").toString();
			var lint = JSONLint(jsonstring);
			if (lint.error) {
				errors+="\nFile: " +list[i]+ "\nError: " + lint.error + "\nLine: " + lint.line + "\nCharacter: " + lint.character+"\n";
			}
		}
		
		done(options, errors);

	}

});

module.exports = jsonlint;