var chalk = require("chalk");
var _ = require("underscore");

var events = require('events');
var eventEmitter = new events.EventEmitter();

var pub =  _.extend(eventEmitter, {

	_tasks: {},

	_phaseIndex: 0,
	_running: 0,
	_phases: [ "start", "postStart", "preFinish", "finish" ],
	_queueLoopInterval: null,
	_loopOverRun: 0,
	_inLoop: false,

	isRunning:function() {
		return (pub._phaseIndex < pub._phases.length);
	},

	reset: function() {
		pub._phaseIndex = 0;
		pub._tasks = {};
		pub._running = 0;
		pub._inLoop = false;
	},

	add: function(options, executor) {
		if (!pub._tasks[options['@when']]) pub._tasks[options['@when']] = [];
		pub._tasks[options['@when']].push({
			options: options,
			executor: executor
		});
	},

	start: function() {
		if (pub._queueLoopInterval) return;
		pub._queueLoopInterval = setInterval(queueLoop, 1);

		function queueLoop() {
			if (pub._phaseIndex > pub._phases.length) return endLoop();
			var phaseName = pub._phases[pub._phaseIndex];
			var tasks =  pub._tasks[phaseName];
			if (tasks === undefined) return nextPhase();
			if (tasks.length === 0) {
				pub._loopOverRun++;
				return;
			}
			pub._inLoop = true;
			for (var i = 0, l = tasks.length; i < l && pub._running < 10; i++) {
				var task = tasks.shift();
				pub._running++;
				task.executor(task.options, taskDone);	
			}
			pub._inLoop = false
			if (pub._running <= 0) nextPhase();
		}

		function taskDone(options, err) {
			if (err) {
				pub.emit("error", options, err);
			}
			pub._running--;
			if (pub._running <= 0 && !pub._inLoop) nextPhase();
		}

		function nextPhase() {
			pub._running = 0;
			pub._phaseIndex++;
			var phaseName = pub._phases[pub._phaseIndex];
			if (pub._phaseIndex > pub._phases.length) return endLoop();
			if (pub._tasks[phaseName] === undefined) return nextPhase();
			if (pub._tasks[phaseName].length === 0) return nextPhase();
		}

		function endLoop() {
			clearInterval(pub._queueLoopInterval);
			pub._queueLoopInterval = null;
			pub.emit("wait");
			pub.removeAllListeners("wait");
		}

		pub.end = endLoop;

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





