'use strict';

class Plugin {

	constructor() {
		this.init();
		this.setupEventListeners();
	}

	init() {
		this.hasBuilt = {};
	}

	setupEventListeners() {
		events.on("plugins:initialized", () => { this.onPluginsInitialized(); });
		events.on("action:run:javascriptblank", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onPluginsInitialized() {
		
	}

	onActionsReset() {

	}

	onActionRun(options, start, end) {
		options = options || {};

		if (options["@buildOnce"] && !options.switches.force) {
			if (this.hasBuilt[options["@name"]]) return end();
		}

		if (fs.existsSync(options.dest)) return end();

		start();

        options.dest = Location.contextReplace(options.dest, options);

        fs.writeFileSync(options.dest, "");// "define('"+options.name+"',function() {});");

        this.hasBuilt[options["@name"]] = true;

        end();
        
	}
}

module.exports = Plugin;
