var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");

module.exports = {

	perform: function(options, done) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);
		options.root = hbs.compile(options.root)(options);
		options.root = fsext.relative(options.root);
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.relative(options.dest);
        options.context = hbs.compile(options.context)(options);
        options.context = fsext.relative(options.context);

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
        done(null, options);
	},

	reset: function() {
		
	}
	
};