
function Action(overrideObject) { for (var k  in overrideObject) { this[k] = overrideObject[k]; } }
Action.prototype.initialize = function() {};
Action.prototype.perform = function(options, done, started) { done(options); };
Action.prototype.reset = function() {};
Action.prototype.deps = function(global, dependencies) {
	this._global = global;
	for (var k in dependencies) {
		global[k] = require(dependencies[k]);
	}
};

module.exports = Action;