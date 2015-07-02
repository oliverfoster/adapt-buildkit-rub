var Action = require("../utils/Action.js");

var combinejson = new Action({

    initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore"
        });

    },

    perform: function(options, done, started) {
        started();
        
        if (options.root === undefined) options.root = "";

        options.root = fsext.replace(options.root, options);
        options.root = fsext.expand(options.root);
        options.dest = fsext.replace(options.dest, options);
        options.dest = fsext.expand(options.dest);

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
        done(options);
    }

});

module.exports = combinejson;