'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("action:run:schemadefaults", (options, start, end) => { this.onActionRun(options, start, end); });
	}

	onActionRun(options, start, end) {
		start();

        options.dest = Location.contextReplace(options.dest, options);
        options.dest = Location.toAbsolute(options.dest);

        if (options.dest.indexOf("**")) {
            //expand language folders
            var globIndex = options.dest.indexOf("**");
            var base = options.dest.slice(0, globIndex);
            var glob = options.dest.slice(globIndex);

            var tree = treecontext.Tree(base, ".");
            glob = Location.contextReplace(glob, options);
            var globs = new GlobCollection(glob, options.folderexclusions);
            var results = tree.mapGlobs(globs).files;

            //var results = fsext.glob(base, glob, {dirs:true, files:true});

            for (var i = 0, l = results.length; i < l; i++) {
                var expandedPath = results[i].location;
                var opts = _.deepExtend({}, options, {dest:expandedPath});
                schemadefaults(opts);
            }

        } else {

            schemadefaults(options);

        }

        function schemadefaults(options) {
            var srcPath = Location.toAbsolute(options.src);

            //list all plugin types
            var pluginTypes = [ "components", "extensions", "menu", "theme" ];
            //list authoring tool plugin categories
            var pluginCategories = [ "component", "extension", "menu", "theme" ];

            //setup defaults object
            var defaultsObject = { _globals: {} };
            var globalsObject = defaultsObject._globals;

            //iterate through plugin types
            _.each(pluginTypes, function(pluginType, pluginTypeIndex) {
                var pluginCategory = pluginCategories[pluginTypeIndex];

                var pluginPath = path.join(srcPath, pluginType);

                //exclude any path from the exclusionGlo
                var tree = treecontext.Tree(pluginPath, ".");
                if (!tree.populate()) return;

                var paths = tree.dirs;
                paths = _.pluck(paths, "relativeLocation");
                if (options.exclusionGlobs) {
                    var globs = Location.contextReplace(["**"].concat(options.exclusionGlobs), options);
                    paths = new GlobCollection(globs).filter(path);
                }

                //iterate through plugins in plugin type folder
                _.each(paths, function(currentPluginPath) {
                    var currentSchemaPath = currentPluginPath + "/" + "properties.schema";
                    var currentBowerPath = currentPluginPath + "/" + "bower.json";

                    if (!fs.existsSync(currentSchemaPath) || !fs.existsSync(currentBowerPath)) return;
                    
                    //read bower.json and properties.schema for current plugin
                    var currentSchemaJson = JSON.parse(fs.readFileSync(currentSchemaPath));
                    var currentBowerJson  = JSON.parse(fs.readFileSync(currentBowerPath));

                    if (!currentSchemaJson || ! currentBowerJson) return;

                    //get plugin name from schema
                    var currentPluginName = currentBowerJson[pluginCategory];

                    if (!currentPluginName || !currentSchemaJson.globals) return;

                    //iterate through schema globals attributes
                    _.each(currentSchemaJson.globals, function(item, attributeName) {
                        //translate schema attribute into globals object
                        var pluginTypeDefaults = globalsObject['_'+ pluginType] = globalsObject['_'+ pluginType] || {};
                        var pluginDefaults =  pluginTypeDefaults["_" + currentPluginName] = pluginTypeDefaults["_" + currentPluginName] || {};

                        pluginDefaults[attributeName] = item['default'];
                    });
                });

            });

            var currentCourseJson = JSON.parse(fs.readFileSync(options.dest));

            //read course json and overlay onto defaults object
            var modifiedCourseJson = _.deepExtend(defaultsObject, currentCourseJson);

            //write modified course json to build
            fs.writeFileSync(options.dest, JSON.stringify(modifiedCourseJson, null, "    "));

        }

        end();
	}
	
}

module.exports = Plugin;
