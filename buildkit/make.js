"use strict";

var fs = require("fs");
var path = require("path");

try {

	//load package.json to GLOBAL.application
	GLOBAL.application = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json")));

	//check if nodemodules folder was installed
	if (!fs.existsSync(path.join(__dirname, "node_modules" ))) {
		throw "Cannot find "+path.join(__dirname, "node_modules") + " folder";
	}

	//load default global variables
	([
		["_", require('underscore') ],
		["underscoreDeepExtend", require("underscore-deep-extend") ],
		["plugins", require("buildkit-plugins") ],
		["GlobCollection", require("buildkit-globber").GlobCollection ],
		["TreeContext", require("buildkit-globber").TreeContext ],
		["Tree", require("buildkit-globber").Tree ],
		["WatchCollection", require("buildkit-globber").WatchCollection ],
		["Location", require("buildkit-globber").Location ],
		["FileSystem", require("buildkit-globber").FileSystem ],
		["MATCH_TYPE", require("buildkit-globber").MATCH_TYPE ],
		["events", new (require('events').EventEmitter)() ],
		["url", require("url") ],
		["fs", fs ],
		["os", require("os") ],
		["path", path ]
	]).map(function(m) {GLOBAL[m[0]] = m[1];});


	//setup underscoreDeepExtend
	_.mixin({deepExtend: underscoreDeepExtend(_)});

	//make sure events listener can handle a large number of plugins
	events.setMaxListeners(2000);

	//load plugins according to ./plugins/*/package.json:main
	var pluginsPath = path.join(__dirname, "plugins");
	var pluginConfigGlob = "*/package.json";
	plugins.load(pluginsPath, pluginConfigGlob, function(pluginCode, pluginJSON) {

		if (!pluginCode) return;

		if (pluginJSON.pluginDependencies) {
			//load + attach plugin dependencies to the global scope
			for (var d in pluginJSON.pluginDependencies) {
				GLOBAL[d] = GLOBAL[d] || require(pluginJSON.pluginDependencies[d]);
			}
		}

		if (typeof pluginCode === "function") {
			//create plugin instance if a plugin code is a function
			var pluginInstance;
			try {
				pluginInstance = new pluginCode();
			} catch (e) {
				console.error("Plugin Loading Error:", pluginJSON.pluginName, e);
			}
			return pluginInstance;
		} else {
			return pluginCode;
		}

	});

	//trigger initial event
	events.emit("plugins:initialized");

} catch(e) {

	console.log("Please run 'adapt-buildkit install "+application.commonName+"'.\n")
	console.log("Note: You may need to install adapt-buildkits.")
	console.log("If so, please run 'sudo npm install -g adapt-buildkits'.");
	console.log();
	throw e;

}
