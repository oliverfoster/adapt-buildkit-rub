var Action = require("../utils/Action.js");

var assetsize = new Action({

    initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "imagesize": "image-size-big-max-buffer"
        });

    },

    perform: function(options, done, started) {
        started();
        
        if (options.root === undefined) options.root = "";

        options.src = fsext.replace(options.src, options);
        options.src = fsext.expand(options.src);

        var cwd = process.cwd();

        var list = fsext.glob(options.src, options.globs, { dirs: false });

        var suspects = [];
        for (var i = 0, l = list.length; i < l; i++) {
            var item = checkFile( list[i], options);
            if (item) suspects.push(item);
        }

        if (suspects.length > 0) {
            for (var i = 0, l = suspects.length; i < l; i++) {
                var shortenedPath = (suspects[i].path+"").substr(options.src.length);
                logger.log(options.course + " - " + shortenedPath+" - " + suspects[i].flaggedProps.join(","), 2);                        
            }
        }
        
        done(options);

        function checkFile(file, options) {
            var extension = path.extname(file.path+"").substr(1);

            switch ( extension ) {
            case "jpeg":
            case "gif":
            case "jpg":
            case "png":
                try {
                    var data = imagesize(file.path+"");
                    file.width = data.width;
                    file.height = data.height;
                } catch(e) {
                    file.flaggedProps = [
                        e
                    ];
                }
                break;
            case "mp4":
            case "mp3":
            case "ogv":
            case "ogg":
                file.width = 0;
                file.height = 0;
                break
            default:
                return;
            }

            var settings = options.extensions[extension];
            if(settings) {
                if((file.size/1024) > settings.size) {
                    if(!file.flaggedProps) file.flaggedProps = [];
                    file.flaggedProps.push("filesize:" + (Math.round((file.size/1024)/100)/10) + "mb");
                }
                else if(file.width > settings.width) {
                    if(!file.flaggedProps) file.flaggedProps = [];
                    file.flaggedProps.push("width:" + file.width + "px");
                }
                else if(file.height > settings.height) {
                    if(!file.flaggedProps) file.flaggedProps = [];
                    file.flaggedProps.push("height:" + file.height + "px");
                }
            }
            if (file.flaggedProps && file.flaggedProps.length > 0) return file;
            return;
        }

    }

});

module.exports = assetsize;