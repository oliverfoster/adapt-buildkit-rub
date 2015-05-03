var fsext = require("../utils/fsext.js");
var taskqueue = require("../utils/taskqueue.js");
var logger = require("../utils/logger.js");
var fs = require("fs");
var path = require("path");
var _ = require("underscore");
var hbs = require("handlebars");
var JSONLint = require("json-lint");

module.exports = {
    perform: function(options) {
        if (options.root === undefined) options.root = "";

        logger.runlog(options);

        options.src = hbs.compile(options.src)(options);
        options.src = fsext.relative(options.src);

        var list = fsext.glob(options.src, options.globs, { dirs: false });

        taskqueue.on("postProcessing", function() {
            taskqueue.add({"@name": "json", src: list }, function(opts, done) {
            
                for (var i = 0, l = opts.src.length; i < l; i++) {
                    var jsonstring = fs.readFileSync(opts.src[i]+"").toString();
                    var lint = JSONLint(jsonstring);
                    if (lint.error) {
                        logger.error("\nFile: " +opts.src[i]+ "\nError: " + lint.error + "\nLine: " + lint.line + "\nCharacter: " + lint.character+"\n");
                    }
                }
                
                done("json", opts);

            });
        });

    },
    reset: function() {
        
    }
};

    var checkJson = function(options, config) {
        var idRegExp;
        function check(options) {
            var listOfCourseFiles = ["course", "contentObjects", "articles", "blocks", "components"];
            var storedParentChildrenIds = {};
            var idFile = {};
            var storedIds = [];
            var storedFileParentIds = {};
            var storedFileIds = {};
            var hasOrphanedParentIds = false;
            var orphanedParentIds = [];
            var courseId;

            // method to check json ids
            function checkJsonIds() {
                console.log(chalk.white("" + options.courseOptions.course + " - Checking JSON..."));
                var currentCourseFolder;
                // Go through each course folder inside the src/course directory
                walkSync( options.jsonconfig.courseBasePath, function(subdirs) {
                    _.each(subdirs, function(subdir) {
                        var dir = path.join(options.jsonconfig.courseBasePath, subdir);
                        // Stored current path of folder - used later to read .json files
                        currentCourseFolder = dir;
                        storedParentChildrenIds = {};
                        // Go through each list of declared course files
                        listOfCourseFiles.forEach(function(jsonFileName) {
                            // Make sure course.json file is not searched
                            if (jsonFileName !== "course") {
                                
                                storedFileParentIds[jsonFileName] = [];
                                storedFileIds[jsonFileName] = [];
                                // Read each .json file
                                var currentJsonFile = JSON.parse(fs.readFileSync(currentCourseFolder + "/" + jsonFileName + ".json"));
                                currentJsonFile.forEach(function(item) {
                                    idFile[item._id] = jsonFileName;
                                    // Store _parentIds and _ids to be used by methods below
                                    if (!storedParentChildrenIds[item._parentId]) storedParentChildrenIds[item._parentId] = [];
                                    storedParentChildrenIds[item._parentId].push(item._id);
                                    if (item._type !== "component") {
                                        storedParentChildrenIds[item._id] = [];
                                    }
                                    storedFileParentIds[jsonFileName].push(item._parentId);
                                    storedFileIds[jsonFileName].push(item._id);
                                    storedIds.push(item._id);
                                });

                            } else {
                                var currentJsonFile = JSON.parse(fs.readFileSync(currentCourseFolder + "/" + jsonFileName + ".json"));

                                courseId = currentJsonFile._id
                            }
                            
                        });
                    });

                    checkIds();
                    
                    checkEachParentHasChildren();

                    checkDuplicateIds();

                    checkEachElementHasParentId();

                });
                
                //console.log(chalk.white("" + options.courseOptions.course + " - Finished Checking JSON."));

            }

            function checkIds () {
                var badIds = [];
                for (var i = 0, l = storedIds.length; i < l; i++) {
                    if (storedIds[i].match(idRegExp) === null) {
                        badIds.push(storedIds[i]);
                    }
                }
                if (badIds.length > 0) {
                    console.log(chalk.bgCyan("Unconventional IDs " + badIds));
                }
            }

            function checkEachParentHasChildren() {
                var emptyIds = [];
                for (var id in storedParentChildrenIds) {
                    if (storedParentChildrenIds[id].length === 0) {
                        emptyIds.push( idFile[id] + ": " + id );
                    }
                }
                if (emptyIds.length > 0) {
                    console.log(chalk.bgRed("Empty " + emptyIds));
                }
            }

            function checkDuplicateIds() {
                // Change _ids into an object of key value pairs that contains _ids as keys and a number count of same _ids
                var countIdsObject = _.countBy(storedIds);
                var hasDuplicateIds = false;
                var duplicateIds = [];
                _.each(countIdsObject, function(value, key) {
                    // Check value of each _ids is not more than 1
                    if (value > 1) {
                        hasDuplicateIds = true;
                        duplicateIds.push(key);
                    }
                });

                // Check if any duplicate _ids exist and return error
                if (hasDuplicateIds) {
                    console.log(chalk.bgRed("Duplicate ids " + duplicateIds));
                }
            }

            function checkIfOrphanedElementsExist(value, parentFileToCheck) {
                _.each(value, function(parentId) {
                    if (parentId === courseId) {
                        return;
                    }
                    if (_.indexOf(storedFileIds[parentFileToCheck], parentId) === -1) {
                        hasOrphanedParentIds = true;
                        orphanedParentIds.push(parentId);
                    }
                });
            }

            function checkEachElementHasParentId() {
                _.each(storedFileParentIds, function(value, key) {
                    switch(key){
                        case "contentObjects":
                            return checkIfOrphanedElementsExist(value, "contentObjects");
                        case "articles":
                            return checkIfOrphanedElementsExist(value, "contentObjects");
                        case "blocks":
                            return checkIfOrphanedElementsExist(value, "articles");
                        case "components":
                            return checkIfOrphanedElementsExist(value, "blocks");
                    }

                });

                if (hasOrphanedParentIds) {
                    console.log(chalk.bgRed("Orphaned objects " + orphanedParentIds));
                }
            }
            checkJsonIds();
        }

        
        var opts = _.extend({}, options, { jsonconfig: _.extend({}, options.jsonconfig) });
        opts.jsonconfig.courseBasePath = path.join(process.cwd(), config.buildGlobs.srcPath, stringReplace(opts.jsonconfig.courseBasePath, opts.courseOptions));
        idRegExp = new RegExp(opts.jsonconfig.idRegExp);
        check(opts);
            
    };