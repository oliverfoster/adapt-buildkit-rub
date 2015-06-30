var Action = require("../utils/Action.js");

var copy = new Action({

	initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "hbs": "handlebars"
        });

    },

	perform: function(options, done) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);

		options.root = hbs.compile(options.root)(options);
		options.root = fsext.expand(options.root);
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.expand(options.dest);

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
				fsext.mkdir(outputPath);
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdir(dirname);

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
				done(options);
			}
		}

	}

});

module.exports = copy;