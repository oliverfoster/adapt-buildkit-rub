var fsext = require("../utils/fsext");
var logger = require("../utils/logger.js");
var path = require("path");
var fs = require("fs");
var _ = require("underscore");
var hbs = require("handlebars");

var defaults = {
		
	};


module.exports = {
	perform: function(options, done) {
		options = _.extend({}, defaults, options);

		logger.runlog(options);

		options.coursePath.src = hbs.compile(options.coursePath.src)(options);
		options.blocksPath.src = hbs.compile(options.blocksPath.src)(options);

		options.coursePath = fsext.glob(options.coursePath.src, options.coursePath.glob)[0].path;
		options.blocksPath = fsext.glob(options.blocksPath.src, options.blocksPath.glob)[0].path;


		if (options.switches.trackinginsert) {
			insertTrackingIds(options);
		} else if (options.switches.trackingdelete) {
			removeTrackingIds(options);
		} else if (options.switches.trackingreset) {
			resetTrackingIds(options);
		}

        done(null, options);

	},
	reset: function() {

	}
};

var insertTrackingIds = function (options) {
    var course = JSON.parse(fs.readFileSync(options.coursePath));
    var blocks = JSON.parse(fs.readFileSync(options.blocksPath));

    options._latestTrackingId = course._latestTrackingId || -1;
    options._trackingIdsSeen = [];
    
    for(var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        if(block._trackingId === undefined) {
            block._trackingId = ++options._latestTrackingId;
            logger.log("Adding tracking ID: " + block._trackingId + " to block " + block._id, 1);
        } else {
            if(options._trackingIdsSeen.indexOf(block._trackingId) > -1) {
                logger.log(chalk.bgRed("Warning: " + block._id + " has the tracking ID " + block._trackingId + ", but this is already in use. Changing to " + (options._latestTrackingId + 1) + "."));
                block._trackingId = ++options._latestTrackingId;
            } else {
            	logger.log("Found tracking ID: " + block._trackingId + " on block " + block._id, 0);
                options._trackingIdsSeen.push(block._trackingId);
            }
        }
        if(options._latestTrackingId < block._trackingId) {
            options._latestTrackingId = block._trackingId;
        }
            
    }
    course._latestTrackingId = options._latestTrackingId;
    logger.log("Task complete. The latest tracking ID is " + course._latestTrackingId,1);
    fs.writeFileSync(options.coursePath, JSON.stringify(course, null, "    "));
    fs.writeFileSync(options.blocksPath, JSON.stringify(blocks, null, "    "));
};

var removeTrackingIds = function (options) {
    var course = JSON.parse(fs.readFileSync(options.coursePath));
    var blocks = JSON.parse(fs.readFileSync(options.blocksPath));

    for(var i = 0; i < blocks.length; i++) {
        delete blocks[i]._trackingId;
    }
    delete course._latestTrackingId;
    logger.log("Tracking IDs removed.", 1);
    fs.writeFileSync(options.coursePath, JSON.stringify(course, null, "    "));
    fs.writeFileSync(options.blocksPath, JSON.stringify(blocks, null, "    "));
};

var resetTrackingIds = function (options) {
    options._latestTrackingId = -1;

    var course = JSON.parse(fs.readFileSync(options.coursePath));
    var blocks = JSON.parse(fs.readFileSync(options.blocksPath));
        
    for(var i = 0; i < blocks.length; i++) {
        var block = blocks[i];
        block._trackingId = ++options._latestTrackingId;
        logger.log("Adding tracking ID: " + block._trackingId + " to block " + block._id, 1);
        options._latestTrackingId = block._trackingId;
    }
    course._latestTrackingId = options._latestTrackingId;
    logger.log("The latest tracking ID is " + course._latestTrackingId, 1);
    fs.writeFileSync(options.coursePath, JSON.stringify(course, null, "    "));
    fs.writeFileSync(options.blocksPath, JSON.stringify(blocks, null, "    "));
};


