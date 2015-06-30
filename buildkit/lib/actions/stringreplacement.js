var Action = require("../utils/Action.js");

var stringreplacement = new Action({

    initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "hbs": "handlebars"
        });

    },

	perform: function(options, done) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);
		options.root = hbs.compile(options.root)(options);
		options.root = fsext.expand(options.root);
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.expand(options.dest);
        options.context = hbs.compile(options.context)(options);
        options.context = fsext.expand(options.context);

		var srcPath = path.join(options.root, options.src);

        if (fs.existsSync(srcPath)) {

    		var list = fsext.glob(srcPath, options.globs);
            if (list.length > 0) {
                var filePath = list[0]+"";
                var isFileExists = fs.existsSync(filePath);
                if (isFileExists) {
                    var fileAsString = fs.readFileSync(filePath).toString();
                    var contextAsString = fs.readFileSync(options.context).toString();
                    var contextAsJSON = JSON.parse(contextAsString);
                    var template = hbs.compile(fileAsString);
                    var output = template(contextAsJSON);

                    fs.writeFileSync(options.dest, output);
                }
            }
        }
        done(options);
	}
    
});

module.exports = stringreplacement;