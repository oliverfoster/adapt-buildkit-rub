var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");

module.exports = {

    perform: function(options, done) {
        if (options.root === undefined) options.root = "";

        logger.runlog(options);
        options.root = hbs.compile(options.root)(options);
        options.root = fsext.relative(options.root);
        options.dest = hbs.compile(options.dest)(options);
        options.dest = fsext.relative(options.dest);

        var srcPath = path.join(options.root, options.src);

        if (fs.existsSync(srcPath)) {

            var list = fsext.glob(srcPath, options.globs);
            for (var i = 0, pathItem; pathItem = list[i++];) {
                var filePath = pathItem+"";
                var isSrcExists = fs.existsSync(filePath);
                var isDestExists = fs.existsSync(options.dest);
                if (isSrcExists && isDestExists) {
                   
                    var srcAsString = fs.readFileSync(filePath).toString();
                    var destAsString = fs.readFileSync(options.dest).toString();
                   
                    var srcAsJSON = JSON.parse(srcAsString);
                    var destAsJSON = JSON.parse(destAsString);

                    srcAsJSON = _.extend(destAsJSON, srcAsJSON)


                    fs.writeFileSync(options.dest, JSON.stringify(srcAsJSON, null, 4));

                }
            }
        }
        done(null, options);
    },

    reset: function() {
        
    }
    
};