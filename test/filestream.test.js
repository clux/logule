var logule = require('../')
  , l = logule.init(module, "fileTest")
  , fs = require('fs');

exports.file = function (t) {
  l.info('something for filelog');
  setTimeout(function () {
    var read = fs.readFileSync('./testdump.txt');
    var buf = (read + '').split('\n');
    t.ok(buf.length > 1, 'somethig in buffer');
    var last = buf[buf.length-2]; // last is empty and penultimate is this..
    var json = JSON.parse(last);
    t.equal(json.level, 'info', 'file level');
    t.deepEqual(json.namespaces, ['fileTest'], 'file namespaces');
    t.equal(json.message, 'something for filelog', 'file message');
    t.done();
  }, 50);
};
