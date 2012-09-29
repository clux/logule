# Logule [![Build Status](https://secure.travis-ci.org/clux/logule.png)](http://travis-ci.org/clux/logule)

Logule is a pretty, but heavily configurable logging utility for nodejs. It allows multiple transports (stdout + streaming JSON) as well as being configurable per user, per app and per module (with that priority) via recursively placed config files.

![simple output!](https://github.com/clux/logule/raw/master/imgs/outputsimple.png)

## Key Design Goal
Logging is a simple yet deceptively hairy problem. You don't want foreign modules to spam your app with needless messages, but you also don't want them to not say anything if you are passing bad stuff to them either. You want logs to look pretty, but you also want everyone else's logs to look like yours, and if that's not possible, you want to turn their logs off.

What you really want, is not simply configurability, but a *hierarchy of configurability and suppression*. You want to be able to:

- Mute specific log levels globablly
- Mute non-fatal info from certain branches of code
- Mute chatty modules
- Show all logs from new modules you just started developing for

as well as being able to configure *how* your:

- module logs by default
- app logs by default (perhaps overriding individual module defaults)
- apps log by default (by providing sensible overall configs)

Manipulating these settings should be super easy as it's most useful during development and debug sessions where time is of the essence.

Logule strives to adhere these goals and beyond that tries to maintain a stable API. Features so far has been greatly improved via issues/pull requests contributions, so please follow this path if there is anything you feel deserves attention.

## Index

* [Basic Usage](#basic-usage)
* [Namespaces](#namespaces)
* [Subs](#subs)
* [Configuration](#configuration)
  * [Global Filtration](#global-filtration)
  * [Stream JSON](#stream-json)
* [API](#api)
  * [Default Log Methods](#default-log-methods)
  * [Line](#line)
  * [Zalgo](#zalgo)
  * [Get](#get)
* [Branch Based Filtration](#branch-based-filtration)
  * [Suppress](#suppress)
  * [Allow](#allow)
  * [Filtering Branches](#filtering-branches)
* [Installation](#installation)
* [Running Tests](#running-tests)
* [License](#license)

## Basic Usage
Require a logule instance for the current file and use it everywhere inside it.

````javascript
var log = require('logule').init(module);
log
  .error("this is an error message")
  .warn("warning")
  .info("info msg")
  .debug("chained %s", "debug");
````

![simple output!](https://github.com/clux/logule/raw/master/imgs/outputsimple.png)

## Namespaces
To add a namespace to this module, add a second parameter to `init()`

````javascript
log = require('logule').init(module, 'BUILD');
log.trace("Trying to compile main.js");
log.error("Failed");
logule.info("Shutting down")
````

![one namespace output!](https://github.com/clux/logule/raw/master/imgs/output.png)

## Subs
Sometimes you want to create namespaces a little more granularly, perhaps you would like to dependency inject a sandboxed version of your logger to an internal or external class that supports multiple logging modules. Well, this is easy:

````javascript
var log = require('logule').init(module, 'myFile');
var sandboxed = log.sub('CrazyClass').suppress('debug');
// pass sandboxed logger to CrazyClass
````

A `log.sub()` will maintain the the default namespaces and suppression settings of `log`. It can also optionally append one extra namespace to the ones existing, in this case, 'CrazyClass' will be appended.

Since the output of `var log = require('logule').init(module)`, `log.sub()` and `log.sub().sub()` (etc) all act similarly and on the same API, the variable `log` will in this document be used to refer to a logger instance that came from any of these origins.

## Configuration
Rich configuration of colors, style, date formatting and global suppression of certain log levels are all available via config files. The [default configuration file](https://github.com/clux/logule/blob/master/.logule) results in output looking like the older versions and the images herein.

Configs are located via [confortable](https://github.com/clux/confortable). Which is a module that performs priority based config searches. In particular, it is used here with the following path priorities:

1. execution directory
2a). if (exec dir is inside  $HOME) Up to and including $HOME in '..' increments
2b). if (exec dir is outside $HOME) $HOME
3. directory of module.parent

Step 3 enables modules to bundle their own default config which can be overriden by apps by utilizing step 2.

The found config file is merged carefully with the default [bundled config](https://github.com/clux/logule/blob/master/.logule). In particular, one cannot remove the default log levels (lest we break dependency injection).

#### Global Filtration
Set the `suppress` flag to globally turn all listed log methods into chaining no-ops.
Alternatively ist the exceptions under `allow` instead and set `useAllow` to `true`.
For branch based suppression see allow and suppress.
TODO: links

#### Stream JSON
If `logFile` is filled in, this file will be appended to with JSON log messages (one message per line). Thus, you can read the file and split by newline, or watch the file and emit/filter based on each JSON line you receive.

The individual JSON messages use the current format:

````javascript
{
  "date": "08:14:11",
  "level": "error",
  "namespaces": ["build"],
  "message": "message part, how it appeared in terminal"
}
````

## API
### Default Log Methods
The following methods names are always available on a `log` instance:

````
var methods = ['trace', 'debug', 'info', 'line', 'warn', 'error', 'zalgo'];
````

The mystical `zalgo` and `line` provide some specialized logic:

#### Line
Line is prepends the filename and line of caller (as a namespace). It fetches this info from the stack directly.

````javascript
var log = require('logule').init(module, 'broken');
log.debug('dumping lines to console');
log.line();
log.line();
```

![line output!](https://github.com/clux/logule/raw/master/imgs/line.png)

#### Zalgo
H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ

````javascript
log.zalgo('core melting')
````

#### Get
A debug module may only need `log.debug`. You can save typing, and enforce this behaviour by calling `.get('debug')` on an instance, to return the correctly bound instance method to pass down.

````javascript
var dbg = log.get('debug');
dbg("works like log.debug - but nothing else accessible via this non-chainging var");
````

Note that if `log` have called `.suppress('debug')` earlier or up the call graph - or if it is a `.sub()` of an instance that have called `.suppress('debug')` - then you would only get a suppressed function from `.get('debug')`.

### Branch Based Filtration
Controlling global levels is done via config files, but the levels not globally muted in the config can be turned on and off at any branch point:

#### Suppress
Suppress logs for passed in methods.

````javascript
log.suppress('debug', 'info');
log.warn('works').info('suppressed').error('works').debug('suppressed');
````

#### Allow
Unsuppress logs for passed in methods.

````javascript
log.suppress('debug', 'info');
var l2 = log.sub('forModuleX').allow('debug');
l2.debug('works!');
log.debug('suppressed');
````

#### Filtering Branches
The examples for suppress/allow only shows the basic API for using subs. You do not have to create subs and pass them down via dependency injection. You can of course do this, but if you write short modules, it's generally easier to let `init()` do the heavy lifting.

To get the most out of call tree filtration consider the following example of an application structure:

````
a.js
└──┬b.js
   └───c.js
````

When just using suppress/allow on an instance returned directly by `init()` logule will remember the call tree and apply the same rules to the ones further down the tree by default:

````javascript
// a.js
var l = require('logule').init(module).suppress('debug');
var b = require('./b');

// b.js
var l = require('logule').init(module);
var c = require('./c')
l.debug('suppressed');
l.allow('debug');
l.debug('works');

// c.js
var l = require('logule').init(module);
l.debug('works');
````

With the following code, `a.js` sets the app default of _no debug logging_, which is overridden by `b.js`, and propagates to `c.js`.

Note that any suppress/allow calls to a `sub()` does not propagate:

````javascript
// b.js
var l = require('logule').init(module).sub().allow('debug');
l.debug('works');

// c.js
var l = require('logule').init(module);
l.debug('suppressed');
````

In short tree based log levels is the safe, *overridable version* of log levels.
To strictly enforce suppression of certain levels, enforce log levels in your config files.


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
