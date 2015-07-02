
function Action(overrideObject) { for (var k  in overrideObject) { this[k] = overrideObject[k]; } }
Action.prototype.initialize = function() {};
Action.prototype.perform = function(options, done, started) { done(options); };
Action.prototype.reset = function() {};

Action.deps = function(global, dependencies) {
	for (var k in dependencies) {
		global[k] = require(dependencies[k]);
	}
};

module.exports = Action;