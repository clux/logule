0.5.5 / 2011-12-14
==================
  * Slight tweak to verifier (could not handle null elements before this version)

0.5.4 / 2011-12-13
==================
  * CoffeeScript removed entirely - JSHint is better for safe JS (found a couple of implicit returns errors with CS that are now fixed)
  * Paths should work on windows (used unix slashes for version)

0.5.3 / 2011-12-06
==================
  * Explicit coffee-script dependency removed - now each new version is recompiiled before release

0.5.2 / 2011-12-01
==================
  * logger.data exposes a frozen object with the current namespaces and logule version
  * logule.verify(inst) will verify that another logule instance is compatible with this (using exposed data.version on prototype)

0.5.1 / 2011-11-27
==================
  * logule.get('line') does not chain, like the other get() functions

0.5.0 / 2011-11-27
==================
  * logule.line() for those cases where you quickly want to find what went wrong

0.4.1 / 2011-11-27
==================
  * logule is fully testable

0.4.0 / 2011-11-26
==================
  * require output is a new instance that can be used directly -> no `new` operator required - use `sub` liberally
  * experimental middleware generator included

0.3.0 / 2011-11-25
==================
  * The `remove` method is now known as `suppress`
  * The `get` method result no longer allows chaining into different log methods (bug)
  * Bad fns requested to `suppress` and `get` will result in an internal log in such a way that you can determine quickly what you did wrong
  * Everything is properly encapsulated so that you can not break out of `suppress` and `get`calls

0.2.0 / 2011-11-24
==================
  * Multiple namespaces can be passed to constructor
  * Padding option now set via the `pad` method
  * Return a sanitized copy of the current Logger's specified method with the `get` method
  * Return a sanitized copy of the current Logger instance with the `remove` method
  * Return a copy of the current Logger instance but with extra namespace(s) appended with the `sub` method

0.1.1 / 2011-11-24
==================
  * First working version

