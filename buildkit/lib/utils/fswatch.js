var _ = require("underscore");
var fsext = require("./fsext");
var logger = require("./logger");

var watching = {};
var watchingInterval = null;
var paused = false;

function watchStart() {
	if (watchingInterval !== null) return;
	watchingInterval = setInterval(watchLoop, 250);
}

function watchLoop() {
	if (paused) return;
	if (_.keys(watching).length === 0) return watchEnd();

	fsext.reset();

	for (var k in watching) {
		var options = watching[k];
		options.prev = options.cur;
		options.cur = fsext.glob(options.path, options.globs, options);
		watchChanges(options.cur, options.prev, options);
	}
}

function watchChanges(cur, prev, options) {

	if (cur.length === 0 && prev.length > 0) {
		for (var p = 0, pl = prev.length; p < pl; p++) {
			options.callback("deleted", prev[p]);
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

	for (var d = 0, dl = deleted.length; d < dl; d++) {
		//logger.log("Deleted: "+deleted[d], 1);
		options.callback.call(options.that || this, "deleted", prevIndex[ deleted[d] ], options);
	}

	for (var d = 0, dl = added.length; d < dl; d++) {
		//logger.log("Added: "+added[d], 1);
		options.callback.call(options.that || this, "added", curIndex [ added[d] ], options);
	}

	for (var d = 0, dl = check.length; d < dl; d++) {
		var item = check[d];
		if (curIndex[item].mtime.getTime() != prevIndex[item].mtime.getTime()) {
			//logger.log("Changed: "+item,1);
			options.callback.call(options.that || this, "changed", curIndex[ item ], options);
		}
	}
	
}

function watchEnd() {
	if (watchingInterval === null) return;
	clearTimeout(watchingInterval);
	watchingInterval = null;
}

var pub = {
	watches: function() {
		return _.value(watching);
	},
	watch: function(options) {
		if (typeof options != "object") throw "No options specified for watch";
		if (!options.path) throw "No path specified for watch";
		if (!options.callback) throw "No callback specified for watch";
		if (typeof options.globs == "string") options.globs = [options.globs];

		var watchName = options.path+":"+options.globs.join(",");
		if (watching[watchName]) return;

		watching[watchName] = options;
		watching[watchName].cur = fsext.glob(options.path, options.globs, options);

		watchStart();
	},
	unwatch: function(options) {
		if (typeof options != "object") throw "No options specified for unwatch";
		if (!options.path) throw "No path specified for unwatch";

		var watchName = options.path+":"+options.globs.join(",");
		if (!watching[watchName]) return;

		delete watching[watchName];
	},
	pause: function() {
		paused = true;
	},
	resume: function() {
		paused = false;
	}
};

module.exports = pub;