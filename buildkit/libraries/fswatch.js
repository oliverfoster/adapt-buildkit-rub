var _ = require("underscore");
var fsext = require("./fsext");
var logger = require("./logger");

var pub = {
	
	_watching: {},
	_watchingInterval: null,
	_paused: false,
	complete: null,
	exclusionGlobs: null,

	_poll: function(each) {
		for (var k in pub._watching) {
			var options = pub._watching[k];
			pub._pollOptions(options);

			if (each) {
				each(options);
			}
		}
	},

	_pollOptions: function(options) {
		options.refresh = true;
		options.prev = options.cur;

		if (options.globs == undefined) {
			options.cur = fsext.file(options.path);
			if (!(options.cur instanceof Array)) options.cur = [options.cur];
		} else {
			options.cur = fsext.glob(options.path, options.globs, options);
		}
	},

	watch: function(options) {
		if (typeof options != "object") throw "No options specified for watch";
		if (!options.path) throw "No path specified for watch";
		if (!options.progress) throw "No progress callback specified for watch";
		
		var globName = "";
		if (options.globs !== undefined) {
			if (typeof options.globs == "string") options.globs = [options.globs];
			globName = options.globs.join(",");
		}

		var pathName = "";
		if (pathName instanceof Array) {
			pathName = options.path.join(",");
		} else {
			pathName = options.path;
		}

		var watchName = pathName+":"+globName;

		if (pub._watching[watchName]) return;

		pub._watching[watchName] = options;

		pub._pollOptions(options);

		watchStart();

		function watchStart() {
			fsext.exclusionGlobs = pub.exclusionGlobs;
			
			if (pub._watchingInterval !== null) return;
			pub._watchingInterval = setInterval(watchLoop, 2000);
		}

		function watchLoop() {

			if (pub._paused) return;
			if (_.keys(pub._watching).length === 0) return watchEnd();

			var startTime = (new Date()).getTime();
			pub._poll(function(options) {
				watchChanges(options.cur, options.prev, options);
			});
			//console.log((new Date()).getTime() - startTime);
		}

		function watchChanges(cur, prev, options) {

			if (cur.length === 0 && prev.length > 0) {
				for (var p = 0, pl = prev.length; p < pl; p++) {
					options.progress("deleted", prev[p], options);
				}
				return;
			}
			var curIndex = _.indexBy(cur, "path");
			var prevIndex = _.indexBy(prev, "path");
			var curPaths = _.pluck(cur, 'path');
			var prevPaths = _.pluck(prev, 'path');
			var deleted = _.difference(prevPaths, curPaths);
			var added = _.difference(curPaths, prevPaths);
			var check = _.intersection(curPaths, prevPaths);

			var changeCount = 0;

			for (var d = 0, dl = deleted.length; d < dl; d++) {
				changeCount++;
				options.progress("deleted", prevIndex[ deleted[d] ], options);
			}

			for (var d = 0, dl = added.length; d < dl; d++) {
				//logger.log("Added: "+added[d], 1);
				changeCount++;
				options.progress("added", curIndex [ added[d] ], options);
			}

			for (var d = 0, dl = check.length; d < dl; d++) {
				var item = check[d];
				if (curIndex[item].mtime.getTime() != prevIndex[item].mtime.getTime()) {
					//logger.log("Changed: "+item,1);
					changeCount++;
					options.progress("changed", curIndex[ item ], options);
				}
			}

			if (changeCount > 0) {
				if (!pub._complete) {
					pub._complete = _.debounce(pub.complete, 100);	
				}
				pub._complete();
			}
			
		}

		function watchEnd() {
			if (pub._watchingInterval === null) return;
			clearTimeout(pub._watchingInterval);
			pub._watchingInterval = null;

		}

	},

	unwatch: function(options) {
		if (typeof options != "object") throw "No options specified for unwatch";
		if (!options.path) throw "No path specified for unwatch";

		var watchName = options.path+":"+options.globs.join(",");
		if (!pub._watching[watchName]) return;

		delete pub._watching[watchName];
	},

	pause: function() {
		pub._paused = true;
	},

	resume: function() {
		pub._paused = false;
		pub._poll();
	}
	
};

module.exports = pub;
