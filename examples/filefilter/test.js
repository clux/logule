var l = require('../../').init(module);

// running this appends 10 lines (== num log calls) to output.txt
l.sub('Ns').info('hi thar').warn('bla%s', "aah");
l.error('fwooarst %j, likeit', {a:2});
l.zalgo('this is bad, really bad');
l.line();
l.warn('wat %d ?', 160);
l.info('okok\nokok');
l.error('arst\\n\n arst');
l.line('here i am');
l.sub('WTF').line("line should say line %d", 12);

// rest of file instructional only, comment out rest to run


// then can command line filter the output
$ cat output.txt | grep error
{"time":"2012-11-11T18:28:58.771Z","level":"error","namespaces":[],"message":"fwooarst {\"a\":2}, likeit"}
{"time":"2012-11-11T18:28:58.773Z","level":"error","namespaces":[],"message":"arst\\n\n arst"}

// or we can process it with short scripts:
var fs = require('fs');
var file = fs.readFileSync('./output.txt').toString();
var lines = file.split('\n').slice(0, -1); // remove trailing newline
lines.length; // 10 (equal to number of calls despite having \n in messages)
var last = JSON.parse(lines[lines.length-1]);
last;
{ time: '2012-11-11T18:51:59.033Z',
  level: 'line',
  namespaces: [ 'WTF' ],
  line: 'test.js:12',
  message: 'line should say line 12' }

// default date serialization can be recovered into a Date instance
new Date(last.time).toLocaleTimeString(); // '18:51:59'
