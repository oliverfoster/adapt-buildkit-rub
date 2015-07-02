var Action = require("../utils/Action.js");

var jsoncheck = new Action({

    initialize: function() {

        Action.deps(GLOBAL, {
            "fsext": "../utils/fsext.js",
            "logger": "../utils/logger.js",
            "fs": "fs",
            "path": "path",
            "_": "underscore"
        });

    },
    
    perform: function(options, done, started) {

        started();

        options = options || {};
        options.src = fsext.replace(options.src, options);

        var idRegExp = new RegExp(options.validIdRegex || ".+");

        try {
            check(options);
        } catch(e) {
            logger.error(e);
        }

        done(options);

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
                var currentCourseFolder;
                // Go through each course folder inside the src/course directory
                var nodes = fsext.list( options.src );

                _.each(nodes.dirs, function(subdir) {
                    var dir = fsext.expand(subdir.toString());
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

                    console.log(storedIds);
        
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
                    logger.log("Unconventional IDs " + badIds);
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
                    logger.log("Empty " + emptyIds, 1);
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
                    logger.log("Duplicate ids " + duplicateIds, 1);
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
                    logger.log("Orphaned objects " + orphanedParentIds, 1);
                }
            }
            checkJsonIds();
        }

    }

});

module.exports = jsoncheck;

    