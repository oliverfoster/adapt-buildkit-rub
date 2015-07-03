var _ = require("underscore");
var logger = require("../lib/utils/logger.js");

var displayedCourseExclusions = {};
var displayedGlobalExclusions = false;

module.exports = function(buildkit) { 

	buildkit.on("config:loaded", function(config) {
		//console.log("config:loaded", config);
	});

	buildkit.on("actions:setup", function(actions) {
		//console.log("actions:setup", actions);
	});

	buildkit.on("actions:build", function(actions) {
		for (var a = 0, al = actions.length; a < al; a++) {
			var options = actions[a];
			if (options['@buildOnce'] || !options.buildConfig) continue;	

			//do general exclusions
			var globalExcludes = options.buildConfig.excludes;
			if (globalExcludes && globalExcludes instanceof Array && globalExcludes.length > 0) {

				var globs = [];
				for (var i = 0, l = globalExcludes.length; i < l; i++) {
					globs.push("!**/" + globalExcludes[i]);
					globs.push("!**/" + globalExcludes[i] + "/**/*");
				}

				if (options.exclusionGlobs) {
					globs = options.exclusionGlobs.concat(globs);
				}

				options.exclusionGlobs = globs;

				options.exclusionGlobs = _.uniq(options.exclusionGlobs);

				if (!displayedGlobalExclusions) {
					logger.log("Excluding:\n    " + globalExcludes.join(",\n    ") + "\n", 1);
					displayedGlobalExclusions = true;
				}
			}


			//do course specific exclusions
			if (options.course != '' && options.buildConfig[options.course]) {

				var excludes = options.buildConfig[options.course].excludes;
				if (excludes && excludes instanceof Array && excludes.length > 0) {

					if (globalExcludes && globalExcludes instanceof Array && globalExcludes.length > 0) {
						//only apply course specific exclusions when not global also
						excludes = _.difference(excludes, globalExcludes);
					}

					if (excludes.length > 0 ) {
						var globs = [];
						for (var i = 0, l = excludes.length; i < l; i++) {
							globs.push("!**/" + excludes[i]);
							globs.push("!**/" + excludes[i] + "/**/*");
						}

						if (options.exclusionGlobs) {
							globs = options.exclusionGlobs.concat(globs);
						}

						options.exclusionGlobs = globs;

						options.exclusionGlobs = _.uniq(options.exclusionGlobs);

						if (!displayedCourseExclusions[options.course]) {
							logger.log(options.course + " - Excluding:\n    " + excludes.join(",\n    ") + "\n", 1);
							displayedCourseExclusions[options.course] = true;
						}
					}
				}

			}

		}


		//console.log("actions:build", actions);
	});

	buildkit.on("actions:phase", function(phaseName) {
		//console.log("actions:phase", phaseName);
	});

	buildkit.on("action:prep", function(options, action) {		
		//console.log("action:prep", options, action);
	});

	buildkit.on("action:start", function(options, action) {
		//console.log("action:start", options, action);
	});

	buildkit.on("action:error", function(options, error) {
		//console.log("action:error", options, error);
	});

	buildkit.on("action:end", function(options) {
		//console.log("action:end", options);
	});

	buildkit.on("actions:wait", function() {
		//console.log("actions:wait");
	});

};