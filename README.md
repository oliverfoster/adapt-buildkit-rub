# adapt-buildkit-rub
Native BuildKit (alternative to gulp and grunt)

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

##Node native
None of the modules used in this buildkit require compilation for different operating systems. This makes it possible to transport the buildkit to different systems without having to run extra 'npm install' commands.

###Inbuilt task manager
Rather than using gulp / grunt as a task runner, the buildkit has its own custom task runner. This means that there is much finer granularity over tasks, whether asynchronous or synchronous, they are divided into four major subsections - "prep", "build", "amend" and "finish". So, for example, all tracking changes can be performed in the "prep" subsection, all file synchronisation and compilation can happen in the "build" subsection, json linting and asset checking can happen in the "amend" subsection and SCO zips can be made in the "finish" subsection. 
Having a custom task runner is also useful for throttling task execution to accomodate OSX open-file limits and system resource utilizations across systems.
The inbuilt task manager has a 'plugin' style architecture making adding new build tasks a much simpler endeavour. Each task and its configuration are distinct and separate, meaning that targeting bugs and updating becomes much easier.

###Reduced footprint
Due to the low utilisation of third-party libraries and node-native only third-party libraries, the resultant buildkit is vastly smaller than the alterrnatives.

Adapt Leanring's gruntfile: ~90mb installed (including node_modules)
Kineo's gruntfile: ~90mb installed (including node_modules)
Kineo's gulpfile: ~201mb installed (including node_modules)
this buildkit: ~14mb installed (including node_modules)

###Builds only when necessary
As the tasks/actions performed by the buildkit are all custom written, the buildkit can decide if a source update has occured which requires a file to be updated. A second run of the buildkit on an unchanged course will be much faster than when using gulp or grunt. A second run on a changed course will rebuild only what is necessary.

###Course asset duplication
This buildkit can compile three types of src content structure. Adapt Learning's single course structure, Kineo's src/courses structure and a new build/courses structure (thanks to Matt Leathes). This means that instead of having course assets in the src and build folders, it is now possible have the course assets in the build folder only, halving the storage requirements.

###Improved compatibility
This builder will work with Adapt Learning's v1.1.1 and v2 frameworks, as well as Kineo's interim framework.
It allows the three types of src content structure to be used regardless of the underlying framework.
It backports dynamic jquery selection to v1.1.1

###JSON linting and LESS sourcemaps
Yes.




