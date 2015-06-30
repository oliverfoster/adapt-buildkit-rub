var _ = require("underscore");
var fs = require("fs");
var path = require("path");

var pub = {

    entryPoint: function(forceSwitches) {

        var prog = pub.runProgram();

        var switches = _.extend(pub.generateSwitches(prog), forceSwitches);

        var terminalOptions =  {
            switches: switches,
            courses: prog.courses || []
        };

        /*switches: {
                build: 'named'/true/undefined,
                wait: 'named'/true/undefined,
                trackinginsert: 'named'true/undefined,
                trackingdelete: 'named'true/undefined,
                trackingreset: 'named'true/undefined,
                watch: 'named'/true/undefined,
                debug: 'named'/true/undefined,
                force: 'named'true/undefined,
                server: 'named'true/undefined,
                port: '8080'/undefined,
                quick: 'named'true/undefined,
                zip: 'named'true/undefined,
            }

        */

        return terminalOptions;
    },

    runProgram: function() {
        var program = require('commander');
        program.courses = [];
        program
            .version(JSON.parse(fs.readFileSync( path.join(__dirname, "../package.json"))).version)
            .arguments('[courses...]')
            .option('-b, --build', "build courses (default)")
            .option('-W, --wait', "wait for keypress at end")
            .option('--trackinginsert', "inserts tracking ids (assumes: not -b)")
            .option('--trackingdelete', "delete tracking ids (assumes: not -b)")
            .option('--trackingreset', "resets tracking ids (assumes: not -b)")
            .option('-w, --watch', "watch for changes (assumes: -b)")
            .option('-d, --debug', "no minification, produce sourcemaps (assumes: -b)")
            .option('-f, --force', "force rebuild (assumes: -b)")
            .option('-s, --server', "run server (assumes: -bw --port 3001)")
            .option('--port [value]', "set server port")
            .option('-q, --quick', "skip minification and sourcemapping (assumes: -b)")
            .option('-z, --zip', "create sco zips (assumes: -b")
            .action(function (c) {
                program.courses = c;
            });

        program.parse(process.argv);
        return program;
    },

    generateSwitches: function(program) {
        var switches = {};
        _.each(program.options, function(opt) {
            var k = opt.long.slice(2);
            if (k == "version") return;
            if (program[k] instanceof Array) {
                //turn arguments that would normally have the '--watch' style, specified instead as 'watch' back into the --watch style
                //enabled the switch and add its sub values back into the courses array
                switches[k] = "named";
                program.courses = program.courses.concat(program[k]);
            } else {
                //assume switch is a boolean
                switches[k] = program[k];
            }
        });
        return switches;
    }

};

module.exports = pub.entryPoint;