var Plugin = require("../libraries/Plugin.js");

module.exports = new Plugin({

	initialize: function() {
		this.deps(global, {
			'_': "underscore",
			"logger": "../libraries/logger.js",
			"underscoreDeepExtend": "underscore-deep-extend"
		});
		_.mixin({deepExtend: underscoreDeepExtend(_)});
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
		
	}

})
