var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");

function twoDigit(num) {
	var snum = ""+num;
	return (snum.length < 2 ? "0" : "") + snum;
}

module.exports = {
	perform: function(options, done) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);

		var now = (new Date());
		options.scoDate = now.getYear() + twoDigit(now.getMonth()) + twoDigit(now.getDate()) + "_" + twoDigit(now.getHours()) + twoDigit(now.getMinutes()) + twoDigit(now.getSeconds());
		
		options.root = hbs.compile(options.root)(options);
		options.root = fsext.relative(options.root);
		
		var srcPath = path.join(options.root, options.src);

		var contextPaths = fsext.glob(srcPath, options.contextGlob, { dirs: false });
		if (contextPaths.length) {
			var context = JSON.parse(fs.readFileSync(contextPaths[0].path));
			options = _.extend({}, context, options);
		}
		
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.relative(options.dest);

		var list = fsext.glob(srcPath, options.globs, { dirs: false });
		var zip = require("node-native-zip-compression");

		var scodest = path.dirname(options.dest);
		fsext.mkdirp({dest:scodest, norel:true});

		var archive = new zip();
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

		archive.addFiles(zipFiles, function (err) {
		    if (err) {
		    	return done("Err while adding files", options);
		    }
		    
		    archive.toBuffer(function(buff){;
			    fs.writeFile(options.dest, buff, function () {
			        done(null, options);
			    });
			});
		});

	},
	reset: function() {
		
	}
};