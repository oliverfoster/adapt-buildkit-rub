'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:buildinfo", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		start();
        
		options.dest = Location.contextReplace(options.dest, options);
		options.dest = Location.toAbsolute(options.dest);

		var srcPath = Location.toAbsolute(options.src);

        if (fs.existsSync(srcPath)) {

            var packageJSON = JSON.parse(fs.readFileSync( path.join(srcPath, "../package.json") ).toString());


            var buildinfo = {
            	"timestamp": Date.now(),
            	"timestamp-readable": (new Date()).toUTCString(),
            	"rub": {
            		"version": application.version,
            		"command": options.command,
            		"switches": options.switches,
            		"course": options.course,
            		"courses": options.courses,
            		"fileextensions": options.fileextensions,
            		"folderexclusions": options.folderexclusions
            	},
            	"adapt": {
            		"version": packageJSON.version
            	}
            };

            fs.writeFileSync(options.dest, JSON.stringify(buildinfo, null, "    "));

        }


        end();
	}
	
}

module.exports = Plugin;
