"use strict";
var EventEmitter = require('events').EventEmitter;

class ActionQueue extends EventEmitter {

	constructor() {
		super();
		GLOBAL.actionqueue = this;
		this.init();
		this.setupEventListeners();
	}

	init() {
		_.extend(this, {
			runningLimit: 20,
			actionTimeout: 20000,
			actions: {},
			phaseIndex: 0,
			running: 0,
			phases: [ "prep", "build", "clean", "finish", "package" ],
			queueLoopInterval: null,
			loopOverRun: 0,
			inLoop: false,
			stats: {
				count: 0,
				startTime: 0,
				endTime: 0
			}
		});
	}

	setupEventListeners() {
		events.on("config:ready", (config) => { this.onConfigReady(config); });
		events.on("actionqueue:stat", (stats) => { this.onActionQueueStats(stats); });
	}

	onConfigReady(config) {
		actionqueue.runningLimit = config.actionrunner.runningLimit || 20;
		actionqueue.actionTimeout = config.actionrunner.actionTimeout || 20000;
	}

	onActionQueueStats(stats) {
		logger.notice(stats.count,"actions in", (Math.round( (stats.endTime - stats.startTime) / 10, 2 )/100) + " seconds.");
	}
	
	isRunning() {
		return ( this.queueLoopInterval && this.phaseIndex < this.phases.length);
	}

	reset() {
		this.phaseIndex = 0;
		this.actions = {};
		this.runningActions = {};
		this.running = 0;
		this.inLoop = false;
		this.stats = {
			count: 0,
			startTime: 0,
			endTime: 0
		};
	}

	add(action) {
		if (!this.actions[action.options['@when']]) this.actions[action.options['@when']] = [];
		this.actions[action.options['@when']].push(action);
		this.stats.count++;
	}

	start() {

		if (this.queueLoopInterval) return;
		this.stats.startTime = (new Date()).getTime();
		this.nextPhase(true);
		this.queueLoopInterval = setInterval(() => { this.queueLoop(); }, 1);

		this.end = this.endLoop;

	}

	queueLoop() {
		var phaseName = this.phases[this.phaseIndex];
		var actions =  this.actions[phaseName];
		if (actions && actions.length > 0 && this.running < this.runningLimit) {
			this.inLoop = true;
			for (var i = 0, l = actions.length; i < l && this.running < this.runningLimit; i++) {
				var action = actions.shift();
				this.running++;
				this.runningActions[action.uid] = action;
				action.start(_.bind(this.actionDone, this, action));
			}
			this.inLoop = false;
		} else {
			for (var uid in this.runningActions) {
				var action = this.runningActions[uid];
				if (action.runningTime() > actionqueue.actionTimeout) {
					this.actionDone(action, action.options['@name']+" has been running for more than "+(Math.floor(action.runningTime()/100)/10)+" second(s), terminating...")					
				}
			}
		}

		this.checkNext();
	}

	actionDone(action, err) {
		if (err && action.error) {
			action.error(err, _.bind(this.endLoop, this));
		}
		if (action.end) {
			action.end();
		}
		delete this.runningActions[action.uid];
		this.running--;
		this.checkNext()
	}

	checkNext() {
		if (this.phaseIndex >= this.phases.length) return;

		var phaseName = this.phases[this.phaseIndex];
		var actions =  this.actions[phaseName];

		if (actions === undefined) return this.nextPhase();
		if (this.running <= 0 && actions.length === 0) return this.nextPhase();
	}

	nextPhase(isStart) {
		this.running = 0;
		
		if (!isStart) this.phaseIndex++;

		if (this.phaseIndex >= this.phases.length) {
			return this.endLoop();
		}

		var phaseName = this.phases[this.phaseIndex];			
		var actions =  this.actions[phaseName];
		this.emit("nextPhase", phaseName );
		events.emit("actionqueue:nextPhase", phaseName);

		if (!actions || actions.length === 0) return this.nextPhase();
	}

	endLoop() {
		clearInterval(this.queueLoopInterval);
		this.queueLoopInterval = null;
		this.stats.endTime = (new Date()).getTime();
		this.emit("stat", this.stats);
		events.emit("actionqueue:stat", this.stats);
		this.emit("wait");
		this.removeAllListeners("wait");
	}

	defer(callback) {
		if (this.isRunning()) {
			this.on("wait", function() {
				callback();
			});
		} else {
			callback();
		}
	}

}

module.exports = ActionQueue;