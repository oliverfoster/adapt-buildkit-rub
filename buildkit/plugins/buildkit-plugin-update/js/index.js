'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("config:ready", (config) => { this.onConfigReady(config); });
	}

	onConfigReady(config) {
		if (!config.update.versionURL) return;

		if (application.custom) {
			logger.log("Custom Buildkit");
			return;
		}

		this.download(config.update.versionURL, (data) => {
			try {
				var onlineVersion = JSON.parse(data).version;
				if (semver.lt(application.version, onlineVersion)) {
					logger.notice("Out of date. Current version is v" +application.version+ ". New version is v"+onlineVersion+".");
					logger.notice("Please run 'adapt-buildkit install "+application.commonName+"'");
				} else {
					logger.log("Version v"+application.version);
				}
			} catch (e){}
		});

	}

	download(locationUrl, callback, isText) {
		//download any file to a location
		var urlParsed = url.parse(locationUrl);
		var req = https.request({
			hostname: urlParsed.hostname,
			port: 443,
			protocol: urlParsed.protocol,
			path: urlParsed.path,
			method: "GET"
		}, (res) => {
			var outputData = "";
			if (res.headers.location) {
				return pub.download(res.headers.location, callback);
			}
			res.on("data", (data) => {
				outputData+= data.toString();
			});
			res.on("end", () => {
				setTimeout(() => {
					callback(outputData);
				}, 500);
			});
		});
		req.on("error", function(e) {
			
		});
		req.end();
	}
	
}

module.exports = Plugin;
