var minimatch = require("minimatch");
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
var osenv = require("osenv");

var pathSplit = /(\/|\\){1}[^\/\\]+/g;

var listCache = {};

var pub = {

	walkSync: function (dir, done, that) {
		that = that || this;
		var dirs = [];
		var files = [];
		var list = fs.readdirSync(dir);
		var pending = list.length;
		if (!pending) return done.call(that, dirs, files);
		var red = 0;
		list.forEach(function(file) {
			var osbp;
			var subdirpath = osbp = path.join(dir, file);
			var stat = fs.statSync(subdirpath);
			
			subdirpath = new String(subdirpath);

			stat.basename = path.basename(subdirpath);
			stat.extname = path.extname(subdirpath);
			stat.filename = path.basename(subdirpath, stat.extname);
			stat.dirname = path.dirname(subdirpath);
			stat.path = osbp;


			red++;
			if (stat && !stat.isDirectory()) {
				stat.dir = false;
				stat.file = true;
				subdirpath = _.extend(subdirpath, stat);
				files.push( subdirpath );
			} else {
				stat.dir = true;
				stat.file = false;
				subdirpath = _.extend(subdirpath, stat);
				dirs.push( subdirpath );
			}
			if (red == pending) return done.call(that, dirs, files);
		});
	},

	globMatch: function(list, globs, options) {
		
		if (globs === undefined) return list;

		options = _.extend({}, { matchBase: true }, options);

		var finished;

		if (globs instanceof Array) {
			finished = [];
			for (var i = 0, l = globs.length; i < l; i++) {
				var glob = globs[i];
				if (glob.substr(0,1) == "!") {
					
					list = minimatch.match(list, glob, options);
					if (finished.length > 0) {
						finished = minimatch.match(finished, glob, options);
					}

				} else {

					finished = finished.concat(minimatch.match(list, glob, options));

				}
			}
			finished = _.uniq(finished);
		} else if (typeof globs == "string") {
			finished = minimatch.match(list, globs, options);
		}

		return finished;

	},

	relative: function(atPath) {
		if (atPath.substr(0,1) == "~") {
			var homerel = path.join(osenv.home(), atPath.substr(1));
			return homerel;
		}
		if (atPath.substr(0,1) == "/" || atPath.substr(1,1) == ":") return atPath;
		if (atPath == "" || atPath === undefined) return process.cwd();
		return path.join(process.cwd(), atPath+"");
	},

	reset: function() {
		listCache = {};
	},

	list: function(atPath, options) {

		options = options || {};

		atPath = pub.relative(atPath);

		if (!fs.existsSync(atPath+"")) return [];
		var stat = fs.statSync(atPath+"");
		if (stat && !stat.isDirectory()) throw "Path is not a directory: " + atPath;

		var now = (new Date()).getTime();

		if (listCache[atPath+":"+options.files+","+options.dirs]) {
			return listCache[atPath+":"+options.files+","+options.dirs].paths;
		}

		options = _.extend({}, { files: true, dirs: true }, options);

		var paths = [];

		pub.walkSync(atPath+"", function(dirs, files) {
			
			if (options.files) paths = paths.concat(files);

			for (var d = 0, l = dirs.length; d < l; d++) {
				var dir = dirs[d];
				if (options.dirs) paths.push(dir);
				paths = paths.concat(pub.list(dir, options));
			}
			
		});

		listCache[atPath+":"+options.files+","+options.dirs] = {
			timestamp: now,
			paths: paths
		};

		return paths;
	},

	glob: function(atPath, globs, options) {
		options = _.extend({}, { files: true, dirs: true, matchBase: true }, options);

		var list = pub.list(atPath, options);

		return pub.globMatch(list, globs, options);
	},

	mkdirp: function(options) {
		options.dest = pub.relative(options.dest);
		if (fs.existsSync(options.dest)) return true;

		var parts;
		var begin;
		if (options.norel) {
			parts = options.dest.match(pathSplit);
			var orig = options.dest.replace(/\\/g, "/");
			begin = parts.join("").replace(/\\/g, "/");
			
			begin = orig.substr(0, orig.indexOf(begin));

		} else {
			if (options.root === undefined) options.root = process.cwd();
			options.root = pub.relative(options.root);
			options.dest = options.dest+"";

			shortenedPath = (options.dest).substr(options.root.length);

			parts = shortenedPath.match(pathSplit);
		}

		var created = "";

		for (var p = 0, l = parts.length; p < l; p++) {
			if (p === 0) {
				created+=parts[p].substr(1);
			} else {
				created+=parts[p];
			}
			var outputPath;
			if (options.norel){
				outputPath = path.join(begin, created);
				console.log(outputPath);
			} else {
				outputPath = path.join(options.root, created);;
			}
			if (fs.existsSync(outputPath)) continue;
			fs.mkdirSync(outputPath, 0777);
		}
	}

};

module.exports = pub;