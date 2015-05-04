var chalk = require("chalk");
var _ = require("underscore");

var events = require('events');
var eventEmitter = new events.EventEmitter();

var pub =  _.extend(eventEmitter, {

	_tasks: {},

	isRunning:function() {
		return (phase < phases.length);
	},

	reset: function() {
		phase = 0;
		tasks = [];
		running = 0;
		inLoop = false;
	},

	add: function(options, executor) {
		if (!this._tasks[options['@when']]) this._tasks[options['@when']] = [];
		this._tasks[options['@when']].push({
			options: options,
			executor: executor
		});
	},

	start: function() {
		if (queueLoopInterval) return;
		queueLoopInterval = setInterval(queueLoop, 1);
	},

	end: function() {
		endLoop();
	},

	defer: function(callback, that) {
		if (pub.isRunning()) {
			pub.on("wait", function() {
				callback.call(that);
			});
		} else {
			callback.call(that);
		}
	}

});
module.exports = pub;

var phase = 0;
var running = 0;
var phases = [ "start", "postStart", "preFinish", "finish" ];
var queueLoopInterval = null;
var loopOverRun = 0;
var inLoop = false;

function queueLoop() {
	if (phase > phases.length) return endLoop();
	var phaseName = phases[phase];
	var tasks =  pub._tasks[phaseName];
	if (tasks === undefined) return nextPhase();
	if (tasks.length === 0) {
		loopOverRun++;
		return;
	}
	inLoop = true;
	for (var i = 0, l = tasks.length; i < l && running < 10; i++) {
		var task = tasks.shift();
		running++;
		task.executor(task.options, taskDone);	
	}
	inLoop = false
	if (running <= 0) nextPhase();
}

function taskDone(err, options) {
	if (err) {
		pub.emit("error", err, options);
	}
	running--;
	if (running <= 0 && !inLoop) nextPhase();
}

function nextPhase() {
	running = 0;
	phase++;
	var phaseName = phases[phase];
	if (phase > phases.length) return endLoop();
	if (pub._tasks[phaseName] === undefined) return nextPhase();
	if (pub._tasks[phaseName].length === 0) return nextPhase();
}

function endLoop() {
	clearInterval(queueLoopInterval);
	queueLoopInterval = null;
	pub.emit("wait");
	pub.removeAllListeners("wait");
}


