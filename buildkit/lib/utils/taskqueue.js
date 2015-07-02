var _ = require("underscore");

var events = require('events');
var eventEmitter = new events.EventEmitter();

var pub =  _.extend(eventEmitter, {

	taskLimit: 20,
	_tasks: {},
	_phaseIndex: 0,
	_running: 0,
	_phases: [ "start", "postStart", "preFinish", "finish" ],
	_phaseDisplayNames: [ "> Preparation <", "> Construction <", "> Alterations <", "> Finishing <"],
	_queueLoopInterval: null,
	_loopOverRun: 0,
	_inLoop: false,
	_hasDisplayedPhaseName: false,

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
		nextPhase(true);
		pub._queueLoopInterval = setInterval(queueLoop, 1);

		function queueLoop() {

			var phaseName = pub._phases[pub._phaseIndex];
			var tasks =  pub._tasks[phaseName];

			if (tasks && tasks.length > 0) {
				pub._inLoop = true;
				pub._hasLoopRun = false;
				for (var i = 0, l = tasks.length; i < l && pub._running < pub.taskLimit; i++) {
					pub._hasLoopRun = true;
					var task = tasks.shift();
					pub._running++;
					task.executor(task.options, taskDone);	
				}
				pub._inLoop = false;
			}

			checkNext();
		}

		function taskDone(options, err) {
			if (err) {
				pub.emit("error", options, err);
			}
			pub._running--;
			checkNext()
		}

		function checkNext() {
			if (pub._phaseIndex >= pub._phases.length) return;

			var phaseName = pub._phases[pub._phaseIndex];
			var tasks =  pub._tasks[phaseName];

			if (tasks === undefined) return nextPhase();
			if (pub._running <= 0 && tasks.length === 0) return nextPhase();
		}

		function nextPhase(isStart) {
			pub._hasDisplayedPhaseName = true;
			pub._running = 0;
			if (!isStart) pub._phaseIndex++;

			if (pub._phaseIndex >= pub._phases.length) return endLoop();

			var phaseName = pub._phases[pub._phaseIndex];
			var tasks =  pub._tasks[phaseName];
			if (!tasks || tasks.length === 0) return nextPhase();

			var phaseName = pub._phases[pub._phaseIndex];
			console.log(pub._phaseDisplayNames[pub._phaseIndex]);
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





