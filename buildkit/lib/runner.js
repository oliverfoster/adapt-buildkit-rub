var fs = require("fs");
var fsext = require("./utils/fsext");
var fswatch = require("./utils/fswatch");
var path = require("path");
var hbs = require("handlebars");
var taskqueue = require("./utils/taskqueue.js");
var logger = require("./utils/logger.js");
var _ = require("underscore");

var pub = {
	_serverReloadType: null,
	_configuration: {},
	_indexedActions: null,
	_selectedActions: null,
	_terminalOptions: null,
	_server: null,
	_fileChangeActionQueue: [],

 	entryPoint: function(terminalOptions) {

 		pub.setupConfig(terminalOptions);

 		fsext.exclusionGlobs = pub._configuration.defaults.exclusionGlobs || [];
 		fswatch.exclusionGlobs = pub._configuration.defaults.exclusionGlobs || [];
 		taskqueue.taskLimit = pub._configuration.defaults.taskLimit || 20;

 		pub.setupActions();

 		switch (terminalOptions.command) {
 		case "watch":
 			runWatchOnly();
 			return;
		default:
			runAllTasks();
 		}

 		function runWatchOnly() {
			taskqueue.on("error", logger.error);

			pub.thenWatchForChanges();
		}

		function runAllTasks() {
			taskqueue.on("error", logger.error);

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
		loadConfigFiles();
		setDirectoryLayout(terminalOptions);
		setSwitches(terminalOptions);
		setDefaults(terminalOptions);

		this._terminalOptions = terminalOptions;

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
			logger.log("Building Mode: "+(terminalOptions.switches.debug ? "Debug": "Production") , (terminalOptions.switches.debug ? 1:0));
			var forceBuild = (terminalOptions.switches.force || false);
			if (forceBuild) logger.log("Forced Rebuild", 1);
			else logger.log("Quick Rebuild", 0);
			logger.log("Structure Type: "+terminalOptions.switches.typeName,0);
			logger.log("Output Courses: "+(terminalOptions.courses.join(",")||"All"),0);
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

			for (var i = 0, l = actions.length; i < l; i++) {

				var actionConfig = actions[i];
				var terminalOptionsAndActionConfig = _.extend({}, terminalOptions, actionConfig);

				runAction(terminalOptionsAndActionConfig);
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
	
					action.perform(terminalOptionsAndActionConfig, done, function() {
						logger.runlog(terminalOptionsAndActionConfig);
					});
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

				logger.log("Watching for changes...\n", 1);

				fswatch.resume();
			}
		}

	}
};

module.exports = function(config) {
	pub.entryPoint(config);
};


