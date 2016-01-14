'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:javascriptuglify", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		options = options || {};
		options.src = Location.contextReplace(options.src, options);
		options.globs = Location.contextReplace(options.globs, options);

	    start();

	    var tree = treecontext.Tree(options.src)
	    var globs = new GlobCollection(options.globs);
	    var files = tree.mapGlobs(globs).files;

	    //var files = fsext.glob(options.root, options.globs);

	    if (files.length === 0) return end();

	    for (var i = 0, l = files.length; i < l; i++) {
	    	var file = fs.readFileSync(files[i].location);
				
			var ast = UglifyJS.parse(file.toString());
			ast.figure_out_scope();
			var compressor = UglifyJS.Compressor({
				sequences     : false,  // join consecutive statemets with the “comma operator”
				properties    : false,  // optimize property access: a["foo"] → a.foo
				dead_code     : false,  // discard unreachable code
				drop_debugger : false,  // discard “debugger” statements
				unsafe        : false, // some unsafe optimizations (see below)
				conditionals  : false,  // optimize if-s and conditional expressions
				comparisons   : false,  // optimize comparisons
				evaluate      : false,  // evaluate constant expressions
				booleans      : false,  // optimize boolean expressions
				loops         : false,  // optimize loops
				unused        : false,  // drop unused variables/functions
				hoist_funs    : false,  // hoist function declarations
				hoist_vars    : false, // hoist variable declarations
				if_return     : false,  // optimize if-s followed by return/continue
				join_vars     : false,  // join var declarations
				cascade       : false,  // try to cascade `right` into `left` in sequences
				side_effects  : false,  // drop side-effect-free statements
				warnings      : true,  // warn about potentially dangerous optimizations/code
				global_defs   : {}     // global definitions
			});
			ast = ast.transform(compressor);
			file = ast.print_to_string();

	    	fs.writeFileSync(files[i].location, file);
	    }

		end();
	}
	
}

module.exports = Plugin;
