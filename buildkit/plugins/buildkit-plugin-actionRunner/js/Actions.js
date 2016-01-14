"use strict";

var Action = require("./Action.js");

class Actions {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this.config = null;
	}

	setupEventListeners() {
		events.on("config:ready", (config) => { this.onConfigReady(config); });
		events.on("actionqueue:nextPhase", (phaseName) => { this.onActionQueueNextPhase(phaseName); });
		events.on("actions:run", (terminal, actions) => { this.onActionsRun(terminal, actions); });
	}

	onConfigReady(config) {
		this.config = config;

		this.setupActions();
	}

	onActionQueueNextPhase(phaseName) {
		_.defer(() => {
			events.emit("actions:phase", phaseName);
		});
	}

	setupActions() {
		this.selectedActions = this.config.actions;
		this.selectActions();
		_.defer(() => {
			events.emit("actions:ready", this.selectedActions);
		});
	}

	selectActions() {
		this.filterByDirectoryLayout();
		this.filterByInclusionsAndExclusions();
	}

	filterByDirectoryLayout() {
		this.selectedActions = _.filter(this.selectedActions, (item, item1) => {
			if (item['@types'] === undefined) return true;

			if (item['@types'].indexOf(this.config.terminal.switches.type) == -1) return false;

			return true;

		});
	}

	filterByInclusionsAndExclusions() {
		this.selectedActions = _.filter(this.selectedActions, (item, item1) => {
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
	}
	
	onActionsRun(terminal, actions) {

		var clonedActions = [];
		for (var i = 0, l = actions.length; i < l; i++) {
			var actionOptions = _.deepExtend({}, terminal, actions[i]);
			clonedActions.push(actionOptions);
		}

		events.emit("actions:build", clonedActions);

		for (var i = 0, l = clonedActions.length; i < l; i++) {
			this.runAction(clonedActions[i]);
		}

	}

	runAction(action) {
		var action = new Action(action);
		actionqueue.add(action);
	}

}

module.exports = Actions;