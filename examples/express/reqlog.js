var l = require('logule').init(module, '<-');

// simple logger with `<-` namespace
app.use(function (req, res, next) {
  l.trace(req.method, req.url.toString());
  next();
});
