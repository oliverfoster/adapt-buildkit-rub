var fs = require("fs");
var fsext = require("./utils/fsext");
var fswatch = require("./utils/fswatch");
var path = require("path");
var hbs = require("handlebars");
var taskqueue = require("./utils/taskqueue.js");
var logger = require("./utils/logger.js");
var _ = require("underscore");

var events = require('events');
var eventEmitter = new events.EventEmitter();

var pub =  _.extend(eventEmitter, {
	_serverReloadType: null,
	_configuration: {},
	_indexedActions: null,
	_selectedActions: null,
	_terminalOptions: null,
	_server: null,
	_fileChangeActionQueue: [],

 	entryPoint: function(terminalOptions) {

 		pub.setupConfig(terminalOptions);

 		pub.emit("config:loaded", pub._configuration);

 		fsext.exclusionGlobs = pub._configuration.defaults.globalExclusionGlobs || [];
 		fswatch.exclusionGlobs = pub._configuration.defaults.globalExclusionGlobs || [];
 		taskqueue.taskLimit = pub._configuration.defaults.taskLimit || 20;

 		pub.setupActions();

 		pub.emit("actions:setup", pub._selectedActions);

 		taskqueue.on("nextPhase", function(phaseName) {
 			pub.emit("actions:phase", phaseName);
 		});

 		switch (terminalOptions.command) {
 		case "watch":
 			runWatchOnly();
 			return;
		default:
			runAllTasks();
 		}

 		function runWatchOnly() {
			taskqueue.on("error", function(options, err) {
				logger.error(err);
			});

			pub.thenWatchForChanges();
		}

		function runAllTasks() {
			taskqueue.on("error", function(options, err) {
				logger.error(err);
			});

			pub.startBuildOperations(pub._selectedActions);

			thenWatchOrEnd();
		}

		function thenWatchOrEnd() {

			if (!pub._terminalOptions.switches.watch) {

				if (pub._terminalOptions.switches.wait) return thenWaitForEnd();
				else thenWaitForExit();

			} else {
				taskqueue.defer(function() {
						pub.thenWatchForChanges()
					}, pub);

			}
		}

		function thenWaitForExit() {
			taskqueue.defer(function() {
					process.exit(0);
				}, pub);
		}

		function thenWaitForEnd() {
			taskqueue.defer(function() {
					console.log('Press any key to exit');

					process.stdin.setRawMode(true);
					process.stdin.resume();
					process.stdin.on('data', process.exit.bind(process, 0));
				}, pub);
		}

		function consoleExitHandler() {
			console.log();
			if (pub._server && pub._server.isStarted()) {
				pub._serverReloadType = "close";
				pub._server.reload(pub._serverReloadType);

				_.delay(function() {
					if (pub._terminalOptions.switches.wait) return thenWaitForEnd();
					else process.exit(0);
				}, 2000);

			} else {
				process.exit(0);
			}
		}

		process.on('SIGINT', consoleExitHandler);

	},

	setupConfig: function(terminalOptions) {
		pub._terminalOptions = terminalOptions;

		loadPlugins();

		loadConfigFiles();
		loadBuildConfig();
		
		setDirectoryLayout(terminalOptions);
		setSwitches(terminalOptions);
		setDefaults(terminalOptions);		

		function loadConfigFiles() {

			//merge all config files together
			var configsPath = path.join(path.dirname(__dirname), "/conf/");
			var configFilePaths = fsext.glob(configsPath, "*.json");
			for (var i = 0, l = configFilePaths.length; i < l; i++) {

				var json = JSON.parse(fs.readFileSync(configFilePaths[i].path));

				for (var k in json) {
					if (json[k] instanceof Array) {
						if (!pub._configuration[k]) pub._configuration[k] = [];
						pub._configuration[k] = pub._configuration[k].concat(json[k]);
					} else if (typeof json[k] === "object") {
						pub._configuration[k] = _.extend({}, pub._configuration[k], json[k]);
					} else {
						pub._configuration[k] = json[k];
					}
				}

			}
		}

		function loadBuildConfig() {
			var configsPath = path.join(process.cwd(), "rubconfig.json");
			if (fs.existsSync(configsPath)) {
				try {
					pub._terminalOptions.buildConfig = JSON.parse(fs.readFileSync(configsPath));
				} catch (e) {
					logger.error("rubconfig.json is corrupt");
					logger.error(e);
				}
			}
		}

		function loadPlugins() {
			var pluginsPath = path.join(path.dirname(__dirname), "/plugins/");
			var pluginFilePaths = fsext.glob(pluginsPath, "*.js");
			for (var i = 0, l = pluginFilePaths.length; i < l; i++) {
				try {
					require(pluginFilePaths[i].path)(pub);
				} catch (e) {
					logger.error("Plugin " + pluginFilePaths[i].basename + " is corrupt");
					logger.error(e);
				}
			}
			
		}

		function setDirectoryLayout(terminalOptions) {
			//select directory layout
			if (fs.existsSync("./src/course")) {
				terminalOptions.switches.type = "src/course";
				terminalOptions.switches.typeName = "Adapt Learning";
			} else if (fs.existsSync("./src/courses")) {
				terminalOptions.switches.type = "src/courses/course"
				terminalOptions.switches.typeName = "Kineo src/courses";
			} else {
				terminalOptions.switches.type = "builds/courses/course";
				terminalOptions.switches.typeName = "Kineo src/builds";
			}
		}

		function setSwitches(terminalOptions) {
			//take config.switches and apply
			var switchRules = pub._configuration.switches;
			var newSwitches = {};
			for (var i = 0, l = switchRules.length; i < l; i++) {
				var switchRule = switchRules[i];
				var found = _.findWhere([terminalOptions.switches], switchRule.on || {});
				if (found) {

					for (var k in switchRule.alwaysSet) {
						terminalOptions.switches[k] = switchRule.alwaysSet[k];
					}
					for (var k in switchRule.unspecifiedSet) {
						newSwitches[k] = terminalOptions.switches[k] !== undefined ? terminalOptions.switches[k] : switchRule.unspecifiedSet[k];
					}
				}
			}

			_.extend(terminalOptions.switches, newSwitches);

		}

		function setDefaults(terminalOptions) {
			//take config.defaults and apply
			switch(terminalOptions.switches.type) {
			case "builds/courses/course":
				terminalOptions.outputDest = pub._configuration.defaults.multipleDestPath;
				break;
			case "src/courses/course":
				terminalOptions.outputDest = pub._configuration.defaults.multipleDestPath;
				break;
			case "src/course":
				terminalOptions.outputDest = pub._configuration.defaults.singleDestPath;
				break;
			}

			_.extend(terminalOptions, pub._configuration.defaults, terminalOptions);

		}
	},

	setupActions: function() {
		selectActions(pub._terminalOptions);
		displayHeader(pub._terminalOptions);

		function selectActions(terminalOptions) {
			pub._selectedActions = pub._configuration.actions;

			filterByDirectoryLayout(terminalOptions);

			filterByInclusionsAndExclusions(terminalOptions);

			pub._indexedActions = _.indexBy(pub._selectedActions, "@name");

		}

		function filterByDirectoryLayout(terminalOptions) {
			pub._selectedActions = _.filter(pub._selectedActions, function(item, item1) {
				if (item['@types'] === undefined) return true;

				if (item['@types'].indexOf(terminalOptions.switches.type) == -1) return false;

				return true;

			});
		}

		function filterByInclusionsAndExclusions(terminalOptions) {
			pub._selectedActions = _.filter(pub._selectedActions, function(item, item1) {
				if (item['@onlyOnSwitches'] !== undefined) {
					var found = false;
					for (var key in terminalOptions.switches) {
						var value = terminalOptions.switches[key];
						if (!value) continue;
						
						if (item['@onlyOnSwitches'].indexOf(key) != -1) {
							found = true;
							break
						}
					}
					if (!found) return false;
				}

				if (item['@excludeOnSwitches'] === undefined) return true;

				for (var key in terminalOptions.switches) {
					var value = terminalOptions.switches[key];
					if (!value) continue;

					if (item['@excludeOnSwitches'].indexOf(key) != -1) {
						return false;
					}
				};

				return true;

			});
		}

		function displayHeader(terminalOptions) {
			logger.log("Adapt Framework Buildkit",0 );
			var mode = (terminalOptions.switches.debug ? "Debug": "Production");
			var color = (terminalOptions.switches.debug ? 1:0);
			color = (terminalOptions.switches.force ? 1 : color);
			if (terminalOptions.switches.forceall) mode += ", Forced Rebuild and Resync";
			else if (terminalOptions.switches.force) mode += ", Forced Rebuild";
			else mode += ", Quick Rebuild";
			mode += ", " + terminalOptions.switches.typeName + " Style"
			logger.log(">"+mode, color);
			logger.log(">Courses: "+(terminalOptions.courses.join(",")||"All"),0);
		}
	},

	startBuildOperations: function(actions) {
		taskqueue.reset();

		switch(pub._terminalOptions.switches.type) {
		case "builds/courses/course":
			buildBuildCoursesFolders(pub._terminalOptions, actions);
			break;
		case "src/courses/course":
			buildSrcCoursesFolders(pub._terminalOptions, actions);
			break;
		case "src/course":
			buildSrcCourseFolder(pub._terminalOptions, actions);
			break;
		}

		taskqueue.start();

		function buildBuildCoursesFolders(terminalOptions, actions) {
			var courseFolderList = fsext.list(fsext.expand(terminalOptions.outputDest));
			var dirs = _.pluck(courseFolderList.dirs, "filename");
			
			for (var i = 0, l = dirs.length; i < l; i++) {
				var dir = dirs[i];

				if (terminalOptions.courses.length > 0)
					if (terminalOptions.courses.indexOf(dir) == -1) continue;

				var opts = _.extend({}, terminalOptions, { course: dir });
				runActions(opts, actions);
			}
		}

		function buildSrcCoursesFolders(terminalOptions, actions) {
			var courseFolderList = fsext.list(fsext.expand(terminalOptions.srcCoursesPath));
			var dirs = _.pluck(courseFolderList.dirs, "filename");

			for (var i = 0, l = dirs.length; i < l; i++) {
				var dir = dirs[i];
				if (terminalOptions.courses.length > 0)
					if (terminalOptions.courses.indexOf(dir) == -1) continue;

				var opts = _.extend({}, terminalOptions, { course: dir });

				runActions(opts, actions);
			}

		}

		function buildSrcCourseFolder(terminalOptions, actions) {
			var opts = _.extend({}, terminalOptions, { course: "" });
			runActions(opts, actions);
		}

		function runActions(terminalOptions, actions) {

			var configured = [];
			for (var i = 0, l = actions.length; i < l; i++) {

				var actionConfig = actions[i];
				var terminalOptionsAndActionConfig = _.extend({}, terminalOptions, actionConfig);

				configured.push(terminalOptionsAndActionConfig);
			}

			pub.emit("actions:build", configured);

			for (var i = 0, l = configured.length; i < l; i++) {
				runAction(configured[i]);
			}

			function runAction(terminalOptionsAndActionConfig) {
				pub._serverReloadType = "window";

				if (terminalOptionsAndActionConfig["@serverReloadType"]) {

					pub._serverReloadType = terminalOptionsAndActionConfig["@serverReloadType"];	
				}

				taskqueue.add(terminalOptionsAndActionConfig, function(terminalOptionsAndActionConfig, done) {
					var actionName = terminalOptionsAndActionConfig['@action'];
					var action = require("./actions/"+actionName+".js");

					if (!actions._isInitialized) {
						action.initialize();
						action._isInitialized = true;
					}
	
					pub.emit("action:prep", terminalOptionsAndActionConfig, action);
					action.perform(terminalOptionsAndActionConfig, done, _.bind(function() {

						logger.runlog(terminalOptionsAndActionConfig);
						pub.emit("action:start", terminalOptionsAndActionConfig, action);
						
					}, action));

				}, function(terminalOptionsAndActionConfig) {
					pub.emit("action:end", terminalOptionsAndActionConfig);
				}, function(terminalOptionsAndActionConfig, error) {
					pub.emit("action:error", terminalOptionsAndActionConfig, error);
				});
				
			}

		}
	},

	thenWatchForChanges: function () {
		logger.log("Watching for changes...\n",1);

		selectWatches(pub._terminalOptions);

		var watches = pub._selectedWatches;

		for (var i = 0, l = watches.length; i < l; i++) {
			var data = watches[i];
			data.terminalOptions = pub._terminalOptions;
			data.progress = _.bind(onFilesChangedProgress, pub);
			fswatch.watch(data);
		}
		fswatch.complete = _.bind(onFilesChangedComplete, pub);

		taskqueue.defer(function startServer() {

			pub._server = require("./utils/server.js");

			if (pub._terminalOptions.switches['server'] && !pub._server.isStarted()) {
				pub._server.start(pub._terminalOptions);
			}

		}, pub);

		pub.emit("actions:wait");

		function selectWatches() {
			pub._selectedWatches = pub._configuration.watches;
			pub._selectedWatches = _.filter(pub._selectedWatches, function(item, item1) {
				if (item['@types'] === undefined) return true;

				if (item['@types'].indexOf(pub._terminalOptions.switches.type) == -1) return false;

				return true;

			});

			pub._selectedWatches = _.filter(pub._selectedWatches, function(item, item1) {
				if (item['@onlyOnSwitches'] !== undefined) {
					var found = false;
					for (var key in pub._terminalOptions.switches) {
						var value = pub._terminalOptions.switches[key];
						if (!value) continue;
						
						if (item['@onlyOnSwitches'].indexOf(key) != -1) {
							found = true;
							break
						}
					}
					if (!found) return false;
				}

				if (item['@excludeOnSwitches'] === undefined) return true;

				for (var key in pub._terminalOptions.switches) {
					var value = pub._terminalOptions.switches[key];
					if (!value) continue;
					
					if (item['@excludeOnSwitches'].indexOf(key) != -1) {
						return false;
					}
				};

				return true;

			});

			var expanded = [];
			var courses = pub._terminalOptions.courses;

			pub._selectedWatches = _.filter(pub._selectedWatches, function(item) {
				if (item.expand) {
					var cloned = _.extend({}, item);
					var options = _.extend({}, pub._terminalOptions);
					if (courses.length === 0) {
						options.course = "";
						cloned.path = fsext.replace(cloned.path, options);
						cloned.globs = fsext.replace(cloned.globs, options);
						expanded.push(cloned);
					} else {
						for (var i = 0, l = courses.length; i < l; i++) {
							options.course = courses[i];
							cloned.path = fsext.replace(cloned.path, options);
							cloned.globs = fsext.replace(cloned.globs, options);
							expanded.push(cloned);
						}
					}
					return false;
				}
				return true;
			});

			pub._selectedWatches = pub._selectedWatches.concat(expanded);

		}

		
		function onFilesChangedProgress(changeType, changeFileStat, data) {

			var terminalOptions = data.terminalOptions;

			terminalOptions.switches.force = true;

			switch (changeType) {
			case "changed":
				logger.log(changeFileStat.filename+changeFileStat.extname + " has changed.",1);
				break;
			case "added":
				logger.log(changeFileStat.filename+changeFileStat.extname + " was added.",1);
				break;
			case "deleted":
				logger.log(changeFileStat.filename+changeFileStat.extname + " was deleted.",1);
				break;
			}
			
			for (var a = 0, al = data.actions.length; a < al; a++) {
				var actionName = data.actions[a];
				if (!pub._indexedActions[actionName]) return;
				var actionConfig = pub._indexedActions[actionName];

				var isActionInList = _.where(pub._fileChangeActionQueue, { "@name": actionConfig["@name"] });
				if (isActionInList.length === 0) {
					pub._fileChangeActionQueue.push(actionConfig);
				} else {
					require("./actions/"+actionConfig['@action']+".js").reset();
				}
			}

		}

		function onFilesChangedComplete() {
			if (pub._fileChangeActionQueue.length > 0) {

				pub.startBuildOperations(pub._fileChangeActionQueue);

				pub._fileChangeActionQueue = [];

			}

			fswatch.pause();

			taskqueue.defer(endMe, pub);

			function endMe() {
				if (pub._server.isStarted()) {
					pub._server.reload(pub._serverReloadType);
				}

				pub.emit("actions:wait");

				logger.log("Watching for changes...\n", 1);

				fswatch.resume();
			}
		}

	}
});

module.exports = function(config) {
	pub.entryPoint(config);
};


