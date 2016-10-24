var Action = require("../libraries/Action.js");

var queue = [];
var inProgress = false;

var zip = new Action({

	initialize: function() {

		this.deps(global, {
			"fsext": "../libraries/fsext.js",
			"logger": "../libraries/logger.js",
			"fs": "fs",
			"path": "path",
			"_": "underscore",
			"zipLibrary": "node-native-zip-compression"
		});

	},

	perform: function(options, done, started) {
		started();
		
		if (options.root === undefined) options.root = "";

		var now = (new Date());
		options.scoDate = (now.getYear()+"").substr(1) + twoDigit(now.getMonth()+1) + twoDigit(now.getDate()) + "_" + twoDigit(now.getHours()) + twoDigit(now.getMinutes()) + twoDigit(now.getSeconds());
		
		options.root = fsext.replace(options.root, options);
		options.root = fsext.expand(options.root);
		
		var srcPath = path.join(options.root, options.src);

		var contextPaths = fsext.glob(srcPath, options.contextGlob, { dirs: false });
		if (contextPaths.length) {
			var context = JSON.parse(fs.readFileSync(contextPaths[0].path));
			options = _.extend({}, context, options);
		}
		
		options.dest = fsext.replace(options.dest, options);
		options.dest = fsext.expand(options.dest);

		var list = fsext.glob(srcPath, options.globs, { dirs: false });

		var scodest = path.dirname(options.dest);
		fsext.mkdir(scodest, {norel:true});

		var archive = new zipLibrary();
		var zipFiles = [];
		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr(options.root.length);
			shortenedPath = shortenedPath.replace(/\\/g, "/");
			if (shortenedPath.substr(0,1) == "/") shortenedPath = shortenedPath.substr(1);
			zipFiles.push(
				{ "name": shortenedPath, path: item.path }
			);
		}

		queue.push({
			zipFiles: zipFiles,
			options: options,
			done: done,
			archive: archive
		});

		runQueueItem();

		function twoDigit(num) {
			var snum = ""+num;
			return (snum.length < 2 ? "0" : "") + snum + "";
		}

	}

});

function runQueueItem() {
	if (inProgress) return;

	inProgress = true;
	var item = queue.shift();
	var zipFiles = item.zipFiles;
	var options = item.options;
	var done = item.done;
	var archive = item.archive;

	var runNext = runQueueItem;

	archive.addFiles(zipFiles, function (err) {
	    if (err) {
	    	return done(options, "Err while adding files");
	    }
	    
	    archive.toBuffer(function(buff){;
		    fs.writeFile(options.dest, buff, function () {
		        done(options);
		        inProgress = false;
		        runNext();
		    });
		});
	});
}


module.exports = zip;
