var Plugin = require("../libraries/Plugin.js");

module.exports = new Plugin({

	initialize: function() {
		this.deps(global, {
			'_': "underscore",
			"logger": "../libraries/logger.js",
			"url": "url",
			"fs": "fs",
			"path": "path",
			"semver": "semver"
		});
	},

	"config:loaded": function(config) {
		//console.log("config:loaded", config);

		if (!config.defaults.versionURL) return;

		var currentVersionJSON = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json")));
		var version = currentVersionJSON.version;

		if (currentVersionJSON.custom) {
			logger.log("Custom Buildkit",1)
			return;
		}


		download(config.defaults.versionURL, function(data) {
			try {
				var onlineVersion = JSON.parse(data).version;
				if (semver.lt(version, onlineVersion)) {
					logger.log("Out of date. Current version is v" +version+ ". New version is v"+onlineVersion+".",1);
					logger.log("Please run 'adapt-buildkit install rub'",1);
				} else {
					logger.log("Version v"+version+".",0)
				}
			} catch (e){

			}
		}, this);

		function download(locationUrl, callback, that, isText) {
			//download any file to a location
			var https = require("https");
			var urlParsed = url.parse(locationUrl);
			var req = https.request({
				hostname: urlParsed.hostname,
				port: 443,
				protocol: urlParsed.protocol,
				path: urlParsed.path,
				method: "GET"
			}, function(res) {
				var outputData = "";
				if (res.headers.location) {
					return pub.download(res.headers.location, callback, that);
				}
				res.on("data", function(data) {
					outputData+= data.toString();
				});
				res.on("end", function() {
					setTimeout(function() {
						callback.call(that, outputData);
					}, 500);
				});
			});
			req.on("error", function(e) {
				
			});
			req.end();
		}
	}

})
