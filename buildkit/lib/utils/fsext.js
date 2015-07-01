var minimatch = require("minimatch");
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
var osenv = require("osenv");

var pub = {
	exclusionGlobs: null,

	list: function (dir) {
		//return two arrays of all files and dirs in the given directory
		/*	
			each file is a String(path) object with the attributes
				.basename string
				.extname string
				.filename string 
				.dirname string
				.path string
				.dir  true/false
				.file  true/false

			returns: {
				dirs: [],
				files: []
			}
		*/
		var dirs = [];
		var files = [];
		var list = fs.readdirSync(dir);
		var pending = list.length;
		if (!pending) {
			return { dirs: dirs, files: files };
		}
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
			if (red == pending) {
				return;
			}
		});

		return { dirs: dirs, files: files };
	},

	filter: function(list, globs) {
		//filter an array of paths according to the globs supplied

		if (globs === undefined) return list;

		var options = { matchBase: true, dot: true };

		var finished;

		var excluded = false;

		if (globs instanceof Array) {

			finished = [];
			for (var i = 0, l = globs.length; i < l; i++) {
				var glob = globs[i];

				if (glob.substr(0,1) == "!") {
					excluded = true;
					//if the globs list has an exludion parameter, change tactics.
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

		if (excluded) {
			//console.log("hmm");//_.pluck(finished, "path"));
		}

		return finished;

	},

	expand: function(atPath) {
		//translate relative paths to absolute paths
		if (atPath.substr(0,1) == "~") {
			//take into consideration the ~ home variable
			var homerel = path.join(osenv.home(), atPath.substr(1));
			return homerel;
		}
		if (atPath.substr(0,1) == "/" || atPath.substr(1,1) == ":") return atPath;
		if (atPath == "" || atPath === undefined) return process.cwd();
		return path.join(process.cwd(), atPath+"");
	},
	

	_globListCache: {},
	glob: function(atPath, globs, options) {
		//get all nodes at path, from cache if available, filter by globs
		//distinguish between requests for files and directorys or both

		options = _.extend({}, { files: true, dirs: true, matchBase: true, dot: true }, options);

		var list = listFromCache(atPath, options);

		return pub.filter(list, globs, options, globs);


		function listFromCache(atPath, options) {

			options = options || {};

			atPath = pub.expand(atPath);

			if (!fs.existsSync(atPath+"")) return [];
			var stat = fs.statSync(atPath+"");
			if (stat && !stat.isDirectory()) throw "Path is not a directory: " + atPath;

			var now = (new Date()).getTime();

			var cacheName = atPath+":"+options.files+","+options.dirs;

			if (pub.exclusionGlobs) {
				cacheName += "," + pub.exclusionGlobs.join(",");
			}

			if (pub._globListCache[cacheName] && !options.refresh) {
				return pub._globListCache[cacheName].paths;
			}

			options = _.extend({}, { files: true, dirs: true }, options);

			var paths = [];
			var pathsList = pub.list(atPath+"");

			if (pub.exclusionGlobs) {
				pathsList.dirs = pub.filter(pathsList.dirs, pub.exclusionGlobs);
			}
				
			if (options.files) paths = paths.concat(pathsList.files);

			for (var d = 0, l = pathsList.dirs.length; d < l; d++) {
				var dir = pathsList.dirs[d];
				if (options.dirs) paths.push(dir);
				paths = paths.concat(listFromCache(dir, options));
			}


			pub._globListCache[cacheName] = {
				timestamp: now,
				paths: paths
			};

			return paths;
		}
	},

	mkdir: function(dest, options) {
		//make a directory recursively if need be

		options = options || {};

		var pathSplit = /(\/|\\){1}[^\/\\]+/g;

		dest = pub.expand(dest);
		if (fs.existsSync(dest)) return true;

		var parts;
		var begin;
		if (options.norel) {
			parts = dest.match(pathSplit);
			var orig = dest.replace(/\\/g, "/");
			begin = parts.join("").replace(/\\/g, "/");
			
			begin = orig.substr(0, orig.indexOf(begin));
			if (orig.substr(0,1) == "/" && options.norel && begin == "") begin = "/";

		} else {
			if (options.root === undefined) options.root = process.cwd();
			options.root = pub.expand(options.root);
			dest = dest+"";

			shortenedPath = (dest).substr(options.root.length);

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
			} else {
				outputPath = path.join(options.root, created);;
			}
			if (fs.existsSync(outputPath)) continue;
			fs.mkdirSync(outputPath, 0777);
		}
	}

};

module.exports = pub;