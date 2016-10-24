var Action = require("../libraries/Action.js");

var collate = new Action({

	initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore"
        });

    },

	perform: function(options, done, started) {
		started();
		
		if (options.root === undefined) options.root = "";

		options.root = fsext.replace(options.root, options);
		options.root = fsext.expand(options.root);
		options.dest = fsext.replace(options.dest, options);
		options.dest = fsext.expand(options.dest);

		var globs = [].concat(options.globs);
		if (options.exclusionGlobs) {
			globs = globs.concat(options.exclusionGlobs);
		}

		var srcPath = path.join(options.root, options.src);

		var diffGlobs = fsext.replace(options.diffGlobs, options);

		var list = fsext.glob(srcPath, globs);
		var destList = fsext.glob(options.dest, diffGlobs);

		for (var d = destList.length -1, dl = -1; d > dl; d--) {
			var destItem = destList[d];
			var shortenedPathDest = (destItem.path).substr( options.dest.length  ).replace(/\\/g, "/");
			if (shortenedPathDest.substr(0,1) == "/") shortenedPathDest = shortenedPathDest.substr(1);
			var found = false;
			for (var i = 0, l = list.length; i < l; i ++) {
				var srcItem = list[i];
				var shortenedPathSrc = (srcItem.path).substr( (srcItem.path).indexOf(options.on) + options.on.length  ).replace(/\\/g, "/");;
				if (shortenedPathSrc.substr(0,1) == "/") shortenedPathSrc = shortenedPathSrc.substr(1);
				if (shortenedPathDest == shortenedPathSrc) {
					found = true;
					break;
				}
			}
			if (options.delete !== false && (!found || options.switches.forceall)) {
				//logger.log("Removing: " + destItem.path.substr(process.cwd().length), 1);
				if (destItem.dir) {
					fs.rmdirSync(destItem.path);
				} else {
					fs.unlinkSync(destItem.path);
				}
			}
		}

		var copyTasks = [];
		var copyInterval = null;
		var copyTasksRunning = 0;

		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr( (item.path).indexOf(options.on) + options.on.length  );
			var outputPath = path.join(options.dest, shortenedPath);

			if (item.dir) {
				fsext.mkdir(outputPath);
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdir(dirname);

				var ifExists = fs.existsSync(outputPath);

				if (ifExists && options.force !== true) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime && outputStat.ctime >= item.ctime) continue;
				} 
				if (!ifExists) {
					//logger.log("Adding: " + outputPath.substr(process.cwd().length),1);
				} else {
					if (options.delete !== false) fs.unlinkSync(outputPath);
				}
				

				addCopyTask(item.path, outputPath);
			}
			
		}

		copyTaskEnd();
		
		function addCopyTask(from, to) {
			copyTasks.push({
				from: from,
				to: to
			});
			startCopyTasks();
		}
		function startCopyTasks() {
			if (copyInterval !== null) return;
			copyInterval = setInterval(copyLoop, 250);
		}
		function copyLoop() {
			for (var i = 0, l = copyTasks.length; i < l && copyTasksRunning < 5; i++) {
				var task = copyTasks.shift();
				copyTasksRunning++;
				var rs = fs.createReadStream(task.from);
				rs.pipe(fs.createWriteStream(task.to));
				rs.on("end", copyTaskDone);
			}
		}
		function copyTaskDone() {
			copyTasksRunning--;
			copyTaskEnd();
		}
		function copyTaskEnd() {
			if (copyTasksRunning === 0 && copyTasks.length === 0) {
				clearInterval(copyInterval);
				copyInterval = null;
				done(options);
			}
		}
	}
	
});

module.exports = collate;
