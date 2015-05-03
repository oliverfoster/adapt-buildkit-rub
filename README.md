# adapt-buildkit-native
Native BuildKit (alternative to gulp and grunt)

  Usage: ./make [options] [courses...]  

  Options:  

    -h, --help            output usage information  
    -V, --version         output the version number  
    -b, --build           build courses (default)  
    -W, --wait            wait for keypress at end  
    -i, --trackinginsert  inserts tracking ids (assumes: not -b)  
    -d, --trackingdelete  delete tracking ids (assumes: not -b)  
    -r, --trackingreset   resets tracking ids (assumes: not -b)  
    -w, --watch           watch for changes (assumes: -b)  
    -p, --production      minification and no sourcemaps (assumes: -bf)  
    -f, --force           force rebuild (assumes: -b)  
    -s, --server          run server (assumes: -bw --port 3001)  
    --port [value]        set server port  
    -q, --quick           skip minification and sourcemapping (assumes: -b)  
    -Z, --zip             create sco zips (assumes: -b)  
