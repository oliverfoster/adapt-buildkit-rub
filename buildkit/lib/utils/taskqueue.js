var ProgressBar = require('progress');
var chalk = require("chalk");
var _ = require("underscore");

var events = require('events');
var eventEmitter = new events.EventEmitter();

var pub =  _.extend(eventEmitter, {
	_tasks: {},
	isRunning:function() {
		return (stage < stages.length);
	},
	reset: function() {
		stage = 0;
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

var stage = 0;
var running = 0;
var stages = [ "start", "postStart", "preFinish", "finish" ];
var queueLoopInterval = null;
var loopOverRun = 0;
var inLoop = false;

function queueLoop() {
	if (stage > stages.length) return endLoop();
	var stageName = stages[stage];
	var tasks =  pub._tasks[stageName];
	if (tasks === undefined) return nextStage();
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
	if (running <= 0) nextStage();
}
function taskDone(err, options) {
	if (err) {
		pub.emit("error", err, options);
	}
	running--;
	if (running <= 0 && !inLoop) nextStage();
}

function nextStage() {
	running = 0;
	stage++;
	var stageName = stages[stage];
	if (stage > stages.length) return endLoop();
	if (pub._tasks[stageName] === undefined) return nextStage();
	if (pub._tasks[stageName].length === 0) return nextStage();
}

function endLoop() {
	clearInterval(queueLoopInterval);
	queueLoopInterval = null;
	pub.emit("wait");
	pub.removeAllListeners("wait");
}


