"use strict";

var chalk = require("chalk");

class Logger {

	constructor() {
		this._isHolding = false;
		this._held = [];
	}

	hold(bool) {
		this._isHolding = (bool === undefined ? true : bool);
		if (!this._isHolding) this.flush();
		return this;
	}

	flush() {
		while (this._held.length > 0) {
			var output = this._held.shift();
			console.log(chalk[output.color](output.args.join(" ")));
		}
		return this;
	}

	_output(color, args) {
		if (this._isHolding) {
			this._held.push({
				"color": color,
				"args": args
			});
		} else {
			console.log(chalk[color](args.join(" ")));
		}
	}

	file(path, text, overwrite) {
		if (overwrite) {
			if (!text) {
				fs.writeFileSync(path, "");
			} else {
				fs.writeFileSync(path, text+"\n\r");
			}
		} else {
			fs.appendFileSync(path, text+"\n\r");
		}
	}

	log() {
		var args = [].slice.call(arguments,0);
		this._output("white", args);
		return this;
	}

	logThrough() {
		var args = [].slice.call(arguments,0);
		console.log(chalk["white"](args.join(" ")));
		return this;
	}

	notice() {
		var args = [].slice.call(arguments,0);
		this._output("yellow", args);
		return this;
	}

	noticeThrough() {
		var args = [].slice.call(arguments,0);
		console.log(chalk["yellow"](args.join(" ")));
		return this;
	}

	verbose() {
		var args = [].slice.call(arguments,0);
		this._output("green", args);
		return this;
	}

	verboseThrough() {
		var args = [].slice.call(arguments,0);
		console.log(chalk["green"](args.join(" ")));
		return this;
	}

	warn() {
		var args = [].slice.call(arguments,0);
		this._output("red", args);
		return this;
	}

	warnThrough() {
		var args = [].slice.call(arguments,0);
		console.log(chalk["red"](args.join(" ")));
		return this;
	}

	error() {
		var args = [].slice.call(arguments,0);
		this._output("red", args);
		return this;
	}

	errorThrough() {
		var args = [].slice.call(arguments,0);
		console.log(chalk["red"](args.join(" ")));
		return this;
	}

	
	
}

module.exports = GLOBAL.logger = new Logger();
