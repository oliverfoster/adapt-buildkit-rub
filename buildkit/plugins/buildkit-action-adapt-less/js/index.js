'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:less", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {

		options = options || {};

		options.dest = Location.contextReplace(options.dest, options);

		var globs = [].concat(options.globs);
		if (options.exclusionGlobs) {
			globs = globs.concat(options.exclusionGlobs);
		}

		var output = "";

		var tree = treecontext.Tree(options.src, ".");
		globs = Location.contextReplace(globs, options);
		globs = new GlobCollection(globs, options.folderexclusions);
		var files = tree.mapGlobs(globs).files;

		if (fs.existsSync(options.dest) && options.switches.force !== true && !options.switches.forceall) {
			var destStat = fs.statSync(options.dest);

	        var changed = false;
	        for (var i = 0, l = files.length; i < l; i++) {
	            if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
	                changed = true;
	                break;
	            }
	        }

		    var mapExists = false;
            if (fs.existsSync(options.dest + ".map")  ) {
                mapExists = true;
            } 
            changed = (mapExists == (!options.switches.debug)) || changed;
            
		    if (!changed) {
		    	return end();
		    }
		}

		start();

	    if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

		var includeFile = "";

		for (var i = 0, l = files.length; i < l; i++) {
			var file = files[i];
			var relativePath = file.location.substr(process.cwd().length+1);
			includeFile += '@import "' + relativePath + '";\n';
		}


		options.includeFile = includeFile;

		switch (options.switches.debug) {
		case true:
			if (options.switches.quick) delete options.less.sourceMap;
            options.less.compress = false;
            break;
        default:
        	delete options.less.sourceMap;
        	options.less.compress = !options.switches.quick;
        	break;
        } 

		less.render(options.includeFile, options.less, (error, output) => {
			try {
				if (error) {
					var output = "";
					for (var k in error) {
						switch (typeof error[k]) {
						case "object": case "function": case "undefined": case "null":
							break;
						default:
							output += k +": " + JSON.stringify(error[k]) + "\n";
						}
					}
					end(output);
					return;
				}
				var destDir = Location.toAbsolute(path.dirname(options.dest));
				FileSystem.mkdir(destDir);

				fs.writeFileSync(options.dest, output.css);
				if (output.map) {
					fs.writeFileSync(options.dest + ".map", output.map);
					if (options.sourceMapRelocate) this.sourceMapRelocate(options.dest + ".map", options.sourceMapRelocate);
				}
				end();
			} catch(e) {
				end(e);
			}
		});
	}

	sourceMapRelocate(file, pathRelocation) {
		var json = JSON.parse(fs.readFileSync(file));
		for (var i = 0, l = json.sources.length; i < l; i++) {
			json.sources[i] = path.join(pathRelocation, json.sources[i]);
			json.sources[i] = json.sources[i].replace(/\\/g, "/");
		}
		fs.writeFileSync(file, JSON.stringify(json));
	}
	
}

module.exports = Plugin;
