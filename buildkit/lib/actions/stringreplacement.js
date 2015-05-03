var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");

module.exports = {
	perform: function(options) {
		if (options.root === undefined) options.root = "";

		logger.runlog(options);

		options.root = hbs.compile(options.root)(options);
		options.root = fsext.relative(options.root);
		options.dest = hbs.compile(options.dest)(options);
		options.dest = fsext.relative(options.dest);

		var srcPath = path.join(options.root, options.src);

		var list = fsext.glob(srcPath, options.globs);

		var destList = fsext.glob(fsext.relative(options.dest), options.diffGlobs);

		for (var d = destList.length -1, dl = -1; d > dl; d--) {
			var destItem = destList[d];
			var shortenedPathDest = (destItem.path).substr( options.dest.length  );
			var found = false;
			for (var i = 0, l = list.length; i < l; i ++) {
				var srcItem = list[i];
				var shortenedPathSrc = (srcItem.path).substr( (srcItem.path).indexOf(options.on) + options.on.length  );
				if (shortenedPathDest == shortenedPathSrc) {
					found = true;
					break;
				}
			}
			if (!found) {
				logger.log("Removing: " + destItem.path.substr(process.cwd().length), 1);
				if (destItem.dir) {
					fs.rmdirSync(destItem.path);
				} else {
					fs.unlinkSync(destItem.path);
				}
			}
		}


		for (var i = 0, l = list.length; i < l; i ++) {
			var item = list[i];
			var shortenedPath = (item.path).substr( (item.path).indexOf(options.on) + options.on.length  );
			var outputPath = path.join(options.dest, shortenedPath);

			if (item.dir) {
				fsext.mkdirp({ dest: outputPath });
			} else {
				var dirname = path.dirname(outputPath);
				fsext.mkdirp({ dest: dirname });

				var ifExists = fs.existsSync(outputPath);

				if (ifExists && options.force !== true) {
					var outputStat = fs.statSync(outputPath);
					if (outputStat.mtime >= item.mtime) continue;
				} 
				if (!ifExists) {
					logger.log("Adding: " + outputPath.substr(process.cwd().length),1);
				} else {
					fs.unlinkSync(outputPath);
				}
				taskqueue.add({"@name": "collate", src: item.path, dest:outputPath }, function perform(opts, done) {
					var readStream = fs.createReadStream(opts.src)

					readStream.pipe(fs.createWriteStream(opts.dest));

					readStream.on("end", function() {
						done("collate", opts);
					});


				});
			}
			
		}
	},
	reset: function() {
		
	}
};

var stringReplacement = function(options, config) {
        console.log(chalk.white("" + options.courseOptions.course + " - String replacement..."));
        var q = Q.defer();
        var config = {
            globs: config.buildGlobs,
            gulp: { base: config.buildGlobs.srcPath, cwd: config.buildGlobs.srcPath}
        };

        var performStringReplacements = function(sconfig, options, config, done) {

            var firstConfig;
            var context = stringReplace(sconfig.context, options.courseOptions);
            gulp.src(context, config.gulp)
                .pipe(tap(function(file){
                    if (firstConfig === undefined) firstConfig = file.contents.toString();
                }))
                .on("end", function() {
                    if (firstConfig === undefined) return done();

                    var JSONContext = JSON.parse(firstConfig);

                    var src = stringReplace(sconfig.src, options.courseOptions);
                    var dest  = stringReplace(sconfig.dest, options.courseOptions);
                    gulp.src(src, config.gulp)
                        .pipe(tap(function(file){
                            var temp = file.contents.toString();
                            file.contents = new Buffer(hbs.compile(temp)(JSONContext));
                        }))
                        .pipe(collate(sconfig.collateTo))
                        .pipe(gulp.dest(dest))
                        .on("end", function() {
                            done();
                        });

                });
        };

        var stringreplacementconfig = options.stringreplacementconfig;

        var doneCount = 0;
        function done() {
            doneCount++;
            if (doneCount == stringreplacementconfig.length) {
                q.resolve();
            }
        }

        for (var i = 0, l = stringreplacementconfig.length; i < l; i++) {
            performStringReplacements(stringreplacementconfig[i], options, config, done);
        }

        return q.promise;

    };