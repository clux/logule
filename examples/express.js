var makeMiddleware = function (l) {
  return function (req, res, next) {
    l.trace(req.method, req.url.toString());
    next();
  };
};
