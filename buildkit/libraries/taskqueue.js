var _ = require("underscore");

var events = require('events');
var eventEmitter = new events.EventEmitter();

var pub =  _.extend(eventEmitter, {

	taskLimit: 20,
	_tasks: {},
	_phaseIndex: 0,
	_running: 0,
	_phases: [ "start", "postStart", "preFinish", "finish" ],
	_queueLoopInterval: null,
	_loopOverRun: 0,
	_inLoop: false,
	_stats: {
		count: 0,
		startTime: 0,
		endTime: 0
	},

	isRunning:function() {
		return (pub._phaseIndex < pub._phases.length);
	},

	reset: function() {
		pub._phaseIndex = 0;
		pub._tasks = {};
		pub._running = 0;
		pub._inLoop = false;
		pub._stats = {
			count: 0,
			startTime: 0,
			endTime: 0
		};
	},

	add: function(task) {
		if (!pub._tasks[task.options['@when']]) pub._tasks[task.options['@when']] = [];
		pub._tasks[task.options['@when']].push({
			options: task.options,
			start: task.start,
			end: task.end,
			error: task.error, 
			context: task.context
		});
		pub._stats.count++;
	},

	start: function() {

		if (pub._queueLoopInterval) return;
		pub._stats.startTime = (new Date()).getTime();
		nextPhase(true);
		pub._queueLoopInterval = setInterval(queueLoop, 1);

		function queueLoop() {
			var phaseName = pub._phases[pub._phaseIndex];
			var tasks =  pub._tasks[phaseName];

			if (tasks && tasks.length > 0) {
				pub._inLoop = true;
				for (var i = 0, l = tasks.length; i < l && pub._running < pub.taskLimit; i++) {
					var task = tasks.shift();
					pub._running++;
					task.start.call(task.context, task.options, _.bind(taskDone, task));	
				}
				pub._inLoop = false;
			}

			checkNext();
		}

		function taskDone(options, err) {
			if (err) {
				pub.emit("error", options, err);
				if (this.error) {
					this.error.call(this.context, this.options, err);
				}
			}
			if (this.end) {
				this.end.call(this.context, this.options);
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
			pub._running = 0;
			
			if (!isStart) pub._phaseIndex++;

			if (pub._phaseIndex >= pub._phases.length) return endLoop();

			var phaseName = pub._phases[pub._phaseIndex];			
			var tasks =  pub._tasks[phaseName];
			pub.emit("nextPhase", phaseName )

			if (!tasks || tasks.length === 0) return nextPhase();
		}

		function endLoop() {
			clearInterval(pub._queueLoopInterval);
			pub._queueLoopInterval = null;
			pub._stats.endTime = (new Date()).getTime();
			pub.emit("stat", pub._stats);
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





