var requirejs = require('requirejs');
var fsext = require("../utils/fsext");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var path = require("path");
var fs = require("fs");
var hbs = require("handlebars");
var sourcemapext = require("../utils/sourcemapext.js");
var _ = require("underscore");

var defaults = {
    optimize: "uglify2",
    generateSourceMaps: true,
    preserveLicenseComments: false,
    useSourceUrl: false
};


var outputCache = {};
var waitingNonDynamics = {};

module.exports = {

    perform: function(options, done) {
        options = _.extend({}, defaults, options);

        options.dest = hbs.compile(options.dest)(options);
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
                return done(null, options);
            }
        }

        if (fs.existsSync(options.dest)) fs.unlinkSync(options.dest);
        if (fs.existsSync(options.dest+".map")) fs.unlinkSync(options.dest+".map");

        if (options['@buildOnce'] === true) {
            if (outputCache[options["@name"]]) {
                
                fsext.mkdirp({dest:path.dirname(options.dest)});
                fs.writeFileSync(fsext.relative(options.dest), outputCache[options["@name"]]);
                return done(null, options);
            } else {
                if (waitingNonDynamics[options["@name"]]) {
                    
                    waitingNonDynamics[options["@name"]].push(options);
                    return done(null, options);
                } else {
                    waitingNonDynamics[options["@name"]] = [];
                }
            }
        }
        logger.runlog(options);

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

        requirejs.optimize(options, function (buildResponse) {
            try {
                if (options.sourceMapRelocate && options.generateSourceMaps) sourcemapext.relocate(options.dest + ".map", options.sourceMapRelocate);

                if (options['@buildOnce']) {
                    if (options.generateSourceMaps) {
                        outputCache[ options['@name'] ] = {
                            javascript: fs.readFileSync(options.dest),
                            sourcemap: fs.readFileSync(options.dest + ".map")
                        };
                    } else {
                        outputCache[ options['@name'] ] = {
                            javascript: fs.readFileSync(options.dest)
                        };
                    }

                    if ( waitingNonDynamics[options["@name"]] ) {
                        var queue =  waitingNonDynamics[options["@name"]];
                        for (var i = 0, l = queue.length; i < l; i++) {
                            var item = queue[i];

                            fsext.mkdirp({dest:path.dirname(item.dest)});
                            if (options.generateSourceMaps) {
                                 fs.writeFileSync(fsext.relative(item.dest) + ".map", outputCache[options["@name"]].sourcemap );
                            }
                            fs.writeFileSync(fsext.relative(item.dest), outputCache[options["@name"]].javascript );
                        }
                    }
                    
                }
            } catch(e) {
                console.log(e);
            }

            done(null, options);

        }, function(error) {
            done(error, options);
        });
        
    },

    reset: function() {
        outputCache = {};
        waitingNonDynamics = {};
    }
    
};


