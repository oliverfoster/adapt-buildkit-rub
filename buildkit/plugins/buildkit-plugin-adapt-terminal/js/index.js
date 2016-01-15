'use strict';

class Plugin {

	constructor() {
		this.setupEventListeners();
	}

	setupEventListeners() {
		events.on("plugins:initialized", () => { this.startTerminalApp(); });
		events.once("config:ready", (config) => { this.onConfigReady(config); });
	}

	startTerminalApp() {

	    var prog = this.runProgram();
	    var switches = this.getSwitches(prog);

	    var terminalOptions =  {
	        switches: switches,
	        courses: prog.courses || [],
	        command: "default"
	    };

	    this.processLegacyCommands(terminalOptions);

	    events.emit("terminal:ready", {terminal: terminalOptions });

	    /*
	    switches: {
	            build: 'named'/true/undefined,
	            wait: 'named'/true/undefined,
	            trackinginsert: 'named'true/undefined,
	            trackingdelete: 'named'true/undefined,
	            trackingreset: 'named'true/undefined,
	            watch: 'named'/true/undefined,
	            debug: 'named'/true/undefined,
	            force: 'named'/true/undefined,
	            forceall: 'named'/true/undefined,
	            server: 'named'/true/undefined,
	            port: '8080'/undefined,
	            quick: 'named'/true/undefined,
	            clear: 'named'/true/undefined,
	            zip: 'named'/true/undefined,
	        }
	    commands: "default"/"watch"/"dev"/"build"
	    */
	}

	runProgram() {
	    var program = commander;
	    program.courses = [];
	    program
	        .version(application.version)
	        .arguments('[courses...]')
	        .option('-b, --build', "build courses (default)")
	        .option('-W, --wait', "wait for keypress at end")
	        .option('--trackinginsert', "inserts tracking ids (assumes: not -b)")
	        .option('--trackingdelete', "delete tracking ids (assumes: not -b)")
	        .option('--trackingreset', "resets tracking ids (assumes: not -b)")
	        .option('-w, --watch', "watch for changes (assumes: -b)")
	        .option('-d, --debug', "no minification, produce sourcemaps (assumes: -b)")
	        .option('-f, --force', "force rebuild (assumes: -b)")
	        .option('-F, --forceall', "force rebuild and resync (assumes: -b)")
	        .option('-s, --server', "run server (assumes: -bw --port 3001)")
	        .option('--port [value]', "set server port")
	        .option('-q, --quick', "skip minification and sourcemapping (assumes: -b)")
	        .option('-c, --clean', "clean build folder (assumes: not -b)")
	        .option('-z, --zip', "create sco zips (assumes: -b)")
	        .option('--verbose', "extra console output")
	        .action(function (c) {
	            program.courses = c;
	        });

	    program.parse(process.argv);
	    return program;
	}

	getSwitches(program) {
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

	processLegacyCommands(terminalOptions) {
	    //translate legacy commands into rub commands

	    if (terminalOptions.switches.watch == "named") {
	        // rub watch
	        terminalOptions.switches.debug = true;
	        terminalOptions.switches.watch = true;
	        terminalOptions.command = "watch";
	    }

	    if (terminalOptions.courses.length === 0) return;

	    var firstArgument = terminalOptions.courses[0];
	    if (typeof firstArgument != "string") return;
	    
	    var command = firstArgument.toLowerCase();
	    switch(command) {
	    case "dev":
	        // rub dev
	        terminalOptions.courses.shift();
	        terminalOptions.switches.forceall = true;
	        terminalOptions.switches.debug = true;
	        terminalOptions.switches.watch = true;
	        terminalOptions.command = command;
	        break;
	    case "build":
	        // rub build
	        terminalOptions.courses.shift();
	        terminalOptions.switches.debug = false;
	        terminalOptions.command = command;
	        break;
	    }

	    
	}

	onConfigReady(config) {
		this.config = config;
		this.displayHeader();
	}
	
	displayHeader() {
		logger.log("Adapt Framework Buildkit - "+application.commonName);
		var mode = (this.config.terminal.switches.debug ? "Debug": "Production");

		var isNotice = (this.config.terminal.switches.debug ? true: false);
		isNotice = (this.config.terminal.switches.force ? true : isNotice);

		if (this.config.terminal.switches.forceall) mode += ", Forced Rebuild and Resync";
		else if (this.config.terminal.switches.force) mode += ", Forced Rebuild";
		else mode += ", Quick Rebuild";
		mode += ", " + this.config.terminal.switches.typeName + " Style"

		if (isNotice) {
			logger.notice(">",mode);	
		} else {
			logger.log(">",mode);
		}
		
		logger.log(">","Courses:",(this.config.terminal.courses.join(",")||"All"));
	}
}

module.exports = new Plugin();
