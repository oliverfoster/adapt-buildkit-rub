# adapt-buildkit-rub
(Rapid-Unified-Builder)  
Native Buildkit (alternative to grunt)

## Installation / Update / Repair

!!NODE V4.3+ ONLY!!
Please make sure [adapt-buildkits](https://github.com/cgkineo/adapt-buildkits) is installed.

Run this command in your build folder:
```
adapt-buildkit install rub-develop
```

## Usage

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
    --style [value]   build style, 0=src/course 1=src/courses 2=builds
    --port [value]    set server port
    -q, --quick       skip minification and sourcemapping (assumes: -b)
    -c, --clean       clean build folder (assumes: not -b)
    -z, --zip         create sco zips (assumes: -b)
    --verbose         extra console output


```
##### --wait 
Has few use-cases. When double-clicking on rub.bat from windows, this feature is useful in that the command prompt will not exit immediately.

##### --tracking*
Currently requires that you specify a module id ``./rub --trackinginsert p101`` but there are plans to allow ``./rub --trackinginsert`` to do all modules.

##### --force
Recompiles all handlebars, javascript and less from source instead of checking for source changes. This is useful if you've just installed a plugin which is older than the current build.

##### --forceall
Same as --force. 'Resyncs' (deletes missing, overwrites changed and copies new) assets from src also.

##### --clean
Clears the build folder leaving the course folder alone, i.e. if you want to build from scratch.

##### --quick
If you want the javascript and less compilation to fly, this will stop both compilers generating sourcemaps or performing minification, both of which are really costly in time.

##### --zip
Will output a folder called "scos" to your desktop containing the zipped output.


## Legacy Commands
Rub also supports legacy style commands:

```

    These commands are synonymous

    
    ./rub dev p101
    ./rub -dfw p101


    ./rub build p101
    ./rub p101


    ./rub watch p101
    ./rub -w p101


```
## Recommend Commands
| Command | Use | Description |
| --- | --- | --- |
| ``./rub -ds p101`` | Product development, content changes | Runs a quick-rebuild, with sourcemapping and a server instance on the module p101 |
| ``./rub`` | Production | Runs a build on all modules with no sourcemapping and minification turned on

# Advantages

### Node native
None of the modules used in this buildkit require compilation for different operating systems. You can transport the buildkit to different systems without having to run extra 'npm install' commands.

### Inbuilt task manager
Rather than using gulp / grunt as a task runner, the buildkit has its own custom task runner. There is much finer granularity over tasks (asynchronous or synchronous) they are divided into five major subsections - "prep", "build", "clean", "finish" and "package". 
 
All tracking changes, json linting, javascript bundling and cleaning are performed in the "prep" subsection, all file synchronisation and compilation happen in the "build" subsection, schema defaults and string replacement happen in the "clean" subsection, in the "finish" subsection comes asset checking, javascript minification and json checking, SCO zips are made in the "package" subsection.  
  
Having a custom task runner is useful for throttling task execution to accomodate OSX open-file limits and system resource utilizations across systems.  
  
The inbuilt task manager has a plugin-style architecture making adding new build tasks as simple as possible. Each task and associated configuration are separate.

### Reduced footprint
As there are few third-party libraries and no compiled libraries this buildkit contains more functionality in a smaller space.

Adapt Learning's gruntfile: ~90mb installed (including node_modules)  
Rub Buildkit: ~110mb installed (1mb, plus node_modules ~15mb, plus [ffprobe](https://www.ffmpeg.org/download.html) for linux, mac and windows ~96mb)

### Builds only when necessary
As the tasks and taskrunner in the buildkit are custom written it can access if the source was updated and needs the build updating. A second run of the buildkit on an unchanged course will be much faster than when using grunt. A second run on a changed course will rebuild only the necessary bits. The build divisions are "core", "libraries", "plugins", "less", "handlebars", "json", "assets", "fonts", "required" (+ a few others), each can be built independently.

### Support for different project structures
The buildkit can compile three types of project folder structure:

Standard Adapt Learning, single course structure, where all your JSON and assets are stored in ``src/course`` and built to the ``build`` folder.  

Kineo's multiple courses from the same src structure - where all your JSON and assets are stored in subfolders of ``src/courses/`` and built to subfolders of a ``builds`` folder, such as ``src/courses/p101``, ``src/courses/m05`` etc.  

Builds only. Instead of having course assets in the src **and** build folders, it is possible to have just the core code, theme, menu(s), components and extensions in the ``src`` folder and keeping the JSON and assets in the builds/*courseid*/course/ folder only - this halves the storage requirements and removes the requirement to run a task every time the JSON or assets are changed.

From `src/course`:
```
config.json
en/
```

From `src/courses`
```
p101/
    config.json
    en/
p102/
    config.json
    en/
```
From `builds`
```
builds
├── p101
│   └── course
│       ├── config.json
│       └── zh-cn
└── p102
    └── course
        ├── config.json
        └── en
```

### Improved compatibility
It will work with Adapt Learning's v1.1.1 and v2 frameworks, as well as Kineo's interim framework.  
It allows the three types of src content structure to be used regardless of the underlying framework.  
It backports dynamic jquery selection to v1.1.1

### JSON linting and LESS sourcemaps
For Adapt Framework and the buildkit configurations.

### Course asset checking
It is possible to define video and audio codec, bitrate, framerate & dimensions checks in the ``buildkit-config.json`` file. The output of these checks appears in the ``rub-check.log`` file.

### Plugin Exclusions
Make sure you rename ``buildkit-config.json.example`` to ``buildkit-config.json`` before you begin.
Folder exclusions are now possible in the ``buildkit-config.json`` file. If you wanted to exclude boxMenu and spoor from a course with ID ``m05``, you would set up buildkit-config.json like this:
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
  }
}
```

### File Extensions
Make sure you rename ``buildkit-config.json.example`` to ``buildkit-config.json`` before you begin.
You can tell rub to expect txt files instead of json files (as some server admins don't like json) by adding the following to your ``buildkit-config.json`` file:
```
{
  "fileextensions": {
        "global": {
          "json": "txt
        }
  }
}
```
This won't modify the framework. So go to the your [src/core/js/app.js](https://github.com/adaptlearning/adapt_framework/blob/master/src/core/js/app.js) and change all occurances of ``.json`` to ``.txt``

### Asset Checking
Make sure you rename ``buildkit-config.json.example`` to ``buildkit-config.json`` before you begin.
You can define media/file asset file size, dimension, bitrate and codecs in your ``buildkit-config.json``:
```
    "techspec": {
        "extensions": {
            "png": {
                "size": "1.5MB",
                "width": 2500,
                "height": 2500
            },
            "jpg": {
                "size": "1.5MB",
                "width": 2500,
                "height": 2500
            },
            "jpeg": {
                "size": "1.5MB",
                "width": 2500,
                "height": 2500
            },
            "gif": {
                "size": "1.5MB",
                "width": 2500,
                "height": 2500
            },
            "mp4": {
                "size": "10MB",
                "width": 1440,
                "height": 810,
                "ratio": "16/8",
                "audio_bitrate": "128kb/s",
                "audio_codec": "aac",
                "audio_channel_layout": "mono",
                "video_bitrate": "1.5mb/s",
                "video_fps": 25,
                "video_codec": "h264"
            },
            "mp3": {
                "size": "10MB",
                "audio_bitrate": "128kb/s"
            },
            "ogv": {
                "size": "10MB",
                "width": 1440,
                "height": 810,
                "audio_bitrate": "128kb/s",
                "audio_codec": "vorbis",
                "video_bitrate": "1.5mb/s",
                "video_fps": 25,
                "video_codec": "theora"
            }
        },
        "totalSize": "100MB",
        "fileSize": "15MB",
        "restrictedExtensions": [ "log" ]
    }
```    
