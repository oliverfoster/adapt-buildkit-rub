'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:tracking", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {

		start();

		options.coursePath.src = Location.contextReplace(options.coursePath.src, options);
		options.blocksPath.src = Location.contextReplace(options.blocksPath.src, options);

		var coursePathTree = treecontext.Tree(options.coursePath.src, ".");
        options.coursePath.glob = Location.contextReplace(options.coursePath.glob, options);
		var coursePathTreeGlobs = new GlobCollection(options.coursePath.glob);
        var coursePathTreeResults = coursePathTree.mapGlobs(coursePathTreeGlobs);
        if (coursePathTreeResults.files.length === 0) {
            return end("Cannot find "+ options.coursePath.glob );
        }
		options.coursePath = coursePathTreeResults.files[0].location;

        var blocksPathTree = treecontext.Tree(options.blocksPath.src, ".");
        options.blocksPath.glob = Location.contextReplace(options.blocksPath.glob, options);
		var blocksPathTreeGlobs = new GlobCollection(options.blocksPath.glob);
        var blocksPathTreeResults = blocksPathTree.mapGlobs(blocksPathTreeGlobs)
        if (blocksPathTreeResults.files.length === 0) {
            return end("Cannot find "+ options.blocksPath.glob );
        }
		options.blocksPath = blocksPathTree.mapGlobs(blocksPathTreeGlobs).files[0].location;

		options.blocksPath = blocksPathTree.mapGlobs(blocksPathTreeGlobs).files[0].location;

		if (options.switches.trackinginsert) {
			insertTrackingIds(options);
		} else if (options.switches.trackingdelete) {
			removeTrackingIds(options);
		} else if (options.switches.trackingreset) {
			resetTrackingIds(options);
		}

        end();

        function insertTrackingIds(options) {
            var course = JSON.parse(fs.readFileSync(options.coursePath));
            var blocks = JSON.parse(fs.readFileSync(options.blocksPath));

            options._latestTrackingId = course._latestTrackingId || -1;
            options._trackingIdsSeen = [];

            var haveblocksChanged = false;
            
            for(var i = 0; i < blocks.length; i++) {
                var block = blocks[i];
                if(block._trackingId === undefined) {
                    haveblocksChanged = true;
                    block._trackingId = ++options._latestTrackingId;
                    //logger.log("Adding tracking ID: " + block._trackingId + " to block " + block._id, 1);
                } else {
                    if(options._trackingIdsSeen.indexOf(block._trackingId) > -1) {
                        //logger.log(chalk.bgRed("Warning: " + block._id + " has the tracking ID " + block._trackingId + ", but this is already in use. Changing to " + (options._latestTrackingId + 1) + "."));
                        haveblocksChanged = true;
                        block._trackingId = ++options._latestTrackingId;
                    } else {
                        //logger.log("Found tracking ID: " + block._trackingId + " on block " + block._id, 0);
                        options._trackingIdsSeen.push(block._trackingId);
                    }
                }
                if(options._latestTrackingId < block._trackingId) {
                    options._latestTrackingId = block._trackingId;
                }
                    
            }
            if (course._latestTrackingId !== options._latestTrackingId || haveblocksChanged) {
                course._latestTrackingId = options._latestTrackingId;
                fs.writeFileSync(options.coursePath, JSON.stringify(course, null, "    "));
                fs.writeFileSync(options.blocksPath, JSON.stringify(blocks, null, "    "));
            }
            //logger.log("Task complete. The latest tracking ID is " + course._latestTrackingId, 0);
        }

        function removeTrackingIds(options) {
            var course = JSON.parse(fs.readFileSync(options.coursePath));
            var blocks = JSON.parse(fs.readFileSync(options.blocksPath));

            for(var i = 0; i < blocks.length; i++) {
                delete blocks[i]._trackingId;
            }
            delete course._latestTrackingId;
            //logger.log("Tracking IDs removed.", 0);
            fs.writeFileSync(options.coursePath, JSON.stringify(course, null, "    "));
            fs.writeFileSync(options.blocksPath, JSON.stringify(blocks, null, "    "));
        }

        function resetTrackingIds(options) {
            options._latestTrackingId = -1;

            var course = JSON.parse(fs.readFileSync(options.coursePath));
            var blocks = JSON.parse(fs.readFileSync(options.blocksPath));
                
            for(var i = 0; i < blocks.length; i++) {
                var block = blocks[i];
                block._trackingId = ++options._latestTrackingId;
                //logger.log("Adding tracking ID: " + block._trackingId + " to block " + block._id, 1);
                options._latestTrackingId = block._trackingId;
            }
            course._latestTrackingId = options._latestTrackingId;
            //logger.log("The latest tracking ID is " + course._latestTrackingId, 0);
            fs.writeFileSync(options.coursePath, JSON.stringify(course, null, "    "));
            fs.writeFileSync(options.blocksPath, JSON.stringify(blocks, null, "    "));
        }
	}
	
}

module.exports = new Plugin();
