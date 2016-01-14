'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();

		this.config = null;
	}

	setupEventListeners() {
		events.on("terminal:ready", (config) => { this.onTerminalReady(config); });
	}

	onTerminalReady(config) {
		this.config = config;
		this.loadConfigs();
	}

	loadConfigs() {

		this.loadConfigFiles();
		this.loadBuildConfig();

		events.emit("config:finish", this.config);
		
		_.defer(() => {
			events.emit("config:ready", this.config);
		});
	}

	loadConfigFiles() {

		//merge all config files together
		var globs = new GlobCollection(["*.json"]);
		var tree = new Tree(".", path.join(__dirname, "../../../configs"));

		var configFilePaths = tree.mapGlobs(globs).files;

		for (var i = 0, l = configFilePaths.length; i < l; i++) {

			var fileString = fs.readFileSync(configFilePaths[i].location).toString();

			var lint = jsonlint(fileString)
			if (lint.error) {
				logger.error("\nFile: " +configFilePaths[i].location+ "\nError: " + lint.error + "\nLine: " + lint.line + "\nCharacter: " + lint.character+"\n");
				continue;
			}

			var json = JSON.parse(fileString);

			for (var k in json) {
				if (json[k] instanceof Array) {
					if (!this.config[k]) this.config[k] = [];
					this.config[k] = this.config[k].concat(json[k]);
				} else if (typeof json[k] === "object") {
					this.config[k] = _.extend({}, this.config[k], json[k]);
				} else {
					this.config[k] = json[k];
				}
			}

		}
	}

	loadBuildConfig() {
		var configsPath = path.join(process.cwd(), "buildkit-config.json");
		if (fs.existsSync(configsPath)) {
			try {
				var fileString = fs.readFileSync(configsPath).toString();

				var lint = jsonlint(fileString)
				if (lint.error) {
					logger.error("\nFile: " +configsPath+ "\nError: " + lint.error + "\nLine: " + lint.line + "\nCharacter: " + lint.character+"\n");
					return;
				}

				this.config = _.deepExtend(this.config, JSON.parse(fileString));

			} catch (e) {
				logger.error("buildkit-config.json is corrupt");
				logger.error(e);
			}
		}
	}

}

module.exports = Plugin;
