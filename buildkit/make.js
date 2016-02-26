var fs = require("fs");
var path = require("path");

if (!fs.existsSync(path.join(path.dirname(__dirname), "buildkit/node_modules" ))) {
	console.log("Please run 'adapt-buildkit install rub'.\n")
	console.log("Note: You may need to install adapt-buildkits.")
	console.log("If so, please run 'sudo npm install -g adapt-buildkits'.");
	return;
}

try {


/*UPDATE TO 4.3.0*/
var chalk = require("chalk");
var fs = require('fs');
var path = require('path');
var semver = require('semver');
var curVer = process.versions.node;
var pkg = JSON.parse(fs.readFileSync(path.join(__dirname, './package.json')));
var versRange = pkg.engines.node;
if(semver.satisfies(curVer, pkg.engines.node) === false && pkg.custom !== true){
	console.log(chalk.red('WARNING!! URGENT ACTION REQUIRED!!'));
	console.log(chalk.red('The next version of rub is only compatible with node versions '+pkg.engines.node+', you are curently using ' + curVer + ' - errors will occur.'));
	console.log(chalk.red("If you don't know how to upgrade node, please email or speak to to oliver.foster@kineo.com"));
}


	
var terminal = require("./libraries/terminal.js");
var runner = require("./libraries/runner.js");

runner.entryPoint( terminal.entryPoint( {} ) );

} catch(e) {
	console.log("Please run 'adapt-buildkit install rub'.\n")
	console.log("Note: You may need to install adapt-buildkits.")
	console.log("If so, please run 'sudo npm install -g adapt-buildkits'.");
	return;
}
