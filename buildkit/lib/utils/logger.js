var chalk = require("chalk");
var _ = require("underscore");

var pub = {

	runlog: function(options) {
		if (options['@buildOnce'] === true) {
			if (options["@displayName"]) console.log(options["@displayName"]);
		} else {
			if (options['course']) {
				if (options["@displayName"]) console.log(options['course'], "-", options["@displayName"]);
			} else {
				if (options["@displayName"]) console.log(options["@displayName"]);
			}
		}
	},

	error: function(text) {
		pub.log(text, -1);
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