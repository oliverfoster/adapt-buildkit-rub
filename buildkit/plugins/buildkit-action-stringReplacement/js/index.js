'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:stringreplacement", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		start();
        
		options.dest = Location.contextReplace(options.dest, options);
		options.dest = Location.toAbsolute(options.dest);

		var srcPath = Location.toAbsolute(options.src);

        if (fs.existsSync(srcPath)) {

            var tree = treecontext.Tree(options.src, ".");
            options.globs = Location.contextReplace(options.globs, options);
            var globs = new GlobCollection(options.globs);
            var list = tree.mapGlobs(globs).files;

            if (list.length > 0) {
                var filePath = list[0].location;
                var isFileExists = fs.existsSync(filePath);
                if (isFileExists) {
                
                    for (var k in options.contexts) {
                        var contextPath =  Location.contextReplace(options.contexts[k], options);
                        contextPath = Location.toAbsolute(contextPath);
                        options[k] = JSON.parse(fs.readFileSync(contextPath).toString());
                    }

                    options.context = Location.contextReplace(options.context, options);
                    options.context = Location.toAbsolute(options.context);

                    var fileAsString = fs.readFileSync(filePath).toString();
                    var contextAsString = fs.readFileSync(options.context).toString();
                    var contextAsJSON = JSON.parse(contextAsString);
                    var template = handlebars.compile(fileAsString);
                    var output = template(contextAsJSON);

                    fs.writeFileSync(options.dest, output);
                }
            }
        }
        end();
	}
	
}

module.exports = Plugin;
