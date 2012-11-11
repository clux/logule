# Logule [![Build Status](https://secure.travis-ci.org/clux/logule.png)](http://travis-ci.org/clux/logule)

Logule is a pretty, but heavily configurable logging utility for nodejs. It allows multiple transports (stdout + JSON filestream + emitted logs) as well as being configurable per user, per app and per module via localized config files.

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
* [Logging Methods](#logging-methods)
  * [debug()](#debug)
  * [line()](#line)
  * [trace()](#trace)
  * [info()](#info)
  * [warn()](#warn)
  * [error()](#error)
  * [zalgo()](#zalgo)
  * [get()](#getlevel--namespace)
* [Mute API](#mute-api)
  * [mute()](#mute)
  * [unmute()](#unmute)
  * [muteOnly()](#muteonly)
  * [unmuteOnly()](#unmuteonly)
* [Configuration](#configuration)
  * [Transports](#transports)
    * [stdout](#stdout)
    * [Emitter](#emitter)
    * [Filestream](#filestream)
  * [Style & Formatting](#style--formatting)
  * [Timestamps](#timestamps)
  * [Global Suppression](#global-suppression)
* [Branch Based Filtration](#branch-based-filtration)
  * [Filtering Branches](#filtering-branches)
  * [Muting Chatty Modules](#muting-chatty-modules)
  * [Unmuting New Modules](#unmuting-new-modules)
* [Colors](#colors)
* [npm Usage](#npm-usage)
* [Installation](#installation)
* [Running Tests](#running-tests)
* [License](#license)

## Basic Usage
File scope usage; pass down the `module` object at the start.

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
log.trace("Trying to compile client.js");
log.error("Failed");
```

**Namespaces inherit from the call tree in order of registration.** If your entry point required the 'BUILD' module, and this has a namespace, then 'BUILD' becomes the next namespace in the chain. When printing to `stdout` there's a default limit of nesting printed out of 3.

![one namespace output!](https://github.com/clux/logule/raw/master/imgs/output.png)

In this case, the entry point that required 'BUILD' had no namespace. See [Filtering Branches](#filtering-branches) for a more detailed example of how namespaces nest.

## Subs
Subs are copies of logger instances that do not save settings to the call tree.
This allows you to have muted/unmuted logger instances inside a particular file without inadvertently muting or unmuting levels (resp.) from dependent modules.

```js
var log = require('logule').init(module, 'myFile');
var spammy = log.sub('spammy').unmute('trace');
// pass spammy logger to external/internal code
```

A `log.sub()` will maintain the the original namespaces and mute settings of `log` as well as config suppressions (so unmute does not override config `suppress`). It can also optionally append one extra namespace to the ones existing, in this case, 'external' will be appended.

See [Filtering Branches](#filtering-branches) for a more detailed example of how subs are used.

## Logging Methods
There are 7 log levels (and one method getter) available available on `log`:

### debug()
For debug info to help out during bad times. Suppressed by default, safe to leave in.

### line()
For temporary debug messages that you sprinkle liberally throughout your nasty functions.
Prepends filename.js:lineNum to the message.
Note these fetch new stacks at each call and are not meant to be used in production. They are always shown in the default config, so don't leave these in code.

```js
var log = require('logule').init(module, 'broken');
log.debug('dumping lines to console');
log.line();
log.line();
```

![line output!](https://github.com/clux/logule/raw/master/imgs/line.png)

### trace()
For info messages that are too common to see all the time. Suppressed by default, safe to leave in.

### info()
For messages that show events/standard progressions.
These will be shown by default in any module you embed logule in when installed on a new box (i.e. without a custom config).
Ensure you're not talking when you should not need to - consider `trace.

### warn()
For warnings. Shown by default.

### error()
For errors. Shown by default in bold. Not meant to handle Error objects, just the logging please.

### zalgo()
[H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ](https://github.com/clux/dye#zalgo)

```js
log.zalgo('core melting')
```

![zalgo output!](https://github.com/clux/logule/raw/master/imgs/zalgo.png)

Disclaimer; this is mostly for fun. Find your own use case or suppress it. Note that zalgolization is only applied to stdout, not to the `filestream` or `emitter` transports.


### get(level [, namespace])
Levels can be retrieved as single functions that do not chain by using this method.
Useful if you have a debug module that only needs `log.debug`, so you can pass down a perhaps namespaced function to it.

```js
var dbg = log.get('debug');
dbg("works like log.debug - but this function does not chain and expose other methods");
```

Note that `get()` result obeys the mute API and config suppression entirely like the individual level methods.

*Warning:* while you simulate this with `log.debug.bind(log)`, this would chain and allow modules to break out of the constricted environment.

## Mute API
These methods are shortcuts for modifying the private list of muted levels.
Muting affects by default `stdout` and `filestream`, but the config allows changing this to any combination of transports being affected.

### mute()
Suppress logs for passed in methods.

```js
log.mute('warn', 'info');
log.info('muted').warn('muted').error('works');
```

### unmute()
Unmutes logs for passed in methods.

```js
log.mute('warn');
var l2 = log.sub('forModuleX').unmute('warn', 'info');
log.warn('muted');
l2.warn('works!');
```

NB: unmute does not override config suppression. It has lower precedence.

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

## Configuration
Configuration of colors, style, date formatting, transports, setting mutability and global suppression levels are done via via config files. The [default configuration file](https://github.com/clux/logule/blob/master/.logule.json) results in output looking like the images herein.

Configs are located via the [confortable](https://github.com/clux/confortable) module. This module performs priority based config searches. In particular, it is used here with the following path priorities:

- 1. execution directory
- 2a). if (`execDir` outside `$HOME`) `$HOME`
- 2b). if (`execDir` inside  `$HOME`) Up to and including `$HOME` in `..` increments
- 3. directory of `module.parent`

Step 3 enables modules to bundle their own default config which can be overriden by apps by utilizing step 2.

The found config file is merged one level deep with the default config, so you don't have to include more in your config than what you disagree with.

### Transports
Logule supports 3 transports: `stdout`, `filestream` and `emitter`.
These all have similar options in the config, but by default only `stdout` is enabled.

**NB: Logule does not strip colors.** If you log pre-colored strings, those colors will show up in the other transports as well!

All transports have the following options:

- `suppress`  - list of levels to globally suppress from the transport
- `mutable`   - a boolean to indicate whether the mute API affects the transport
- `timestamp` - an object/string to indicate timesta

#### stdout
All logs are by default written directly to `process.stdout`

#### Emitter
If `emitter` has an `enabled` attribute set to `true`, logule will expose an `EventEmitter` instance on `require('logule').stream`.

Then you can listen to `"log"` events:

```js
var logule = require('logule');
var e = logule.emitter;
var log = logule.init(module);
e.on('log', function (obj) {
  // plain replacement logging
  console.log(obj.time.valueOf() + ' - ' + obj.level + ' - ' + obj.message);
});
```
The types of the keys in `obj` are as follows:

```js
{
  time : Date
  level: String
  namespaces : Array of Strings
  message : String
}
```

In the case of level being `'line'`, a `line` key is also available with the short location identifier string `line()` typically outputs.

#### Filestream
If `filestream` has a `file` attribute filled in (with a cwd relative path), this file will be appended to with JSON log messages (one message per line - so JSON.parse forEach line in file.split('\n') will work).

By default the individual JSON messages use the current format:

```js
{
  "time": "2012-11-08T11:08:25.092Z",
  "level": "error",
  "namespaces": ["build"],
  "message": "message part, without stdout formatting"
}
```

Where the `time` value may differ depending on the `timestamp` config option.

NB: A `"line"` key is present if level is `"line"` like in the EventEmitter.

### Style & Formatting
The [first four blocks](https://github.com/clux/logule/blob/master/.logule.json#L2-22) in the default config describes the default style set used by the `stdout` transport and are all of the form `levelName : fn` where `fn` is any function in the module [dye](https://github.com/clux/dye). Functions can even be composed by delimiting them with a dot; e.g. `bold.blue`.

The `delimiters` object contains the subtle default styling of the delimiters joining the optional timestamp, the log level, the optional namespaces and the message.

The `levels` object contain the styling for the log levels. By default we only apply `bold` to the critical messages.

The `messages` object contain styling fot the messages (i.e. the result of `util.format(args..)`). By default only zalgo gets message level formatting.

The `colors` object contain the misc. styling used:

- `namespace` - the default blue namespaces
- `timestamp` - the default grey optional timestamp
- `callsite`  - the default green file.js:line prefix added by .line()


NB: Levels already listed in the `delimiters`, `levels` or `messages` objects, can be disabled by overriding them in your personal/module's config with the value of `"none"`.

### Timestamps
Timestamps can be configured via the "timestamp" key in the config which is overloaded as follows:

- `"none"`     - nothing prepended; log output starts at type, e.g. the `INFO` part
- `precision`  - prepends HH:MM:SS:MSS + delimiter via above + padded `getMilliseconds`
- `dateMethod` - prepends the result of any custom method on `Date.prototype`
- `object`     - full customization mode

Example of using the custom mode:

```js
"timestamp": {
  "date"      : true,
  "reverse"   : false,
  "delimiter" : "-",
  "precise"   : false
}
```

This prepends the date, in the form YYYY-MM-DD (i.e. normal non-reversed european style), and adds the timestamp after the date without precision (i.e. just `toLocaleTimeString`).

Most sensible methods on `Date.prototype` are:

- `toJSON` - default for file
- `valueOf`
- `toLocaleTimeString` - default for stdout
- `toGMTString`

Note that the first two can be perfectly serialized/deserialized with `Date.parse` and are thusly a good format for the filestream JSON transport.

### Global Suppression
Set the `suppress` flag to globally turn all listed log methods into chaining no-ops.
Alternatively list the exceptions under `allow` instead if you like to suppress most levels.
See the [Branch based filtration](#branch-based-filtration) section for more granular control.
By default, `trace` and `debug` messages are suppressed.


## Branch Based Filtration
Controlling global levels is done via config files, but the levels not globally suppressed therein can temporarily muted/unmuted at any branch point and these settings will propagate down the call tree.

**NB: The following techniques require your disired transport(s) to be `mutable` in the config.**

### Filtering Branches
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

With the following code, `a.js` sets the an app default of _no info messages_, which is overridden by `b.js`, so the unmute propagates to `c.js`. Note that the `app` namespace set in `a.js` propagates down to both `b.js` and `c.js`, but `c.js` will show two namespaces: `app` and `leaf` provided the config setting `nesting >= 2`.

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
To enforce strict suppression of certain levels, the config file is the way to go.

### Muting Chatty Modules
Say you want to mute warnings in the file `c.js` above. If you own the file, you easily just edit the first line to be:

```js
// c.js
var l = require('logule').init(module).mute('warn', 'info');
```

However, if you don't own the file, perhaps it's deep down in the npm hierarchy for instance, you can propagate more simply from `b.js`.

```js
// b.js
var l = require('logule').init(module).mute('warn', 'info').sub().unmute('warn', 'info');
var c = require('./c');
l.warn('unmuted, but down the call tree it is muted');
```

Here we mute main logger from `b.js` (the one from `init`), but unmute a `sub` that will be used inside this file to preserve the same behaviour inside `b.js` only.

### Unmuting New Modules
Essentially the reverse process of [Muting chatty modules](#muting-chatty-modules), there are two cases, you own the file c.js (modify imports line to mute it):

```js
// c.js
var l = require('logule').init(module, 'leaf').unmute('info');
l.info('works');
```

Or if you don't own the file (so unmute above in the hierarchy):

```js
// b.js
var l = require('logule').init(module).unmute('info').sub().mute('info');
l.info('works');
```

This preserves muting of `b.js`, but opens up for its descendants.

## Colors
The ASNI color code wrapping and zalgolizer is provided by [dye](https://github.com/clux/dye), wheras it used to rely on `colors`. Dye does not introduce implicit global dependencies on `String.prototype`, and provides more sensible zalgolizations.

## npm Usage
When logging with `logule >=2` inside an npm published library/executable, the practice is to put `logule` inside `package.json` `peerDependencies` and NOT the normal `dependencies`. This ensures all modules use the same code and thus logule can encapsulate everything needed to process ALL the logs an application uses. Logule's API is stable, so simply restricting to `"logule": "~2"` will suffice.

In `"logule": "~1"`, bundling of separate copies per npm module was the standard and so logule then adopted the method of communicating with other copies via `process.logule` to compensate for not having any one central piece of code where all logs went through. Ultimately, decisions were being made on behalf of the config so this worked well.

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
