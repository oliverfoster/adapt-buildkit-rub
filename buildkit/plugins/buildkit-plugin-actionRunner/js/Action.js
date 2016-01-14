"use strict";

var uid = 0;

class Action {

	constructor(options) {
		this.init(options);
		this.uid = uid++;
	}

	init(options) {
		this.options = JSON.parse(JSON.stringify(options));
		this.startTime = 0;
	}

	start(actionDoneCallback) {
		this.startTime = (new Date()).getTime();
		events.emit("action:prep", this.options, this);
		events.emit("action:prep:"+this.options["@action"], this.options, this);
		events.emit("action:run:"+this.options["@action"],  this.options, () => { this.started(); }, actionDoneCallback );
	}

	runningTime() {
		return ((new Date()).getTime() - this.startTime)
	}

	started() {
		if (this.options['@buildOnce'] === true) {
			if (this.options["@displayName"]) logger.logThrough(this.options["@displayName"]);
		} else {
			if (this.options['course']) {
				if (this.options["@displayName"]) logger.logThrough(this.options['course'] + " - " + this.options["@displayName"]);
			} else {
				if (this.options["@displayName"]) logger.logThrough(this.options["@displayName"]);
			}
		}
		events.emit("action:start", this.options, this);
	}

	end() {
		events.emit("action:end", this);
	}

	error(error, terminateQueue) {
		events.emit("action:error", this, error, terminateQueue);
	}
}

module.exports = Action;