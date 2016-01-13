'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("plugins:initialized", () => { this.onPluginsInitialized(); });
		events.on("action:run:stringreplacement", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onPluginsInitialized() {
		
	}

	onActionRun(options, start, end) {
		start();
        
		options.dest = Location.contextReplace(options.dest, options);
		options.dest = Location.toAbsolute(options.dest);
        options.context = Location.contextReplace(options.context, options);
        options.context = Location.toAbsolute(options.context);

		var srcPath = Location.toAbsolute(options.src);

        if (fs.existsSync(srcPath)) {

            var tree = treecontext.Tree(options.src, ".");
            var globs = new GlobCollection(options.globs);
            var list = tree.mapGlobs(globs).files;

            if (list.length > 0) {
                var filePath = list[0]+"";
                var isFileExists = fs.existsSync(filePath);
                if (isFileExists) {
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
