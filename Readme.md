# Logule ![travis build status](https://secure.travis-ci.org/clux/logule.png)

Logule is an advanced logging utility for nodejs. It is analogous to `console.log`
and can take multiple arguments, but additionally it prefixes
the current time, the log level, and optionally, prefixed namespaces
(with optional padding).

Shortcut methods for the log levels are available as: `log.error`, `log.warn`,
`log.info`, `log.debug`, `log.trace`, `log.line`, `log.zalgo`, and as a bonus,
`log.line`. These methods are additionally chainable.

It favours a combination of Dependency Injection and environment variable based
control to allow for both tree-based log level filtration (via DI),
and globally controllable log levels (via evars).

## Usage
Basic usage:

````javascript
var logule = require('logule');
logule
  .error("this is an error message")
  .warn("warning")
  .info("info msg")
  .debug("chained debug");
````

![simple output!](https://github.com/clux/logule/raw/master/imgs/outputsimple.png)

## Namespaces
To add a namespace prefix, subclass logule with it:

````javascript
log = logule.sub('BUILD');
log.trace("Trying to compile main.js");
log.error("Failed");
logule.info("Shutting down")
````

![one namespace output!](https://github.com/clux/logule/raw/master/imgs/output.png)

### Multiple Namespaces
Pass in more strings to get more namespaces prefixed

````javascript
var log = logule.sub('BUILD', 'COMPILE');
log.debug('log has two prefixes');
````

### Namespace Padding
Call `.pad(size)` on a logger instance to specify a fixed indentation level for each namespace.

````javascript
log.pad(16);
log.warn('my namespaces are padded');
````

Messages will here begin `(16 + delimiter_size)*num_namespaces` characters out.
Large namespaces (>specified size), will stand out from the crowd.

## Line
An awesome feature inspired by [nlogger](https://github.com/igo/nlogger) - but using logule
semantics; `logule.line()` reads the line and filename of the calling function
by directly inspecting the stack.

````javascript
log = logule.sub('CRAZYDEBUG');
log.debug('dumping lines to console');
log.line('who called me?');
log.line('and now?');
```

![line output!](https://github.com/clux/logule/raw/master/imgs/line.png)

## Passing log around
### Dependency Injection
#### Subclasses
A good use of `.sub()` involve inheriting based on namespaces, and linking
instances together.

````javascript
var log = logule.sub('BUILD');
var sublog = log.sub('COMPILE');
````

`sublog` would here provide same output as `logule.sub('BUILD', 'COMPILE')`.

It is advantageous to do 'one namespace sub at a time', as then it is easier
to filter log output from large chunks of code at a time,
as well as maintaining a sensible log hierarchy.

`log.sub()` maintains all padding, suppressed log levels, its locked status,
and namespace properties set on the original `log` instance. Therefore, it works as if there's
an implicit link between the sub and its parent.

#### Suppress
Suppressing logs from an instance is done in a very neat, propagating,
and non-breaking way. `.suppress(methods...)` suppresses output
from specified methods, but still allows them to be called, and they still chain.

````javascript
log.suppress('debug', 'info');
log.warn('works').info('suppressed').error('works').debug('suppressed');
````

All subclasses subsequently created from a suppressed instance,
will also be suppressed. To unsuppress, use `.allow()`.

#### Allow
Allows modules down in the hierarchy to log things that have been suppressed
by supers. This only works if global log levels have not been enforced.

````javascript
log.suppress('debug', 'info');
var l2 = log.sub('forModuleX');
l2.allow('debug');
l2.debug('works!')
````

#### Get Method
A debug module should only need `log.debug`. You can save typing,
and enforce this behaviour by calling `.get('debug')` on an instance,
to return the correctly bound instance method to pass down.

````javascript
var dbg = log.get('debug');
dbg("works like log.debug - nothing else accessible through this var");
````

Note that if `log` have called `.suppress('debug')` earlier - or if it is a `.sub()`
of an instance that have called `.suppress('debug')`, then you would only get
a suppressed function from `.get('debug')`.

### Tree Based Log Levels
By only using `.sub()` instances inheriting from a single base instance,
you can implement tree based log levels at start time by calling
`.suppress()` and `.allow()` on the base instance - or any branch point
you would like.

````javascript
var log = logule.sub('APP');
//log.suppress('info','debug'); // uncomment to globally suppress

var modelsLog = log.sub('MODEL'); // pass this to models
//modelsLog.suppress('warn'); // uncomment to suppress warnings below

var eventsLog = modelsLog.sub('EVENT'); // pass this down from models to events
//eventsLog.allow('debug'); // uncomment to temporarily allow debugs in this module
````

Tree based log levels is the safe, overridable version of log levels.
To strictly enforce suppression of certain levels, use environment variables.

### Global Log Levels
To globally filter log levels, set the LOGULE_SUPPRESS environment variable.

    $ export LOGULE_SUPPRESS=debug,trace,line

This will globally override suppress/allow calls for any branch regarding
`debug()`, `trace()` and `line()` and hide all of their outputs.

Alternatively, if you want to primarily allow only a few methods rather than
list all the ones you want to disallow, you can set the LOGULE_ALLOW environment
variable instead.

    $ export LOGULE_ALLOW=ERROR,WARN

This will hide all output from any othes methods than `warn()` and `error()`.

If by any chance both environment variables are set, logule will act only
on the LOGULE_SUPPRESS one.

### Verifying Logule Validity
When passing logule subs around, it might be useful for separate code to test
whether what is received is an appropriate Logule instance or not.
Unfortunately, instanceof testing against your installed logule will only work
when your code is not separated into modules.

Therefore, to support npm module style where there are possibly multiple installations
of logule spread around, the module can test that the one passed in,
has a version compatible with the module's own using a built in helper function.

````javascript
var logule = require('logule');
function (logInput) {
  if (logule.verify(logInput)) {
    // logInput exists, is an instance of logule, and its version is ~logule.data.version
  }
}
````

Note that single functions like `logule.get('info')` will of course not pass this test.
If your API expects a single logger function, then
you should simply type test the input as a function.

## Zalgo
H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ

````javascript
log.zalgo("all is lost");
````

## Installation

````bash
$ npm install logule
````

## Running tests
Install development dependencies

````bash
$ npm install
````

Run the tests

````bash
$ npm test
````

## License
MIT-Licensed. See LICENSE file for details.
