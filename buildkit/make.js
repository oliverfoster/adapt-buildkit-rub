var terminal = require("./libraries/terminal.js");
var runner = require("./libraries/runner.js");

var fs = require("fs");
var path = require("path");

if (!fs.existsSync(path.join(path.dirname(__dirname), "buildkit/node_modules" ))) {
	console.log("Please run 'npm install' in the buildkits folder");
	return;
}

runner.entryPoint( terminal.entryPoint( {} ) );