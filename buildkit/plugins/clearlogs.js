var Plugin = require("../libraries/Plugin.js");

module.exports = new Plugin({
	_logsCleared: {},

	initialize: function() {
		this.deps(GLOBAL, {
			'_': "underscore",
			"logger": "../libraries/logger.js",
			"fs": "fs"
		});
	},

	_displayedCourseTechSpec: {},

	"config:loaded": function(config) {
		//console.log("config:loaded", config);
	},

	"actions:setup": function(actions) {
		//console.log("actions:setup", actions);
	},

	"actions:build": function(actions) {

		this._logsCleared = {};
		
		for (var a = 0, al = actions.length; a < al; a++) {
			var options = actions[a];
			if (!options.logPath) continue

			if (this._logsCleared[options.logPath]) continue;

			if (options.buildConfig && options.buildConfig.clearLogs === false) {
				logger.file(options.logPath, ">" + (new Date()).toString() + "<", false);
			} else {
				logger.file(options.logPath, ">" + (new Date()).toString() + "<" , true);
			}

			this._logsCleared[options.logPath] = true;

		}

	},

	"actions:phase": function(phaseName) {
		//console.log("actions:phase", phaseName);
	},

	"action:prep": function(options, action) {		
		//console.log("action:prep", options, action);
	},

	"action:start": function(options, action) {
		//console.log("action:start", options, action);
	},

	"action:error": function(options, error, action) {
		//console.log("action:error", options, error);
	},

	"action:end": function(options, action) {
		//console.log("action:end", options);
	},

	"actions:wait": function() {
		//console.log("actions:wait");
	}

})
