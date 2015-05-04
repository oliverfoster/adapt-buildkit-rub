var fs = require("fs");
var fsext = require("./utils/fsext");
var fswatch = require("./utils/fswatch");
var chalk = require("chalk");
var path = require("path");
var hbs = require("handlebars");
var taskqueue = require("./utils/taskqueue.js");
var logger = require("./utils/logger.js");
var _ = require("underscore");
var server = require("./utils/server.js");

var tOptions;

var pub = {
	_serverReloadType: null,
	_configuration: {},
	_indexedActions: null,
	_selectedActions: null,

 	entryPoint: function(terminalOptions) {

 		taskqueue.on("error", pub.taskqueueError);

		this.loadConfigs();

		this.setDefaultConfigSwitches(terminalOptions);

		this.setDefaults(terminalOptions);

		tOptions = terminalOptions;

		this.selectActions(terminalOptions);

		this.displayHeader(terminalOptions);

		this.startBuildOperations(terminalOptions, this._selectedActions);

		this.watchOrEnd(terminalOptions);

	},

	loadConfigs: function() {

		var configsPath = path.join(path.dirname(__dirname), "/conf/");
		var configFilePaths = fsext.glob(configsPath, "*.json");
		for (var i = 0, l = configFilePaths.length; i < l; i++) {

			var json = JSON.parse(fs.readFileSync(configFilePaths[i].path));

			for (var k in json) {
				if (json[k] instanceof Array) {
					if (!this._configuration[k]) this._configuration[k] = [];
					this._configuration[k] = this._configuration[k].concat(json[k]);
				} else if (typeof json[k] === "object") {
					this._configuration[k] = _.extend({}, this._configuration[k], json[k]);
				} else {
					this._configuration[k] = json[k];
				}
			}

		}
	},

	setDefaultConfigSwitches: function(terminalOptions) {


		if (fs.existsSync("./src/course")) {
			terminalOptions.switches.type = "src/course";
		} else if (fs.existsSync("./src/courses")) {
			terminalOptions.switches.type = "src/courses"
		} else {
			terminalOptions.switches.type = "builds/courses/course";
		}

		var switchRules = this._configuration.switches;

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

	},

	setDefaults: function(terminalOptions) {
		switch(terminalOptions.switches.type) {
		case "builds/courses/course":
			terminalOptions.outputDest = this._configuration.defaults.multipleDestPath;
			break;
		case "src/courses":
			terminalOptions.outputDest = this._configuration.defaults.multipleDestPath;
			break;
		case "src/course":
			terminalOptions.outputDest = tthis._configuration.defaults.singleDestPath;
			break;
		}

		_.extend(terminalOptions, this._configuration.defaults, terminalOptions);

	},

	selectActions: function(terminalOptions) {
		this._selectedActions = this._configuration.actions;
		this._selectedActions = _.filter(this._selectedActions, function(item, item1) {
			if (item['@types'] === undefined) return true;

			if (item['@types'].indexOf(terminalOptions.switches.type) == -1) return false;

			return true;

		});

		this._selectedActions = _.filter(this._selectedActions, function(item, item1) {
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

		this._indexedActions = _.indexBy(this._selectedActions, "@name");

	},

	displayHeader: function(terminalOptions) {
		logger.log("Building Mode: "+(terminalOptions.switches.debug ? "Debug": "Production") , (terminalOptions.switches.debug ? 1:0));
		logger.log("Structure Type: "+terminalOptions.switches.type,0);
		logger.log("Forced Build: "+(terminalOptions.switches.force || false),0);
		logger.log("Output Courses: "+(terminalOptions.courses.join(",")||"All"),0);
	},

	startBuildOperations: function(terminalOptions, actions) {
		switch(terminalOptions.switches.type) {
		case "builds/courses/course":
			this.buildBuildsFolders(terminalOptions, actions);
			break;
		case "src/courses":
			this.buildSrcsFolders(terminalOptions, actions);
			break;
		case "src/course":
			this.buildSrcsFolder(terminalOptions, actions);
			break;
		}
	},

	buildBuildsFolders: function(terminalOptions, actions) {
		fsext.walkSync(fsext.relative(terminalOptions.outputDest), function(dirs, files) {
			dirs = _.pluck(dirs, "filename");
			
			for (var i = 0, l = dirs.length; i < l; i++) {
				var dir = dirs[i];

				if (terminalOptions.courses.length > 0)
					if (terminalOptions.courses.indexOf(dir) == -1) continue;

				var opts = _.extend({}, terminalOptions, { course: dir });
				this.runActions(opts, actions);
			}

		});
	},

	buildSrcsFolders: function(terminalOptions, actions) {
		fsext.walkSync(fsext.relative(terminalOptions.srcCoursesPath), function(dirs, files) {
			dirs = _.pluck(dirs, "filename");
			
			for (var i = 0, l = dirs.length; i < l; i++) {
				var dir = dirs[i];

				if (terminalOptions.courses.length > 0)
					if (terminalOptions.courses.indexOf(dir) == -1) continue;

				var opts = _.extend({}, terminalOptions, { course: dir });
				this.runActions(opts, actions);
			}

		}, this);
	},

	buildSrcsFolder: function(terminalOptions, actions) {
		var opts = _.extend({}, terminalOptions, { course: "" });
		this.runActions(opts, actions);
	},

	runActions: function(terminalOptions, actions) {

		taskqueue.reset();

		for (var i = 0, l = actions.length; i < l; i++) {

			var actionConfig = actions[i];
			var terminalOptionsAndActionConfig = _.extend({}, terminalOptions, actionConfig);

			this.runAction(terminalOptionsAndActionConfig);
		}

		taskqueue.start();

	},

	taskqueueError: function(err) {
		logger.error(err);
	},

	runAction: function(terminalOptionsAndActionConfig) {
		this._serverReloadType = "window";

		if (terminalOptionsAndActionConfig["@serverReloadType"]) {

			this._serverReloadType = terminalOptionsAndActionConfig["@serverReloadType"];	
		}

		taskqueue.add(terminalOptionsAndActionConfig, function(terminalOptionsAndActionConfig, done) {
			var actionName = terminalOptionsAndActionConfig['@action'];
			require("./actions/"+actionName+".js").perform(terminalOptionsAndActionConfig, done);
		});
			
	},

	watchOrEnd: function(terminalOptions) {

		if (!terminalOptions.switches.watch) {

			if (terminalOptions.switches.wait) return this.waitForEnd();
			else this.waitForExit();

		} else {
			taskqueue.defer(function() {
					this.watchForChanges(terminalOptions)
				}, this);

		}
	},

	waitForExit: function() {
		taskqueue.defer(function() {
				process.exit(0);
			}, this);
	},

	waitForEnd: function() {
		taskqueue.defer(function() {
				console.log('Press any key to exit');

				process.stdin.setRawMode(true);
				process.stdin.resume();
				process.stdin.on('data', process.exit.bind(process, 0));
			}, this);
	},

	selectWatches: function(terminalOptions) {
		this._selectedWatches = this._configuration.watches;
		this._selectedWatches = _.filter(this._selectedWatches, function(item, item1) {
			if (item['@types'] === undefined) return true;

			if (item['@types'].indexOf(terminalOptions.switches.type) == -1) return false;

			return true;

		});

		this._selectedWatches = _.filter(this._selectedWatches, function(item, item1) {
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

	},

	watchForChanges: function(terminalOptions) {
		logger.log("Watching for changes...\n",1);

		this.selectWatches(terminalOptions);

		var watches = this._selectedWatches;

		for (var i = 0, l = watches.length; i < l; i++) {
			var data = watches[i];
			data.terminalOptions = terminalOptions;
			data.callback = this.onFileChange;
			data.that = this;
			fswatch.watch(data);
		}

		taskqueue.defer(function() {
			this.startServer(terminalOptions);
		}, this);
	},

	onFileChange: function(changeType, changeFileStat, data) {
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
		
		var selectedActions = [];
		for (var a = 0, al = data.actions.length; a < al; a++) {
			var actionName = data.actions[a];
			if (!this._indexedActions[actionName]) return;
			var actionConfig = this._indexedActions[actionName];
			selectedActions.push(actionConfig);
			this.resetAction(actionConfig);
		}

		this.startBuildOperations(terminalOptions, selectedActions);

		fswatch.pause();

		taskqueue.defer(endMe, this);

		function endMe() {
			server.reload(this._serverReloadType);
			logger.log("Watching for changes...\n", 1);

			fswatch.resume();
		}
	},

	startServer: function(terminalOptions) {

		if (terminalOptions.switches['server'] && !server.isStarted()) {
			server.start(terminalOptions);
		}

	},

	resetAction: function(actionConfig) {
		var actionName = actionConfig['@action'];

		require("./actions/"+actionName+".js").reset();
	},

	exitHandler: function() {
		console.log();
		if (server.isStarted()) {
			this._serverReloadType = "close";
			server.reload(this._serverReloadType);

			setTimeout(function() {
				if (tOptions.switches.wait) return pub.waitForEnd();
				else process.exit(0);
			}, 2000);

		} else {
			process.exit(0);
		}
	}
	
};

module.exports = function(config) {
	pub.entryPoint(config);
};


process.on('SIGINT', pub.exitHandler);