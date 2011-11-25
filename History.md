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

