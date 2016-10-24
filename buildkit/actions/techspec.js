var Action = require("../libraries/Action.js");

var techspec = new Action({

    initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "os": "os",
            "probe": "../actions/resources/ffprobe.js",
            "imagesize": "image-size-big-max-buffer"
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
        var totalSize = 0;
        var suspects = [];
        for (var i = 0, l = list.length; i < l; i++) {
            checkFile( list[i], options);
            
        }

        function checkCallback(file, options) {

            var extension = path.extname(file.path+"").substr(1); 

            totalSize += file.size;

            if ( options.techspec.fileSize && file.size > textSizeToBytes(options.techspec.fileSize)) {
                file.flaggedProps.push("max filesize: " + bytesSizeToString(file.size, "MB"));
            } 

            if (options.techspec.restrictedExtensions) {
                if (options.techspec.restrictedExtensions.indexOf(extension) > -1) {
                    file.flaggedProps.push("extension:" + extension);           
                }
            }
            
            if (options.techspec.extensions && options.techspec.extensions[extension]) {
                var settings = options.techspec.extensions[extension];
                
                file.flaggedProps = [];
                
                if ( file.size > textSizeToBytes(settings.size)) {
                    file.flaggedProps.push("filesize: " + bytesSizeToString(file.size, "KB"));
                } 
                
                if (file.width && settings.width && file.width > settings.width) {
                    file.flaggedProps.push("width: " + file.width + "px");
                } 
                if (file.height && settings.height && file.height > settings.height) {
                    file.flaggedProps.push("height: " + file.height + "px");
                } 
                if (file.ratio && settings.ratio && Math.round(file.ratio*10) != Math.round(eval(settings.ratio)*10)) {
                    file.flaggedProps.push("ratio: " + file.ratio);
                } 
                if (file.audio_bitrate && settings.audio_bitrate && file.audio_bitrate > textSizeToBytes(settings.audio_bitrate) && file.audio_bitrate !== "N/A") {
                    file.flaggedProps.push("audio bitrate: " + bytesSizeToString(file.audio_bitrate, "kb") + "/s");
                } 
                if (file.audio_channel_layout && settings.audio_channel_layout && file.audio_channel_layout !== settings.audio_channel_layout && file.audio_channel_layout !== "N/A") {
                    file.flaggedProps.push("audio channels: " + file.audio_channel_layout);
                } 
                if (file.video_bitrate && settings.video_bitrate && file.video_bitrate > textSizeToBytes(settings.video_bitrate) && file.video_bitrate !== "N/A") {
                    file.flaggedProps.push("video bitrate: " + bytesSizeToString(file.video_bitrate, "kb") + "/s");
                } 
                if (settings.video_fps && file.video_fps && file.video_fps > settings.video_fps && file.video_fps !== "N/A") {
                    file.flaggedProps.push("video fps: " + file.video_fps);
                }
                if (settings.video_codec) {
                    if (settings.video_codec instanceof Array) {
                        if (settings.video_codec.indexOf(file.video_codec) == -1) {
                            file.flaggedProps.push("video codec: " + file.video_codec);         
                        }
                    } else {
                        if (settings.video_codec != file.video_codec) {
                            file.flaggedProps.push("video codec: " + file.video_codec);         
                        }
                    }
                }
                if (settings.audio_codec) {
                    if (settings.audio_codec instanceof Array) {
                        if (settings.audio_codec.indexOf(file.audio_codec) == -1) {
                            file.flaggedProps.push("audio codec: " + file.audio_codec);         
                        }
                    } else {
                        if (settings.audio_codec != file.audio_codec) {
                            file.flaggedProps.push("audio codec: " + file.audio_codec);         
                        }
                    }
                }
                
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
                            log(options.course + " - TechSpec: Failed [" + suspects[i].flaggedProps.join(", ") + "] "+ shortenedPath, 2);
                        } else {
                            log("TechSpec: Failed [" + suspects[i].flaggedProps.join(", ") + "] " + shortenedPath, 2);
                        }
                    }
                }

                if (options.techspec.totalSize) {
                    if (totalSize > textSizeToBytes(options.techspec.totalSize)) {
                        failed = true;
                        if (options.course) {
                            log(options.course + " - TechSpec: Failed Total Size " + bytesSizeToString(totalSize, "MB"), 2);                        
                        } else {
                            log("TechSpec: Failed Total Size " + bytesSizeToString(totalSize, "MB"), 2);                        
                        }
                    }
                }

                if (failed) {
                    if (options.course) {
                        logger.log(options.course + " - TechSpec: Please check log file", 1); 
                    } else {
                        logger.log("TechSpec: Please check log file", 1); 
                    }
                }

                done(options);
            }
        }


        function checkFile(file, options) {

            var extension = path.extname(file.path+"").substr(1); 

            var async = false;          

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
                if (probe.isSupported()) {
                    async = true;

                    file.width = 0;
                    file.height = 0;

                    var track = file.path;
                    probe(track, function(err, probeData) {

                        var video = pluckStream(probeData, "video");
                        var audio = pluckStream(probeData, "audio");

                        if (video) {
                            file.width = video.width;
                            file.height = video.height;
                            file.ratio = file.width / file.height;
                            if (video.bit_rate !== "N/A") {
                                file.video_bitrate = video.bit_rate;
                            }
                            if (video.r_frame_rate.indexOf("/")) {
                                file.video_fps = eval(video.r_frame_rate);
                            } else if (video.avg_frame_rate.indexOf("/")) {
                                file.video_fps = eval(video.avg_frame_rate);
                            }
                            file.video_codec = video.codec_name;
                        } 

                        if (audio) {
                            file.audio_bitrate = audio.bit_rate;
                            if (audio.bit_rate !== "N/A") {
                                file.audio_bitrate = audio.bit_rate;
                            }
                            file.audio_codec = audio.codec_name;
                            file.audio_channel_layout = audio.channel_layout
                        }

                        checkCallback(file, options);

                    });
                    break
                } else {
                    file.width = 0;
                    file.height = 0;
                }
            }


            if (!async) checkCallback(file, options);
        }

        function pluckStream(probeData, codec_type) {
            if (!probeData) return undefined;
            return _.findWhere(probeData.streams, {codec_type:codec_type});
        }

        function textSizeToBytes(str) {
            str = (str+"");
            var sizes = [ "b", "kb", "mb", "gb" ];
            var sizeIndex = 0;
            var lcStr = str.toLowerCase();
            for (var i = sizes.length - 1, l = -1; i > l; i--) {
                if (lcStr.indexOf(sizes[i]) != -1) {
                    sizeIndex = i;
                    break;
                }
            }

            var multiplier = (str.indexOf("B") > -1) ? 1024 : 1000;

            var num = parseInt(str);

            var rtn = num * Math.pow(multiplier, sizeIndex);

            return rtn;
        }

        function bytesSizeToString(number, size) {
            
            var sizes = [ "b", "kb", "mb", "gb" ];
            var sizeIndex = sizes.indexOf(size.toLowerCase());
            var multiplier = (size.indexOf("B") > -1) ? 1024 : 1000;
            if (sizeIndex == -1) sizeIndex = 0;

            var rtn = (Math.round( (number/ Math.pow(multiplier, sizeIndex) ) * 100) / 100) + size;

            return rtn;

        }

    }
    
});

module.exports = techspec;

