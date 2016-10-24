var Plugin = require("../libraries/Plugin.js");

module.exports = new Plugin({
	_logsCleared: {},

	initialize: function() {
		this.deps(global, {
			'_': "underscore",
			"logger": "../libraries/logger.js",
			"fs": "fs"
		});
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

	}

})
