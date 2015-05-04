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
		var copyTasks = [];
		var copyInterval = null;
		var copyTasksRunning = 0;

		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr(options.root.length);
			var outputPath = path.join(options.dest, shortenedPath);

			if (item.dir) {
				fsext.mkdirp({ dest: outputPath });
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdirp({ dest: dirname });

				if (fs.existsSync(outputPath) && options.force !== true) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime ) continue;
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