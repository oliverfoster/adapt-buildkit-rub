var Action = require("../utils/Action.js");

var javascript = new Action({
    _outputCache: {},
    _waitingForBuildOnce: {},

    initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore",
            "requirejs": "requirejs",
            "sourcemaps": "../utils/sourcemaps.js"
        });

    },

    perform: function(options, done, started) {
        
        options = options || {};

        options.dest = fsext.replace(options.dest, options);

        if (options.dest) options.out = options.dest;

        if (fs.existsSync(options.dest) && options.switches.force !== true) {
            var files = fsext.glob(options.src, options.globs);
            var destStat = fs.statSync(options.dest);
            var changed = false;
            for (var i = 0, l = files.length; i < l; i++) {
                if (files[i].mtime > destStat.mtime || files[i].ctime > destStat.mtime) {
                    changed = true;
                    break;
                }
            }

            var mapExists = false;
            if (fs.existsSync(options.dest + ".map")  ) {
                mapExists = true;
            } 
            changed = (mapExists == (!options.switches.debug)) || changed;

            
            if (!changed) {
                return done(options);
            }
        }

        if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
        if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

        if (options['@buildOnce'] === true) {
            if (this._outputCache[options["@name"]]) {
                
                fsext.mkdir(path.dirname(options.dest));
                fs.writeFileSync(fsext.expand(options.dest), this._outputCache[options["@name"]].javascript);
                if (this._outputCache[options['@name']].sourcemap) {
                    fs.writeFileSync(fsext.expand(options.dest)+".map", this._outputCache[options["@name"]].sourcemap);
                }
                return done(options);
            } else {
                if (this._waitingForBuildOnce[options["@name"]]) {
                    
                    this._waitingForBuildOnce[options["@name"]].push(options);
                    return done(options);
                } else {
                    this._waitingForBuildOnce[options["@name"]] = [];
                }
            }
        }

        started();

        if (!options.paths) options.paths = {};

        if (options.includes) {
            var cwd = path.join(process.cwd(), options.baseUrl);
            var rootName = options.name;
            options.shim = options.shim || {};
            options.shim[rootName] = options.shim[rootName] || {};
            options.shim[rootName]['deps'] = options.shim[rootName]['deps'] || [];

            for (var prefix in options.includes) {
                for (var atPath in options.includes[prefix]) {
                    var files = fsext.glob( atPath, options.includes[prefix][atPath] );

                    for (var f = 0, fl = files.length; f < fl; f++) {
                        var relativePath = files[f].path.substr( cwd.length );
                        if (relativePath.substr(0,1)) relativePath = relativePath.substr(1);

                        var ext = path.extname(relativePath);
                    
                        relativePath = relativePath.slice(0, -ext.length);
                        
                        var moduleName = (prefix != "*" ? prefix+"/" : "") + files[f].filename;
                        options.paths[moduleName] = options.paths[moduleName] || relativePath;

                        options.shim[rootName]['deps'].push(moduleName);
                    }
                }
            }
            
        }

        if (options.empties) {
            for (var prefix in options.empties) {
                for (var atPath in options.empties[prefix]) {
                    var files = fsext.glob( atPath, options.empties[prefix][atPath] );
                    for (var f = 0, fl = files.length; f < fl; f++) {
                        options.paths[(prefix != "*" ? prefix+"/" : "")+files[f].filename] = options.paths[(prefix != "*" ? prefix+"/" : "")+files[f].filename] || "empty:";
                    }
                }
            }
           
        }


        switch (options.switches.debug) {
        case true:
            options.generateSourceMaps = !options.switches.quick;
            options.optimize = "none";
            break;
        default:
            options.generateSourceMaps = false;
            options.optimize = !options.switches.quick ? "uglify2" : "none";
            break;
        } 

        requirejs.optimize(options, _.bind(function (buildResponse) {
            try {
                if (options.sourceMapRelocate && options.generateSourceMaps) sourcemaps.relocate(options.dest + ".map", options.sourceMapRelocate);

                if (options['@buildOnce']) {
                    if (options.generateSourceMaps) {
                        this._outputCache[ options['@name'] ] = {
                            javascript: fs.readFileSync(options.dest),
                            sourcemap: fs.readFileSync(options.dest + ".map")
                        };
                    } else {
                        this._outputCache[ options['@name'] ] = {
                            javascript: fs.readFileSync(options.dest)
                        };
                    }

                    if ( this._waitingForBuildOnce[options["@name"]] ) {
                        var queue =  this._waitingForBuildOnce[options["@name"]];
                        for (var i = 0, l = queue.length; i < l; i++) {
                            var item = queue[i];

                            fsext.mkdir(path.dirname(item.dest));
                            if (options.generateSourceMaps) {
                                 fs.writeFileSync(fsext.expand(item.dest) + ".map", this._outputCache[options["@name"]].sourcemap );
                            }
                            fs.writeFileSync(fsext.expand(item.dest), this._outputCache[options["@name"]].javascript );
                        }
                    }
                    
                }

            } catch(e) {

                console.log("requirejs.optimize: ", e);
            }

            done(options);

        }, this), function(error) {
            done(options, error);
        });
        
    },

    reset: function() {
        this._outputCache = {};
        this._waitingForBuildOnce = {};
    }
    
});

module.exports = javascript;


