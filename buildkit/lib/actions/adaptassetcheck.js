    var checkAssets = function(options, config) {        
        var assetRegExp;
        function check(options) {
            var listOfCourseFiles = ["course", "contentObjects", "articles", "blocks", "components"];
            var assetListPaths = [];

            // method to check json ids
            function checkAssetsExists() {
                console.log(chalk.white("" + options.courseOptions.course + " - Checking Assets..."));
                var currentCourseFolder;
                // Go through each course folder inside the src/course directory
                walkSync( options.assetcheckconfig.courseBasePath, function(subdirs) {
                    _.each(subdirs, function(subdir) {
                        var dir = path.join(options.assetcheckconfig.courseBasePath, subdir);
                        // Stored current path of folder - used later to read .json files
                        var currentCourseFolder = dir;
                        // Go through each list of declared course files
                        listOfCourseFiles.forEach(function(jsonFileName) {
                            // Make sure course.json file is not searched
                                                            
                            assetListPaths[jsonFileName] = [];
                            // Read each .json file
                            var currentJsonFile = ""+ fs.readFileSync(currentCourseFolder + "/" + jsonFileName + ".json");
                            var matches = currentJsonFile.match(assetRegExp);
                            matches = _.uniq(matches);
                            if (matches === null) return;
                            for (var i = 0, l = matches.length; i < l; i++) {
                                switch (matches[i].substr(0,2)) {
                                case "\\'": case '\\"':
                                    matches[i] = matches[i].substr(2);
                                }
                                switch (matches[i].substr(matches[i].length-2,2)) {
                                case "\\'": case '\\"':
                                    matches[i] = matches[i].substr(0, matches[i].length-2);
                                }
                                switch (matches[i].substr(0,1)) {
                                case "'": case '"':
                                    matches[i] = matches[i].substr(1);
                                }
                                switch (matches[i].substr(matches[i].length-1,1)) {
                                case "'": case '"':
                                    matches[i] = matches[i].substr(0, matches[i].length-1);
                                }
                                assetListPaths.push(matches[i]);

                                var filePath = path.join(opts.assetcheckconfig.courseDestPath, matches[i]);
                                if (!fs.existsSync( filePath )  && matches[i].substr(0,4) != "data") {
                                    var outputpath = path.join(opts.assetcheckconfig.courseDestPath,  "course", subdir, jsonFileName + ".json");
                                    currentJsonFile = currentJsonFile.replace(matches[i], missingImage({resourceUri:matches[i]}) );
                                    fs.writeFileSync(outputpath, currentJsonFile);
                                }

                            }

                        });
                    });
                });
                assetListPaths = _.uniq(assetListPaths);

                for (var i = 0, l = assetListPaths.length; i < l; i++ ){
                    if (assetListPaths[i].substr(0,4) === "http") {
                        console.log(chalk.bgCyan("" + options.courseOptions.course + " - External: ", assetListPaths[i]))
                        continue;
                    }
                    var filePath = path.join(opts.assetcheckconfig.courseDestPath, assetListPaths[i]);
                    if (!fs.existsSync( filePath )) {
                        console.log(chalk.bgRed("" + options.courseOptions.course + " - Missing: ", assetListPaths[i]))
                    }
                }                
                //console.log(chalk.white("" + options.courseOptions.course + " - Finished Checking Assets."));

            }

            checkAssetsExists();
        }

        
        var opts = _.extend({}, options, { assetcheckconfig: _.extend({}, options.assetcheckconfig) });
        opts.assetcheckconfig.courseBasePath = path.join(process.cwd(), config.buildGlobs.srcPath, stringReplace(opts.jsonconfig.courseBasePath, opts.courseOptions));
        opts.assetcheckconfig.courseDestPath = path.join(process.cwd(), stringReplace(opts.assetcheckconfig.courseDestPath, opts.courseOptions));
        var missingImage = hbs.compile(opts.assetcheckconfig.missingImage);
        assetRegExp = new RegExp(opts.assetcheckconfig.assetRegExp, "g");
        check(opts);
            
    };