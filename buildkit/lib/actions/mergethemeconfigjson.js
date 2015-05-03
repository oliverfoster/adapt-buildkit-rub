 var configThemeJSON = function(options, config) {
        var q = Q.defer();
        console.log(chalk.white("" + options.courseOptions.course + " - Merging Theme JSON..."));
        var themeJsonFile = '';

        var themeBasePath = path.join(process.cwd(), config.buildGlobs.srcPath, stringReplace(options.themejsonconfig.themeBasePath, options.courseOptions));
        // As any theme folder may be used, we need to first find the location of the
        // theme.json file
        walkSync( themeBasePath, function (subdirs) {
            if (subdirs.length > 1) throw "More than one theme installed";
            if (subdirs.length === 0) throw "No theme installed";

            var themeJsonFile = path.join(themeBasePath, subdirs[0], "theme.json") 

            if (!fs.existsSync(themeJsonFile)) {
                throw "Unable to locate theme.json, please ensure a valid theme exists";
            }

            var courseBasePath = path.join(process.cwd(), config.buildGlobs.srcPath, stringReplace(options.themejsonconfig.courseBasePath, options.courseOptions));

            var configJson = JSON.parse(fs.readFileSync( path.join(courseBasePath, "config.json")) );
            var themeJson = JSON.parse(fs.readFileSync( themeJsonFile ));

            // This effectively combines the JSON   
            for (var prop in themeJson) {           
                configJson[prop] = themeJson[prop];
            }

            var outputConfigPath = path.join(process.cwd(), stringReplace(options.themejsonconfig.outputConfigPath, options.courseOptions), "config.json");
            fs.writeFile( outputConfigPath, JSON.stringify(configJson, null, "\t"), function() {
                q.resolve();    
            });
        });

        //console.log(chalk.white("" + options.courseOptions.course + " - Finished Theme JSON."));
        return q.promise;
    };
