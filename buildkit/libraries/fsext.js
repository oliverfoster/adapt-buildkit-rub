var minimatch = require("minimatch");
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
var osenv = require("osenv");
var hbs = require("handlebars");

var pub = {
	exclusionGlobs: null,

	file: function(filepath) {

		if (filepath instanceof Array) {
			var filePaths = [];
			for (var i = 0, l = filepath.length; i < l; i++) {
				filePaths = pub.file(filepath[i]);
			}
			return filePaths;
		}

		var osbp = filepath
		var stat = fs.statSync(filepath);
		
		filepath = new String(filepath);

		stat.basename = path.basename(filepath+"");
		stat.extname = path.extname(filepath+"");
		stat.filename = path.basename(filepath+"", stat.extname);
		stat.dirname = path.dirname(filepath+"");
		stat.path = osbp;

		if (stat && !stat.isDirectory()) {
			stat.dir = false;
			stat.file = true;
			filepath = _.extend(filepath, stat);
		} else {
			stat.dir = true;
			stat.file = false;
			filepath = _.extend(filepath, stat);
		}

		return filepath;
	},

	list: function (dir) {
		//return two arrays of all files and dirs in the given directory
		/*	
			each file is a String(path) object with the attributes
				.basename string   filename with extname
				.extname string    no filename
				.filename string   no extname
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

		if (!fs.existsSync(dir)) {
			return {dirs:[], files:[]};
		}

		var list = fs.readdirSync(dir);
		var pending = list.length;
		if (!pending) {
			return { dirs: dirs, files: files };
		}
		var red = 0;
		for (var i = 0, l = list.length; i < l; i++) {
			var file = list[i];
			var fullpath = path.join(dir, file);

			if (!fs.existsSync(fullpath)) {
				red++;
				continue;
			}
			
			var fileObject = pub.file(fullpath);

			red++;

			if (fileObject && fileObject.dir) {
				dirs.push(fileObject);
			} else if (fileObject && fileObject.file) {
				files.push(fileObject);
			}

			if (red == pending) {
				continue;
			}
		}

		return { dirs: dirs, files: files };
	},

	filter: function(list, globs, options) {
		//filter an array of paths according to the globs supplied

		if (globs === undefined) return list;

		options = _.extend({}, { matchBase: true, dot: true }, options);

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

	replace: function(path, context) {
		if (path instanceof Array) {
			var rtn = [];
			for (var i = 0, l = path.length; i < l; i++) {
				rtn.push(pub.replace(path[i], context));
			}
			return rtn;
		} else {
			return hbs.compile(path)(context);
		}
	},
	

	_globListCache: {},
	glob: function(atPath, globs, options) {
		//get all nodes at path, from cache if available, filter by globs
		//distinguish between requests for files and directorys or both

		options = _.extend({}, { files: true, dirs: true, matchBase: true, dot: true }, options);
		//console.log("glob", atPath+"");
		var list = listFromCache(atPath, options, globs);

		return pub.filter(list, globs, options);


		function listFromCache(atPath, options, globs) {

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
	
	resetGlobCache: function() {
		this._globListCache = {};
	},

	copy: function(from, to, copyGlobs, callback, that) {

		var list = pub.glob(from, copyGlobs);
		var copyTasks = [];
		var copyInterval = null;
		var copyTasksRunning = 0;

		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr(from.length);
			var outputPath = path.join(to, shortenedPath);

			if (item.dir) {
				pub.mkdir( outputPath, { norel: true });
			} else {
				var dirname = path.dirname(outputPath);
				pub.mkdir( dirname, { norel: true });

				if (fs.existsSync(outputPath)) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime && outputStat.ctime >= item.ctime) continue;
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
			for (var i = 0, l = copyTasks.length; i < l && copyTasksRunning < 5; i++) {
				var task = copyTasks.shift();
				copyTasksRunning++;
				var rs = fs.createReadStream(task.from);
				var ws = fs.createWriteStream(task.to);
				rs.pipe(ws);
				rs.on("end", copyTaskDone);
				rs.on("error", function(e) {
					console.log(e);
				});
				ws.on("error", function(e) {
					console.log(e);
				});
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
				callback.call(that);
			}
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
	},

	remove: function(dest, globs) {
		var list =  pub.glob(dest, globs);
		var dirs = _.where(list, { dir: true });
		var files = _.where(list, { dir: false });
		for (var i = 0, l = files.length; i < l; i++) {
			if (fs.existsSync(files[i].path)) fs.unlinkSync(files[i].path);
		}
		for (var i = dirs.length - 1, l = -1; i > l; i--) {
			if (fs.existsSync(dirs[i].path)) fs.rmdirSync(dirs[i].path);
		}
	},

	rm: function(path) {
		if (!fs.existsSync(path)) return;
		if (!fs.statSync(path).isDirectory()) {
			fs.unlinkSync(path);
			return;
		}

		pub.remove(pub.expand(path), [ "**" ]);
		if (fs.existsSync(path)) fs.rmdirSync(path);
	}

};

module.exports = pub;
