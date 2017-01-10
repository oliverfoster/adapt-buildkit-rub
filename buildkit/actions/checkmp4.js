var Action = require("../libraries/Action.js");

var checkmp4 = new Action({

    initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "os": "os",
            "probe": "../actions/resources/ffprobe.js"
        });

    },

    perform: function(options, done, started) { 
       
        started();

        if (options.root === undefined) options.root = "";

        options.src = fsext.replace(options.src, options);
        options.src = fsext.expand(options.src);

        function log(text, type) {
            if (options.logPath) {
                logger.file(options.logPath, text, false);
            } else {
                logger.log(" " + text, type);
            }
        }

        if (!probe.isSupported()) {
            if (options.course) {
                log(options.course + " - TechSpec: " + "Cannot find video+audio information. Unsupported platform " + os.platform(), 1);
            } else {
                log("TechSpec: Cannot find video+audio information. Unsupported platform " + os.platform(), 1);
            }

            done(options);

            return;
        }

        var cwd = process.cwd();

        var list = fsext.glob(options.src, options.globs, { dirs: false });
        var totalChecking = list.length;
        var totalChecked = 0;
        var suspects = [];
        for (var i = 0, l = list.length; i < l; i++) {
            checkFile( list[i], options);
            
        }

        function checkCallback(file, options) {

            var extension = path.extname(file.path+"").substr(1); 
            var supported_id = options.switches.codecId;

            file.flaggedProps = [];

            if (supported_id != file.codec_id) {
                file.flaggedProps.push("video codec id: " + file.codec_id);
            }
            
            if (file.flaggedProps && file.flaggedProps.length > 0) {
                suspects.push(file);
            }

            totalChecked ++;
            if (totalChecking === totalChecked) {
                var failed = false;
                if (suspects.length > 0) {
                    failed = true;
                    for (var i = 0, l = suspects.length; i < l; i++) {
                        var shortenedPath = (suspects[i].path+"").substr(options.src.length+1).replace(/\\/g, "/");
                        if (options.course) {
                            logger.log(options.course + " - checkmp4: Failed [" + suspects[i].flaggedProps.join(", ") + "] "+ shortenedPath, 2);
                        } else {
                            logger.log("checkmp4: Failed [" + suspects[i].flaggedProps.join(", ") + "] " + shortenedPath, 2);
                        }
                    }
                }

                done(options);
            }
        }


        function checkFile(file, options) {

            var extension = path.extname(file.path+"").substr(1); 

            var async = false;          

            if (probe.isSupported()) {
                async = true;

                var track = file.path;
                probe(track, function(err, probeData) {

                    /*logger.log(file.path, 1);
                    for (var i in probeData.metadata) {
                        logger.log(i+"="+probeData.metadata[i], 1);
                    }*/

                    var video = pluckStream(probeData, "video");

                    if (video) {
                        file.codec_id = probeData.metadata.compatible_brands;
                    }

                    checkCallback(file, options);

                });
            }

            if (!async) checkCallback(file, options);
        }

        function pluckStream(probeData, codec_type) {
            if (!probeData) return undefined;
            return _.findWhere(probeData.streams, {codec_type:codec_type});
        }
    }
});

module.exports = checkmp4;