module.exports = process.env.LOGULE_COV
  ? require('./lib-cov/logule.js')
  : require('./lib/logule.js');
