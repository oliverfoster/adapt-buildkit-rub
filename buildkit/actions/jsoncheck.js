var Action = require("../libraries/Action.js");

var jsoncheck = new Action({

    initialize: function() {

        this.deps(global, {
            "fsext": "../libraries/fsext.js",
            "logger": "../libraries/logger.js",
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

        var hasErrored = false;

        if (options.src.indexOf("**") || options.src.indexOf("*")) {
            //expand language folders
            var globIndex = options.src.indexOf("*");
            var base = options.src.slice(0, globIndex);
            var glob = options.src.slice(globIndex);
            var results = fsext.list(base).dirs;
            results = fsext.filter(results, glob);

            for (var i = 0, l = results.length; i < l; i++) {
                var expandedPath = results[i].path;
                var opts = _.deepExtend({}, options, {src:expandedPath});
                try {
                    check(opts);
                } catch(e) {
                    //logger.error(e);
                }
            }

        } else {
            try {
                check(options);
            } catch (e) {

            }
        }

        //if any error has occured, stop processing.
        if (hasErrored) {
            return done(options, 'Oops, looks like you have some json errors.')
        }

        done(options);

        function check(options) {

            var languagePath = options.src;

            var listOfCourseFiles = ['course', 'contentObjects', 'articles', 'blocks', 'components'];
            var listOfObjectTypes = ['course', 'menu', 'page', 'article', 'block', 'component' ];
                
            var courseItemObjects = [];

            // Go through each list of declared course files
            listOfCourseFiles.forEach(function(jsonFileName) {
                var currentJson = JSON.parse(fs.readFileSync(languagePath + '/' + jsonFileName + '.json'));
                
                //collect all course items in a single array
                switch (jsonFileName) {
                case "course":
                    //course file is a single courseItemObject
                    courseItemObjects.push(currentJson);
                    break;
                default:
                    //all other files are arrays of courseItemObjects
                    courseItemObjects = courseItemObjects.concat(currentJson);
                    break;
                }

            });

            //index and group the courseItemObjects
            var idIndex = _.indexBy(courseItemObjects, "_id");
            var idGroups = _.groupBy(courseItemObjects, "_id");
            var parentIdGroups = _.groupBy(courseItemObjects, "_parentId");

            //setup error collection arrays
            var orphanedIds = [];
            var emptyIds = [];
            var duplicateIds = [];
            var missingIds = [];

            for (var i = 0, l = courseItemObjects.length; i < l; i++) {
                var contentObject = courseItemObjects[i];
                var id = contentObject._id;
                var parentId = contentObject._parentId;
                var typeName = contentObject._type;
                var typeIndex = listOfObjectTypes.indexOf(typeName);

                var isRootType = typeIndex === 0;
                var isBranchType = typeIndex < listOfObjectTypes.length - 1;
                var isLeafType = !isRootType && !isBranchType;

                if (!isLeafType) { //(course, contentObjects, articles, blocks)
                    if (parentIdGroups[id] === undefined) emptyIds.push(id); //item has no children
                }

                if (!isRootType) { //(contentObjects, articles, blocks, components)
                    if (idGroups[id].length > 1) duplicateIds.push(id); //id has more than one item
                    if (!parentId || idIndex[parentId] === undefined) orphanedIds.push(id); //item has no defined parent id or the parent id doesn't exist
                    if (idIndex[parentId] === undefined) missingIds.push(parentId); //referenced parent item does not exist
                }

            }

            //output only unique entries
            orphanedIds = _.uniq(orphanedIds);
            emptyIds = _.uniq(emptyIds);
            duplicateIds = _.uniq(duplicateIds);
            missingIds = _.uniq(missingIds);

            //output for each type of error
            if (orphanedIds.length > 0) {
                hasErrored = true;
                logger.log('Orphaned _ids: ', 1);
            }

            if (missingIds.length > 0) {
                hasErrored = true;
                logger.log('Missing _ids: ' + missingIds,1);
            }

            if (emptyIds.length > 0) {
                hasErrored = true;
                logger.log('Empty _ids: ' + emptyIds,1);
            }

            if (duplicateIds.length > 0) {
                hasErrored = true;
                logger.log('Duplicate _ids: ' + duplicateIds, 1);
            }

            
            

        }

    }

});

module.exports = jsoncheck;

    