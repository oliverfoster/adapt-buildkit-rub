
var _ = require("underscore");
var runner = require("./runner.js");

function Plugin(overrideObject) { 
	for (var k  in overrideObject) { 
		this[k] = overrideObject[k]; 
		if (k.indexOf(":") > -1)
			runner.on(k, _.bind(this[k], this));
	} 
}

Plugin.prototype.deps = function(global, dependencies) {
	this._global = global;
	for (var k in dependencies) {
		global[k] = require(dependencies[k]);
	}
};

module.exports = Plugin;