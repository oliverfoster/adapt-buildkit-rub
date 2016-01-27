"use strict";

class Watch {

	constructor() {
		this.init();
	}

	init() {
		_.extend(this, {
			config: null,
			selectedActions: null,
			indexedActions: null,
			selectedWatches: null,
			trees: [],
			watches: new WatchCollection(),
			fileChangeActionQueue: [],
			fileChangeQueue: [],
			serverReloadType: null
		});
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.once("config:ready", (config) => { this.onceConfigReady(config); });
		events.once("actions:ready", (selectedActions) => { this.onceActionsReady(selectedActions); });
		events.on("watch:start", () => { this.onWatchStart(); });
		events.once("watch:start", () => { this.onceWatchStart(); });
		events.on("watches:expanded", (expanded) => { this.onWatchesExpanded(expanded); });
	}

	onceConfigReady(config) {
		this.config = config;
	}
	
	onceActionsReady(selectedActions) {
		this.selectedActions = selectedActions;
		this.indexedActions = _.indexBy(selectedActions, "@name");
	}

	onWatchStart() {
		logger.hold(false);
		logger.notice("Watching for changes...\n");
	}

	onceWatchStart() {

		this.selectWatches(this.config.terminal);

		var watches = this.selectedWatches;

		for (var i = 0, l = watches.length; i < l; i++) {
			var data = watches[i];
			data.terminalOptions = this.config.terminal;
			var tree, watch;
			if (!data.globs) {
				tree = treecontext.Tree(".", ".");
				var globs = Location.contextReplace([data.path], this.config);
				globs = new GlobCollection(globs);
				watch = tree.watchGlobs(globs);
			} else {
				tree = treecontext.Tree(data.path, ".");
				var globs = Location.contextReplace(data.globs, this.config);
				globs = new GlobCollection(globs);
				watch = tree.watchGlobs(globs);
			}
			watch.data = data;
			watch.on("change", (watcher, files, dirs) => {
				this.onFilesChangedProgress(files, watcher.data);
			});
			this.watches.push(watch);
		}
		this.watches.clearCache();
		this.watches.start();

		actionqueue.defer(() => {
			if (this.config.terminal.switches['server']) {
				events.emit("server:start", this.config.terminal);
			}
		});

		events.emit("actions:wait");
	}

	selectWatches() {
		this.selectedWatches = this.config.watches;
		this.selectedWatches = _.filter(this.selectedWatches, (item, item1) => {
			if (item['@types'] === undefined) return true;

			if (item['@types'].indexOf(this.config.terminal.switches.type) == -1) return false;

			return true;

		});

		this.selectedWatches = _.filter(this.selectedWatches, (item, item1) => {
			if (item['@onlyOnSwitches'] !== undefined) {
				var found = false;
				for (var key in this.config.terminal.switches) {
					var value = this.config.terminal.switches[key];
					if (!value) continue;
					
					if (item['@onlyOnSwitches'].indexOf(key) != -1) {
						found = true;
						break
					}
				}
				if (!found) return false;
			}

			if (item['@excludeOnSwitches'] === undefined) return true;

			for (var key in this.config.terminal.switches) {
				var value = this.config.terminal.switches[key];
				if (!value) continue;
				
				if (item['@excludeOnSwitches'].indexOf(key) != -1) {
					return false;
				}
			};

			return true;

		});

		events.emit("watches:prep", this.selectedWatches);
		events.emit("watches:expand", this.selectedWatches);

	}

	onWatchesExpanded( expanded ) {
		this.selectedWatches = expanded;
	}

	onFilesChangedProgress(files, data) {

		//XXX
		//include expand / restrict for action selection
		//need to be able to restrict course action running for tasks, adapt specific
		//this will allow course.json change on multiple courses to only redo json for changed course

		var terminalOptions = data.terminalOptions;

		this.config.terminal.switches.force = true;

		for (var i = 0, l = files.length; i < l; i++) {
			var file = files[i];

			var isActionInList = _.where(this.fileChangeQueue, { location: file.location });
			if (isActionInList.length > 0) continue;
			this.fileChangeQueue.push(file);

			switch (file.change) {
			case "updated":
				logger.notice(file.location.filename+file.location.extname + " was updated.");
				break;
			case "created":
				logger.notice(file.location.filename+file.location.extname + " was added.");
				break;
			case "deleted":
				logger.notice(file.location.filename+file.location.extname + " was deleted.");
				break;
			}
		}

		for (var a = 0, al = data.actions.length; a < al; a++) {
			var actionName = data.actions[a];
			if (!this.indexedActions[actionName]) {
				logger.error("Action not found: " + actionName);
				continue;
			}
			if (this.serverReloadType !== "window") {
				if (this.indexedActions[actionName]['@serverReloadType']) {
					this.serverReloadType = this.indexedActions[actionName]['@serverReloadType'];
				}
			}
			var actionConfig = this.indexedActions[actionName];
			var isActionInList = _.where(this.fileChangeActionQueue, { "@name": actionConfig["@name"] });
			if (isActionInList.length === 0) {
				this.fileChangeActionQueue.push(actionConfig);
			}
		}

		if (this.completeTimeoutHandle) {
			clearTimeout(this.completeTimeoutHandle);
		}
		this.completeTimeoutHandle = setTimeout(() => { this.onFilesChangedComplete(); }, 2000);

	}

	onFilesChangedComplete() {

		//find a way to choose terminal options from changed files,
		//see point XXX above

		clearTimeout(this.completeTimeoutHandle);
		this.completeTimeoutHandle = null;

		if (this.fileChangeActionQueue.length > 0) {

			this.watches.stop();
			events.emit("actions:reset");
			events.emit("actions:ready",  this.fileChangeActionQueue);
			events.emit("build:start", this.config.terminal, this.fileChangeActionQueue);

			this.fileChangeQueue = [];
			this.fileChangeActionQueue = [];

		}

		actionqueue.defer(() => {
			events.emit("server:reload", this.serverReloadType || "window");

			this.serverReloadType = null;

			this.watches.clearCache();
			this.watches.start();
			events.emit("watch:start");
		});
	}


}

module.exports = Watch;
