'use strict';

class Plugin {

	constructor() {
		this.init();
	}

	init() {
		if (!fs.existsSync(path.join(__dirname, "../../../node_modules" ))) {
			console.log("Please run 'adapt-buildkit install "+application.commonName+"'.\n")
			console.log("Note: You may need to install adapt-buildkits.")
			console.log("If so, please run 'sudo npm install -g adapt-buildkits'.");
			process.exit(0);
		}
	}

}

module.exports = Plugin;
