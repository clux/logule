# Logule [![Build Status](https://secure.travis-ci.org/clux/logule.png)](http://travis-ci.org/clux/logule)

Logule is a pretty, but heavily configurable logging utility for nodejs. It allows multiple transports (stdout + streaming JSON) as well as being configurable per user, per app and per module (with that priority) via recursively placed config files.

![simple output!](https://github.com/clux/logule/raw/master/imgs/outputsimple.png)

## Key Design Goal
Logging is a simple yet deceptively hairy problem. You don't want foreign modules to spam your app with needless messages, but you also don't want them to not say anything if you are passing bad stuff to them either. You want logs to look pretty, but you also want everyone else's logs to look like yours, and if that's not possible, you want to turn their logs off.

What you really want, is not simply configurability, but a *hierarchy of configurability and suppression*. You want to be able to:

- Mute specific log levels globablly
- Mute non-fatal info from certain branches of code
- Mute chatty modules
- Unmute new/experimental modules during development

as well as being able to configure *how* your:

- module logs by default
- app logs by default (perhaps overriding individual module defaults)
- apps log by default (by providing sensible overall configs)

Manipulating these settings should be super easy, as it's most useful during development and debug sessions where time is of the essence.

Finally, you should be able to get trace/debug messages from a module that's not behaving correctly, without spamming the shit out of people not using logule!

Logule strives to adhere these goals and beyond that has since 1.0  maintained a stable API. Features so far has been greatly improved via issues/pull requests contributions, so please follow this path if there is anything you feel deserves attention.

## Index

* [Basic Usage](#basic-usage)
* [Namespaces](#namespaces)
* [Subs](#subs)
* [Configuration](#configuration)
  * [Date Formatting](#date-formatting)
  * [Changing Colors](#changing-colors)
  * [Global Suppression](#global-suppression)
  * [Stream JSON](#stream-json)
* [Instance Methods](#instance-methods)
  * [Defaults](#defaults)
  * [line()](#line)
  * [zalgo()](#zalgo)
  * [get()](#get)
  * [mute()](#mute)
  * [unmute()](#unmute)
  * [muteOnly()](#muteonly)
  * [unmuteOnly()](#unmuteonly)
* [Branch Based Filtration](#branch-based-filtration)
  * [Filtering Branches](#filtering-branches)
  * [Muting Chatty Modules](#muting-chatty-modules)
  * [Unmuting New Modules](#unmuting-new-modules)
* [Colors](#colors)
* [Installation](#installation)
* [Running Tests](#running-tests)
* [License](#license)

## Basic Usage
Require a logule instance for the current file and use it everywhere inside it.

```js
var log = require('logule').init(module);
log.error("this is an error message")
log.warn("<- heed this")
log.info("info %s %d %j", "message", 1, {a: 2})
log.debug("this message has to be turned on");
```

![simple output!](https://github.com/clux/logule/raw/master/imgs/outputsimple.png)

## Namespaces
To add a namespace to this module, add a second parameter to `init()`.

```js
log = require('logule').init(module, 'BUILD');
log.trace("Trying to compile main.js");
log.error("Failed");
```

![one namespace output!](https://github.com/clux/logule/raw/master/imgs/output.png)

In this case, the extra output came from the parent module one file up the call tree and `trace` messages were turned on.

Namespaces nest and are assigned in the order of registration (`init()` calls) to match the call tree. See [Filtering Branches](#filtering-branches) for an example.

## Subs
Sometimes you want to create namespaces a little more granularly, perhaps you would like to dependency inject a sandboxed version of your logger to an internal or external class. Well, this is easy:

```js
var log = require('logule').init(module, 'myFile');
var sandboxed = log.sub('CrazyClass').mute('debug');
// pass sandboxed logger to CrazyClass
```

A `log.sub()` will maintain the the default namespaces and mute settings of `log`. It can also optionally append one extra namespace to the ones existing, in this case, 'CrazyClass' will be appended.

Since the output of `var log = require('logule').init(module)`, `log.sub()` and `log.sub().sub()` (etc) all act similarly and on the same API, the variable `log` will in this document be used to refer to a logger instance that came from any of these origins.

## Configuration
Rich configuration of colors, style, date formatting and global muting of certain log levels are all available via config files. The [default configuration file](https://github.com/clux/logule/blob/master/.logule) (which *contains documentation*) results in output looking like the images herein.

Configs are located via [confortable](https://github.com/clux/confortable). Which is a module that performs priority based config searches. In particular, it is used here with the following path priorities:

- 1. execution directory
- 2a). if (`execDir` outside `$HOME`) `$HOME`
- 2b). if (`execDir` inside  `$HOME`) Up to and including `$HOME` in `..` increments
- 3. directory of `module.parent`

Step 3 enables modules to bundle their own default config which can be overriden by apps by utilizing step 2.

The found config file is merged carefully with the default config, so you don't have to include more in your config than you disagree with. Also note you cannot remove the default log levels (lest we break dependency injection).

### Date Formatting
How or if to prepend the date has been the most controversial choice previously made for you in early versions of logule. Those days are now gone, however, and multiple different date formatting types exist.

- `plain`     - prepends HH:MM:SS + delimiter via `toLocaleTimeString`
- `precision` - prepends HH:MM:SS:MSS + delimiter via above + padded `getMilliseconds`
- `method`    - prepends the result of any custom method on `Date.prototype`
- `none`      - nothing prepended; log output starts at type, e.g. the `INFO` part
- `custom`    - allows four extra settings

If `custom` set, you can also prepend the date to either `plain` or `precision`, i.e. prepend YYYY-MM-DD, possibly reversing it if you're american, and possibly changing the delimiter.

### Changing Colors
The following options affect output colors:

- `prefixCol` - namespace
- `dateCol`   - time and date
- `lineCol`   - location in .line()

Additionally `levels` define the color of the delimiter in each log method.
Every string used to describe colors must be exported by the `colors` module to work.

### Global Suppression
Set the `suppress` flag to globally turn all listed log methods into chaining no-ops.
Alternatively list the exceptions under `allow` instead and set `useAllow` to `true`.
See the [Branch based filtration](#branch-based-filtration) section for more granular control.
By default, `trace`, `debug` and `line` messages are suppressed.

### Stream JSON
If `logFile` is filled in, this file will be appended to with JSON log messages (one message per line). Thus, you can read the file and split by newline, or watch the file and emit/filter based on each JSON line you receive.

The individual JSON messages use the current format:

```js
{
  "date": "08:14:11",
  "level": "error",
  "namespaces": ["build"],
  "message": "message part, how it appeared in terminal"
}
```

## Instance Methods
### Defaults
The methods available on a logger instance are: `trace`, `debug`, `info`, `line`, `warn`, `error`, and `zalgo`. They only vary their delimiter color and some might be boldened depending on the config setting.

Note that `trace` and `debug` never outputs anything by default. It must be enabled in the config!

The mystical `zalgo` and `line` provide some specialized logic however:

### line()
Line is prepends the filename and line of caller (as a namespace). It fetches this info from the stack directly.

```js
var log = require('logule').init(module, 'broken');
log.debug('dumping lines to console');
log.line();
log.line();
```

![line output!](https://github.com/clux/logule/raw/master/imgs/line.png)

In this case, config suppression was disabled.

### zalgo()
[H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ](https://github.com/clux/dye#zalgo)

```js
log.zalgo('core melting')
```

![zalgo output!](https://github.com/clux/logule/raw/master/imgs/zalgo.png)

### get()
A debug module may only need `log.debug`. You can save typing, and enforce this behaviour by calling `.get('debug')` on an instance, to return the correctly bound instance method to pass down.

```js
var dbg = log.get('debug');
dbg("works like log.debug - but nothing else accessible via this non-chainging var");
```

NB 1: If `debug` is suppressed in the config, or it's `muted` somewhere up the call tree - then `.get('debug')` returns a _noop_.

NB 2: while you could do this with `log.debug.bind(log)`, this would chain and allow modules to break out of the constricted environment.

### mute()
Suppress logs for passed in methods.

```js
log.mute('warn', 'info');
log.info('muted').warn('muted').error('works');
```

### unmute()
Unmutes logs for passed in methods.

```js
log.mute('warn', 'info');
var l2 = log.sub('forModuleX').unmute('warn');
l2.warn('works!');
log.warn('muted');
```

Remember that you cannot unmute `trace` and `debug` unless it has been globally unsuppressed in the active .logule config.

### muteOnly()
A convenience for muting all levels passed in, and unmuting all others.

```js
log.muteOnly('debug', 'trace'); // unmutes everything except trace & debug
log.muteOnly(); // muteOnly nothing === unmute everything
```

### unmuteOnly()
A convenience for unmuting all levels passed in, and muting the others.

```js
log.unmuteOnly('error'); // mutes everything except error
log.unmuteOnly(); // unmuteOnly nothing === mute everything
```

## Branch Based Filtration
Controlling global levels is done via config files, but the levels not globally suppressed therein can temporarily muted/unmuted at any branch point and these settings will propagate down the call tree.


### Filtering Branches
The examples for mute/unmute only shows the basic API for using subs. You do not have to create subs and pass them down via dependency injection. You can of course do this, but if you write short modules, it's generally easier to let `init()` do the heavy lifting.

To get the most out of call tree filtration consider the following example of an application structure:

```
a.js
└──┬b.js
   └───c.js
```

When just using mute/unmute on an instance returned directly by `init()` logule will remember the call tree and apply the same rules to the ones further down the tree by default:

```js
// a.js
var l = require('logule').init(module, 'app').mute('info');
var b = require('./b');

// b.js
var l = require('logule').init(module);
var c = require('./c');
l.info('muted');
l.unmute('info');
l.info('works');

// c.js
var l = require('logule').init(module, 'leaf');
l.info('works');
```

With the following code, `a.js` sets the an app default of _no info messages_, which is overridden by `b.js`, and propagates to `c.js`. Note that the `app` namespace set in `a.js` propagates down to both `b.js` and `c.js`, but `c.js` will show two namespaces: `app` and `leaf` provided the config setting `nesting >= 2`.

Note that any `mute`/`unmute` calls to a `sub()` does not propagate to other files:

```js
// a.js as above
// b.js
var l = require('logule').init(module).sub().unmute('info');
l.info('works');

// c.js
var l = require('logule').init(module);
l.info('still muted');
```

In short tree based log levels is the safe, *overridable version* of log levels.
To enforce strict suppression of certain levels, the config file is the way to go, and by default, the config prevents unmuting of `trace` and `debug`.

### Muting Chatty Modules
Say you want to mute warnings in the file `c.js` above. If you own the file, you easily just edit the first line to be:

```js
// c.js
var l = require('logule').init(module).mute('warn', 'info');
```

However, if you don't own the file, perhaps it's deep down in the npm hierarchy for instance, you can propagate more simply from `b.js`.

```js
// b.js
var l = require('logule').init(module).mute('warn', 'info').sub().muteOnly();
var c = require('./c');
l.warn('unmuted, but down the call tree it is muted');
```

Here we mute the main logger from `b.js` (the one from `init`), but unmute everything on a `sub` that will be used inside this file to preserve the same behaviour inside `b.js` only.

### Unmuting New Modules
Essentially the inverse of [Muting chatty modules](#muting-chatty-modules), here we unmute one file above or in the file itself if we own it. Note that modules can safely write `trace` and `debug` messages since the default config mutes these.

## Colors
The ASNI color code wrapping and zalgolizer is provided by [dye](https://github.com/clux/dye), wheras it used to rely on `colors`. Dye does not introduce implicit global dependencies on `String.prototype`, and provides more sensible zalgolizations.

## Installation

```bash
$ npm install logule
```

## Running tests
Install development dependencies

```bash
$ npm install
```

Run the tests

```bash
$ npm test
```

## License
MIT-Licensed. See LICENSE file for details.
