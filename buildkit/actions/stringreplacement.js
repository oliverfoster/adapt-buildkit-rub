var Action = require("../libraries/Action.js");

var stringreplacement = new Action({

    initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "hbs": "handlebars"
        });

    },

	perform: function(options, done, started) {
        started();
        
		if (options.root === undefined) options.root = "";
        
		options.root = fsext.replace(options.root, options);
		options.root = fsext.expand(options.root);
		options.dest = fsext.replace(options.dest, options);
		options.dest = fsext.expand(options.dest);
        options.context = fsext.replace(options.context, options);
        options.context = fsext.expand(options.context);

		var srcPath = path.join(options.root, options.src);

        if (fs.existsSync(srcPath)) {

            var globs = [].concat(options.globs);
            if (options.exclusionGlobs) {
                globs = globs.concat(options.exclusionGlobs);
            }

    		var list = fsext.glob(srcPath, globs);
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