var l = require('../../').init(module);

l.sub('Ns').info('hi thar').warn('bla%s', "aah");
l.error('fwooarst %j, likeit', {a:2});
l.zalgo('this is bad, really bad');
l.line();
l.warn('wat %d ?', 160);
l.info('okok\nokok')
l.error('arst\\n\n arst')
l.line('here i am');
l.sub('WTF').line("where is this? %d ?", 12)

/*
$ cat output.txt | grep error
{"time":"2012-11-11T18:28:58.771Z","level":"error","namespaces":[],"message":"fwooarst {\"a\":2}, likeit"}
{"time":"2012-11-11T18:28:58.773Z","level":"error","namespaces":[],"message":"arst\\n\n arst"}
*/

