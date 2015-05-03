var program = require('commander');
var _ = require("underscore");
var fs = require("fs");
var path = require("path");
 
var items;

program
	.version(JSON.parse(fs.readFileSync( path.join(__dirname, "../package.json"))).version)
	.arguments('[course..]')
	.option('-b, --build', "build courses (default)")
	.option('-W, --wait', "wait for keypress at end")
	.option('-i, --trackinginsert', "inserts tracking ids (assumes: not -b)")
	.option('-d, --trackingdelete', "delete tracking ids (assumes: not -b)")
	.option('-r, --trackingreset', "resets tracking ids (assumes: not -b)")
	.option('-w, --watch', "watch for changes (assumes: -b)")
	.option('-p, --production', "minification and no sourcemaps (assumes: -bf)")
	.option('-f, --force', "force rebuild (assumes: -b)")
	.option('-s, --server', "run server (assumes: -bw --port 3001)")
	.option('--port [value]', "set server port")
	.option('-q, --quick', "skip minification and sourcemapping (assumes: -b)")
	.option('-Z, --zip', "create sco zips (assumes: -b")
	.action(function (courses) {
		items = courses;
	});
 
program.parse(process.argv);


var switches = {};
_.each(program.options, function(opt) {
	var k = opt.long.slice(2);
	if (k == "version") return;
	switches[k] = program[k];
});

module.exports = function(forceSwitches) {

	switches = _.extend(switches, forceSwitches);
	return {
		switches: switches,
		items: items || []
	};
};