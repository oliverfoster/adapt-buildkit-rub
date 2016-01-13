'use strict';

var subModules = [
	new (require("./Actions.js")),
	new (require("./ActionQueue.js")),
	new (require("./Build.js")),
	new (require("./Watch.js")),
	new (require("./Runner.js")),
	new (require("./ActionMessages"))
];

module.exports = subModules;
