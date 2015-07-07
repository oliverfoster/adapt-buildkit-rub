var Action = require("../libraries/Action.js");

var combinejson = new Action({

    initialize: function() {

        this.deps(GLOBAL, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
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

            var globs = [].concat(options.globs);
            if (options.exclusionGlobs) {
                globs = globs.concat(options.exclusionGlobs);
            }

            var list = fsext.glob(srcPath, globs);
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