var chalk = require("chalk");
var _ = require("underscore");

var errorqueue = [];

var pub = {

	file: function(path, text, overwrite) {
		if (overwrite) {
			if (!text) {
				fs.writeFileSync(path, "");
			} else {
				fs.writeFileSync(path, text+"\n\r");
			}
		} else {
			fs.appendFileSync(path, text+"\n\r");
		}
	},

	holdErrors: false,

	flushErrors: function() {
		while (errorqueue.length > 0) {
			pub.log(errorqueue.shift(), -1);
		}
	},

	error: function(text) {
		if (pub.holdErrors) {
			errorqueue.push(text);
		} else {
			pub.log(text, -1);
		}
	},

	log: function(text, level) {
		switch(level) {
			case -1:
			console.log(chalk.bgRed(text));
			break;
		case -1:
			console.log(chalk.bgRed(text));
			break;
		case 0:
			console.log(text);
			break;
		case 1:
			console.log(chalk.yellow(text));
			break;
		case 2:
			console.log(chalk.cyan(text));
			break;
		case 3:
			console.log(chalk.bgMagenta(text));
			break;
		}
	}
	
};

module.exports = pub;
