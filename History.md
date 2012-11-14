2.0.0 / 2012-11-14
==================
  * config rewritten nicely in JSON and must have the `.json` extension
  * if you rely on modules using the older config files leave your old config intact until they upgrade (all my modules will be updatet within the hour)
  * rely on `peerDependencies` in logule-requiring modules rather than try to communicate across compatible copies of logule - this **removes global usage by forcing the user to decide**
  * the new `.logule.json` is mostly similar, but some changes are required - the changes are mostly clear from the new default config, but for the new/unobvious attributes, look them up in the new readme
  * expose an `EventEmitter` as the third optional transport for people who would like full control (and are stuck with logule because of module deps, but would like to use something else)
  * all transports are muted/suppressed individually now!
  * Namespaces can now be disabled with `nesting` set to zero
  * Fixed Issue 13: line logs with colored strings to file
  * Fixed Issue 14: .get() did not log to file if level was muted.
  * No double `util.format.apply` via `console.log` by writing directly to `process.stdout`

1.1.0 / 2012-10-06
==================
  Modules should not say anything when it doesn't need to. This discourages the use of log.trace in free standing modules, which is bad, information is a good thing to have. Solution:
  * `trace` and `debug` logs are by suppressed in the default config to allow probing of modules that use logule, but still not spam `stdout` by default
  * `colors` dependency removed. Those who were using the accessors it added to `String.prototype` must require it separately, this behaviour spread implicit dependencies and was not intended.
  * fix a critical bug where values on `process.logule` were being overwritten due to improper serialization (deprecates 1.0.X)

1.0.1 / 2012-10-02
==================
  * Documentation clean up
  * DI Safety: disallow new method creation from config
  * zalgo styling: make it less serious with gratuitous amounts of syntax
  * Misc code clean-ups + performance tweaks
  * `.get()` on invalid log level no longer returns broken function

1.0.0 / 2012-09-29
==================
  * explicit dependency injection replaced with internal bookkeeping, see readme for how to use this
    **code must now initialize a logger after require**: `var log = require('logule').init(module)`
  * `verify` method removed
  * `suppress` renamed to `mute`
  * `allow` renamed to `unmute`
  * `muteOnly` method added
  * `unmuteOnly` method added

  * Config entry: `delimiter` should now include whitespace on both ends. I.e. '-' -> ' - '
  * Config entry: `nesting` specifies the maximal nesting number allowed for namespaces.
  * Config entry: `lineCol` to specify color of file:line prefix as it no longer uses namespaces (and therefore does not count towards `nesting` total). Defaulted it to green.
  * Config option: `dateType = 'none'` now allowed to remove dates from output entirely
  * Empty messages now remove the last delimiter

  * config merger code is now in a separate file

0.9.1 / 2012-09-15
==================
  * allow console.log formating with %d %s and %j identifiers

0.9.0 / 2012-07-25
==================
  * Streaming JSON log transport for quick and dirty log quering scripts
  * padding now only affects the first namespace
  * bump confortable to fix issue #4
  * fix padding issue #8

0.8.2 / 2012-07-18
==================
  * use newer confortable to allow modules to bundle own config if app does not specify

0.8.1 / 2012-07-03
==================
  * moved config finder to own the `confortable` module
  * General code linting and readability improvements


0.8.0 / 2012-07-02
==================
  * Make backwards compatible with node 0.6 by using path.existsSync there
  * Don't allow deleting original methods, only rename. Otherwise DI would break..
  * Deprecates 0.7.X for DI compatibility reasons above
  * Rewritten internal _log for efficiency : )
  * config stuff has some basic tests

0.7.0 / 2012-06-30
==================
  * Rewrite from prototype as object to loosely coupled individual methods
  * Performance and memory usage improvement as a result thereof
  * configuration now possible via recusively placed .logule files
  * environment variable based suppression taken out in favour of config files
  * node >=0.8 only because of fs.existsSync..

0.6.2 / 2012-06-25
==================
  * 0.8 test support by ditching expresso for tap

0.6.1 / 2012-02-25
==================
  * 0.4 support removed was not strictly metioned in 0.6 pre launch but it does affect so minor bump
  * Slight zalgo style tweak
  * Bump dependencies' versions

0.6.0 / 2012-02-25
==================
  * Redesign pass around interface to be simpler for people who do not want to use DI all the time:
  * Global log levels via environment variables - see readme
  * .line() gets the line number from new Error()'s 1st stack frame directly rather than by parsing
  * .lock() instance method removed - prefer evars for proper filtering rather than encouraging avoiding the tree
  * removed makeMiddleware instance method and put it in the example folder instead
  * node 0.4 support is removed

0.5.6 / 2012-01-12
==================
  * New instance method .allow() does the opposite of suppress.
  This ensures the more sensible behaviour of ressurection allowed across subs,
  rather than forcing modules below to use instances not part of the chain.

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

