"use strict";

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		_.extend(this, {
			selectedActions: null,
			_serverReloadType: null,
			_configuration: {},
			_fileChangeActionQueue: [],
			config: null
		});
	}

	setupEventListeners() {
		events.once("config:ready", (config) => { this.onConfigReady(config); });
		events.once("actions:ready", (selectedActions) => { this.onActionsReady(selectedActions); });
		process.on('SIGINT', this.onConsoleExit);
	}

	onConfigReady(config) {
		this.config = config;
	}

	onActionsReady(selectedActions) {
		this.selectedActions = selectedActions;
		this.startActionRunner();
	}

	startActionRunner() {

		GLOBAL.treecontext = new TreeContext({
			dirs: true,
			files: true,
			cache: true,
			globalExclusionGlobs: new GlobCollection(this.config.globber.globalExclusionGlobs || [])
		});

 		switch (this.config.terminal.command) {
 		case "watch":
 			this.runWatchOnly();
 			return;
		default:
			this.runAllActions();
 		}

	}

	runWatchOnly() {
		events.emit("watch:start");
	}

	runAllActions() {
		events.emit("build:start", this.config.terminal, this.selectedActions);
		this.watchWaitOrEnd();
	}

	watchWaitOrEnd() {

		var shouldWatch = this.config.terminal.switches.watch;
		if (shouldWatch) {
			return actionqueue.defer(() => {
				logger.flush();
				events.emit("watch:start");
			});
		} 

		var shouldWait = this.config.terminal.switches.wait;
		if (shouldWait) {
			return this.waitForEnd();
		}
		
		actionqueue.defer(() => {
			logger.flush();
			process.exit(0);
		});

	}

	waitForEnd() {
		actionqueue.defer(() => {
			logger.hold(false).flush();
			logger.notice('Press any key to exit');
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.on('data', process.exit.bind(process, 0));
		});
	}

	onConsoleExit() {
		console.log();

		var isServerRunning = (server && server.isStarted());
		if (isServerRunning) {
			
			this._serverReloadType = "close";
			server.reload(this._serverReloadType);

			return _.delay(() => {

				var shouldWait = this.config.terminal.switches.wait;
				if (shouldWait) {
					return this.waitForEnd();
				}

				process.exit(0);

			}, 2000);

		}
		
		process.exit(0);
	}

}

module.exports = Plugin;