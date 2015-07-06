var Action = require("../lib/Action.js");

var techspec = new Action({

    initialize: function() {

        this.deps(GLOBAL, {
            "fsext": "../lib/fsext.js",
            "logger": "../lib/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "ffmpeg": "../actions/resources/ffmpeg.js"
        });

    },

    perform: function(options, done, started) { 
       
        started();

        ffmpeg.log = function(x) {
        	console.log(x);
        };
        
        if (options.root === undefined) options.root = "";

        options.src = fsext.replace(options.src, options);
        options.src = fsext.expand(options.src);

        if (options.logPath) logger.file(options.logPath, "", true);

        function log(text, type) {
            if (options.logPath) {
                logger.file(options.logPath, text, false);
            } else {
                logger.log(text, type);
            }
        }

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
                log(options.course + " -  Size: " + shortenedPath+" - " + suspects[i].flaggedProps.join(","), 2);                        
            }
        }
        
        done(options);

        function checkFile(file, options) {

        	var fpath = file.path.replace(/\\/g,"/");//"file:\\working\\tests\\rub\\devDevelop\\build\\course\\en\\video\\big_buck_bunny.ogv";

            ffmpeg({
            	arguments: ['-i'],
            	files: [
            		{
            			data: fs.readFileSync(file.path).toString(),
            			name: "file1"
            		}
            	]
            });


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

module.exports = techspec;

