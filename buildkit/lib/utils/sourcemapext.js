var fs = require("fs");
var path = require("path");

module.exports = {
	relocate: function(file, pathRelocation) {
		var json = JSON.parse(fs.readFileSync(file));
		for (var i = 0, l = json.sources.length; i < l; i++) {
			json.sources[i] = path.join(pathRelocation, json.sources[i]);
			json.sources[i] = json.sources[i].replace(/\\/g, "/");
		}
		fs.writeFileSync(file, JSON.stringify(json));
	}
};