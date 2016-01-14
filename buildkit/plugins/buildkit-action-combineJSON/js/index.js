'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:combinejson", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		start();
        
        if (options.root === undefined) options.root = "";

        options.root = Location.contextReplace(options.root, options);
        options.root = Location.toAbsolute(options.root);

        options.dest = Location.contextReplace(options.dest, options);
        options.dest = Location.toAbsolute(options.dest);

        if (options.dest.indexOf("**")) {
            //expand language folders
            var globIndex = options.dest.indexOf("**");
            var base = options.dest.slice(0, globIndex);
            var glob = options.dest.slice(globIndex);

            var tree = treecontext.Tree(base, ".");
            glob = Location.contextReplace(glob, options);
            var globs = new GlobCollection(glob, options.folderexclusions);
            var results = tree.mapGlobs(globs).files;

            //var results = fsext.glob(base, glob, {dirs:true, files:true});

            for (var i = 0, l = results.length; i < l; i++) {
                var expandedPath = results[i].location;
                var opts = _.deepExtend({}, options, {dest:expandedPath});
                combine(opts);
            }

        } else {

            combine(options);

        }

        function combine(options) {

            var srcPath = path.join(options.root, options.src);

            if (fs.existsSync(srcPath)) {

                var tree = treecontext.Tree(srcPath, ".");
                options.globs = Location.contextReplace(options.globs, options);
	            var globs = new GlobCollection(options.globs, options.folderexclusions);
	            var list = tree.mapGlobs(globs).files;

                for (var i = 0, pathItem; pathItem = list[i++];) {
                    var filePath = pathItem.location;
                    var isSrcExists = fs.existsSync(filePath);
                    var isDestExists = fs.existsSync(options.dest);
                    if (isSrcExists && isDestExists) {
                       
                        var srcAsString = fs.readFileSync(filePath).toString();
                        var destAsString = fs.readFileSync(options.dest).toString();
                       
                        var srcAsJSON = JSON.parse(srcAsString);
                        var destAsJSON = JSON.parse(destAsString);

                        srcAsJSON = _.deepExtend(srcAsJSON, destAsJSON)

                        fs.writeFileSync(options.dest, JSON.stringify(srcAsJSON, null, 4));
                    }
                }
            }
        }


        end();
	}
	
}

module.exports = Plugin;
