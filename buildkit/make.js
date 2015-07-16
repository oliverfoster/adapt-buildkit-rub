var fs = require("fs");
var path = require("path");

if (!fs.existsSync(path.join(path.dirname(__dirname), "buildkit/node_modules" ))) {
	console.log("Please run 'adapt-buildkit install rub'.\n")
	console.log("Note: You may need to install adapt-buildkits.")
	console.log("If so, please run 'sudo npm install -g adapt-buildkits'.");
	return;
}

var terminal = require("./libraries/terminal.js");
var runner = require("./libraries/runner.js");

runner.entryPoint( terminal.entryPoint( {} ) );
