# adapt-buildkit-rub
(Rapid-Unified-Builder)  
Native Buildkit (alternative to gulp and grunt)

##WARNING URGENT ACTION REQUIRED

The next version of rub is going to use a raft of new language extensions, moving rub into ES6.  
You will need to install [nodejs version 4.3+](https://nodejs.org/en/).  
You will probably need to restart your computer.  
And you may also need to reinstall ``adapt-cli``, ``adapt-buildkits`` and ``grunt-cli`` (using ``npm install -g ``)  

* rub version 0.0.58 will warn you to upgrade to node 4.3+  
* rub version 0.1.10+ will require node 4.3+ (version 0.1.10 can be installed using ``adapt-buildkit install rub-develop``) 

If you wish not to upgrade, please add the attribute ``"custom": true`` to your ``buildkit/package.json``.  
Rub version 0.0.58 will no longer be supported once version 0.1.10 is pushed (this will probably be in a week or two from 26-02-2016)  

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
None of the modules used in this buildkit require compilation for different operating systems. This makes it possible to transport the buildkit to different systems without having to run extra 'npm install' commands.

###Inbuilt task manager
Rather than using gulp / grunt as a task runner, the buildkit has its own custom task runner. This means that there is much finer granularity over tasks, whether asynchronous or synchronous, they are divided into four major subsections - "prep", "build", "amend" and "finish". So, for example, all tracking changes can be performed in the "prep" subsection, all file synchronisation and compilation can happen in the "build" subsection, json linting and asset checking can happen in the "amend" subsection and SCO zips can be made in the "finish" subsection.  
Having a custom task runner is also useful for throttling task execution to accomodate OSX open-file limits and system resource utilizations across systems.  
The inbuilt task manager has a 'plugin' style architecture making adding new build tasks a much simpler endeavour. Each task and its configuration are distinct and separate, meaning that targeting bugs and updating becomes much easier.

###Reduced footprint
Due to the low utilisation of third-party libraries and node-native only third-party libraries, the resultant buildkit packs more punch than the alternatives.

Adapt Leanring's gruntfile: ~90mb installed (including node_modules)  
Kineo's gruntfile: ~90mb installed (including node_modules)  
Kineo's gulpfile: ~201mb installed (including node_modules)  
this buildkit: ~110mb installed (including node_modules and [ffprobe](https://www.ffmpeg.org/download.html) for linux, mac and windows ~110mb)

###Builds only when necessary
As the tasks/actions performed by the buildkit are all custom written, the buildkit can decide if a source update has occured which requires the build to be updated. A second run of the buildkit on an unchanged course will be much faster than when using gulp or grunt. A second run on a changed course will rebuild only what is necessary.

###Support for different project structures
This buildkit can compile three types of project folder structure. Firstly there's the standard Adapt Learning single course structure where all your JSON and assets are stored in ``src/course`` and built to the ``build`` folder.  

Then there's Kineo's 'multiple courses from the same src' style - where all your JSON and assets are stored in subfolders of ``src/courses/`` and built to subfolders of a ``builds`` folder.  

Finally, RUB introduces a new project structure where, instead of having course assets in the src **and** build folders, it is now possible to have just the core code, theme, menu(s), components and extensions in the ``src`` folder, keeping the JSON and assets in the builds/*courseid*/course/ folder only - thereby halving the storage requirements and removing the requirement to run a task every time the JSON or assets are changed.

###Improved compatibility
This builder will work with Adapt Learning's v1.1.1 and v2 frameworks, as well as Kineo's interim framework.  
It allows the three types of src content structure to be used regardless of the underlying framework.  
It backports dynamic jquery selection to v1.1.1

###JSON linting and LESS sourcemaps
Yes.
For Adapt and the builder configurations.

###Course asset checking
It is now possible to define video and audio codec, bitrate, framerate & dimensions checks in the ``rubconfig.json`` file. The output of these checks appears in the ``rub-check.log`` file.

###Exclusions
Folder exclusions are now possible in the ``rubconfig.json`` file. For example, if you wanted to exclude boxMenu and spoor from a course with ID ``m05``, you would set up rubconfig.json like this:
```
{
  "excludes": {
    "m05": {
      "folderNames": [
        "adapt-contrib-spoor",
        "adapt-contrib-boxMenu"
      ]
    },
    "folderNames": []
  },
  "clearLogs": true
}
```
