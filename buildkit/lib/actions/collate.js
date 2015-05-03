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

		var srcPath = path.join(options.root, options.src);

		var list = fsext.glob(srcPath, options.globs);

		var destList = fsext.glob(fsext.relative(options.dest), options.diffGlobs);

		for (var d = destList.length -1, dl = -1; d > dl; d--) {
			var destItem = destList[d];
			var shortenedPathDest = (destItem.path).substr( options.dest.length  );
			if (shortenedPathDest.substr(0,1) == "/") shortenedPathDest = shortenedPathDest.substr(1);
			var found = false;
			for (var i = 0, l = list.length; i < l; i ++) {
				var srcItem = list[i];
				var shortenedPathSrc = (srcItem.path).substr( (srcItem.path).indexOf(options.on) + options.on.length  );
				if (shortenedPathSrc.substr(0,1) == "/") shortenedPathSrc = shortenedPathSrc.substr(1);
				if (shortenedPathDest == shortenedPathSrc) {
					found = true;
					break;
				}
			}
			if (!found) {
				logger.log("Removing: " + destItem.path.substr(process.cwd().length), 1);
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
				fsext.mkdirp({ dest: outputPath });
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdirp({ dest: dirname });

				var ifExists = fs.existsSync(outputPath);

				if (ifExists && options.force !== true) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime && outputStat.ctime >= item.ctime) continue;
				} 
				if (!ifExists) {
					logger.log("Adding: " + outputPath.substr(process.cwd().length),1);
				} else {
					fs.unlinkSync(outputPath);
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
			copyInterval = setInterval(copyLoop, 0);
		}
		function copyLoop() {
			for (var i = 0, l = copyTasks.length; i < l && copyTasksRunning < 10; i++) {
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
				done(null, options);
			}
		}
	},
	reset: function() {
		
	}
};