# adapt-buildkit-rub
(Rapid-Unified-Builder)  
Native Buildkit (alternative to grunt)

##Installation / Update / Repair

Please make sure [adapt-buildkits](https://github.com/cgkineo/adapt-buildkits) is installed.

Run this command in your build folder:
```
adapt-buildkit install rub
```

##Usage

```

  Usage: ./rub [options] [courses...]

  Options:

    -h, --help        output usage information
    -V, --version     output the version number
    -b, --build       build courses (default)
    -W, --wait        wait for keypress at end
    --trackinginsert  inserts tracking ids (assumes: not -b)
    --trackingdelete  delete tracking ids (assumes: not -b)
    --trackingreset   resets tracking ids (assumes: not -b)
    -w, --watch       watch for changes (assumes: -b)
    -d, --debug       no minification, produce sourcemaps (assumes: -b)
    -f, --force       force rebuild (assumes: -b)
    -F, --forceall    force rebuild and resync (assumes: -b)
    -s, --server      run server (assumes: -bw --port 3001)
    --port [value]    set server port
    -q, --quick       skip minification and sourcemapping (assumes: -b)
    -c, --clean       clean build folder (assumes: not -b)
    -z, --zip         create sco zips (assumes: -b)


```

Rub also support legacy style commands:

```

    These commands are synonymous

    
    ./rub dev p101
    ./rub -dw p101


    ./rub build p101
    ./rub p101


    ./rub watch p101
    ./rub -w p101


```

#Advantages

###Node native
None of the modules used in this buildkit require compilation for different operating systems. You can transport the buildkit to different systems without having to run extra 'npm install' commands.

###Inbuilt task manager
Rather than using gulp / grunt as a task runner, the buildkit has its own custom task runner. There is much finer granularity over tasks (asynchronous or synchronous) they are divided into five major subsections - "prep", "build", "clean", "finish" and "package". 
 
All tracking changes, json linting, javascript bundling and cleaning are performed in the "prep" subsection, all file synchronisation and compilation happen in the "build" subsection, schema defaults and string replacement happen in the "clean" subsection, in the "finish" subsection comes asset checking, javascript minification and json checking, SCO zips are made in the "package" subsection.  
  
Having a custom task runner is useful for throttling task execution to accomodate OSX open-file limits and system resource utilizations across systems.  
  
The inbuilt task manager has a plugin-style architecture making adding new build tasks as simple as possible. Each task and associated configuration are separate.

###Reduced footprint
As there are few third-party libraries and no compiled libraries this buildkit contains more functionality in a smaller space.

Adapt Learning's gruntfile: ~90mb installed (including node_modules)  
Rub Buildkit: ~110mb installed (1mb, plus node_modules ~15mb, plus [ffprobe](https://www.ffmpeg.org/download.html) for linux, mac and windows ~96mb)

###Builds only when necessary
As the tasks and taskrunner in the buildkit are custom written it can access if the source was updated and needs the build updating. A second run of the buildkit on an unchanged course will be much faster than when using grunt. A second run on a changed course will rebuild only the necessary bits. The build divisions are "core", "libraries", "plugins", "less", "handlebars", "json", "assets", "fonts", "required" (+ a few others), each can be built independently.

###Support for different project structures
The buildkit can compile three types of project folder structure:

Standard Adapt Learning, single course structure, where all your JSON and assets are stored in ``src/course`` and built to the ``build`` folder.  

Kineo's multiple courses from the same src structure - where all your JSON and assets are stored in subfolders of ``src/courses/`` and built to subfolders of a ``builds`` folder, such as ``src/courses/p101``, ``src/courses/m05`` etc.  

Builds only. Instead of having course assets in the src **and** build folders, it is possible to have just the core code, theme, menu(s), components and extensions in the ``src`` folder and keeping the JSON and assets in the builds/*courseid*/course/ folder only - this halves the storage requirements and removes the requirement to run a task every time the JSON or assets are changed.

###Improved compatibility
It will work with Adapt Learning's v1.1.1 and v2 frameworks, as well as Kineo's interim framework.  
It allows the three types of src content structure to be used regardless of the underlying framework.  
It backports dynamic jquery selection to v1.1.1

###JSON linting and LESS sourcemaps
For Adapt Framework and the buildkit configurations.

###Course asset checking
It is possible to define video and audio codec, bitrate, framerate & dimensions checks in the ``buildkit-config.json`` file. The output of these checks appears in the ``rub-check.log`` file.

###Exclusions
Folder exclusions are now possible in the ``buildkit-config.json`` file. If you wanted to exclude boxMenu and spoor from a course with ID ``m05``, you would set up rubconfig.json like this:
```
{
  "folderexclusions": {
        "course": {
            "m05": [
                "adapt-contrib-spoor",
                "adapt-contrib-boxMenu"
            ]
        },
        "global": [
        ]
    },
  "clearLogs": true
}
```
