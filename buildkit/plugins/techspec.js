var Plugin = require("../libraries/Plugin.js");

module.exports = new Plugin({

	initialize: function() {
		this.deps(GLOBAL, {
			'_': "underscore",
			"logger": "../libraries/logger.js",
			"underscoreDeepExtend": "underscore-deep-extend"
		});
		_.mixin({deepExtend: underscoreDeepExtend(_)});
	},

	_displayedCourseTechSpec: {},

	"config:loaded": function(config) {
		//console.log("config:loaded", config);
	},

	"actions:setup": function(actions) {
		//console.log("actions:setup", actions);
	},

	"actions:build": function(actions) {
		
		for (var a = 0, al = actions.length; a < al; a++) {
			var options = actions[a];
			if (!options.techspec) continue
			if (!options.buildConfig || !options.buildConfig.techspec) continue;	

			applyTechSpec.call(this, options);

		}

		function applyTechSpec(options) {
			//do general exclusions
			var globalTechSpec = options.buildConfig.techspec;
			if (globalTechSpec) {

				_.deepExtend(options.techspec, globalTechSpec);
				
			}
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
