'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:zip", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		start();
		
		if (options.root === undefined) options.root = "";

		var now = (new Date());
		options.scoDate = (now.getYear()+"").substr(1) + twoDigit(now.getMonth()+1) + twoDigit(now.getDate()) + "_" + twoDigit(now.getHours()) + twoDigit(now.getMinutes()) + twoDigit(now.getSeconds());
		
		options.root = Location.contextReplace(options.root, options);
		options.root = Location.toAbsolute(options.root);
		
		var srcPath = path.join(options.root, options.src);

		var tree = treecontext.Tree(srcPath, ".");
		options.contextGlob = Location.contextReplace(options.contextGlob, options);
        var contextGlobs = new GlobCollection(options.contextGlob);
        var contextPaths = tree.mapGlobs(contextGlobs).files;

		if (contextPaths.length) {
			var context = JSON.parse(fs.readFileSync(contextPaths[0].location));
			options = _.extend({}, context, options);
		}
		
		options.dest = Location.contextReplace(options.dest, options);
		options.dest = Location.toAbsolute(options.dest);

		options.globs = Location.contextReplace(options.globs, options);
        var globs = new GlobCollection(options.globs);
        var list = tree.mapGlobs(globs).files;

		var scodest = path.dirname(options.dest);
		FileSystem.mkdir(scodest, {norel:true});

		var archive = new zipLibrary();
		var zipFiles = [];
		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.location).substr(options.root.length);
			shortenedPath = shortenedPath.replace(/\\/g, "/");
			if (shortenedPath.substr(0,1) == "/") shortenedPath = shortenedPath.substr(1);
			zipFiles.push(
				{ "name": shortenedPath, path: item.location }
			);
		}

		archive.addFiles(zipFiles, function (err) {
		    if (err) {
		    	return end("Err while adding files");
		    }
		    archive.toBuffer(function(buff){;
			    fs.writeFile(options.dest, buff, function () {
			        end();
			    });
			});
		});

		function twoDigit(num) {
			var snum = ""+num;
			return (snum.length < 2 ? "0" : "") + snum + "";
		}

	}
	
}

module.exports = Plugin;
