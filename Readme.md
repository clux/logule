# Logule
Logule is an advanced logging utility for nodejs. It is analogous to `console.log` and can take multiple arguments,
but additionally it prefixes the current time, the log level, and optionally, prefixed namespaces (with optional padding).

Shortcut methods for the log levels are available as `log.error`, `log.warn`, `log.info`, `log.debug` and `log.trace`.
These methods are additionally chainable.

## Usage
Here's with a single prefixed namespace:

````javascript
var Logger = require('logule');
var log = new Logger('prefix');
log.error("this is an error message");
log.warn("warning").info("info msg").debug("chained debug");
````
![output!](https://github.com/clux/logule/raw/master/output.png)
### No Namespace
If Logger is instantiated with no constructor arguments, then the output will simply not contain any prefixes and remove one delimiter.
Everything will be aligned automatically.

### Multiple Namespaces
Pass in more strings to get more namespaces prefixed

````javascript
var log = new Logger('BUILD', 'COMPILE');
log.debug('Coffee app.coffee');
````

### Namespace Padding
Call `.pad(size)` on a logger instance to specify a fixed indentation level for the namespaces.

````javascript
var log = new Logger('BUILD').pad(16);
````

Messages will here begin 16 + delimiter size characters away from how it would log without a namespace.
Large namespaces (>specified size), will stand out from the crowd.

This allows you to line up the output from multiple logger instances.

For multiple namespaces, the size applies to each (present) level. Padding will, in other words, only work with strict naming conventions.

## Passing log around
### Subclasses
Easiest with multiple namespaces; call `.sub()` and old namespaces will be preserved.

````javascript
var log = new Logger('BUILD');
var sublog = log.sub('COMPILE'); // same as new Logger('BUILD', 'COMPILE')
````

A call to `.sub()` without arguments will simply maintain existing namespace(s).

This is better than creating brand new ones, because you can filter away certain log messages by simply filtering on the base logger at compile time.

Essentially: **Sub is a new Clone**:
`log.sub()` maintains all padding, suppress and namespace properties set on the original log.

### Filtering log
#### Standard Way
Suppressing logs from an instance is done in a very neat, propagating, and non-breaking way.
`.suppress(methods...)` returns a `sub()` suppresses output from specified methods, but still allows them to be called, and they still chain.

````javascript
var sublog = log.suppress('debug', 'info');
sublog.warn('works').info('suppressed').error('works!');
log.info('works');
````

#### Simple Function way
A debug module will only need `log.debug`. You can `.get('debug')` on an instance to return the correctly bound instance method to pass down.

````javascript
var debug = log.get('debug');
debug("same as log.debug - no other methods accessible through this var");
````

Note that if the instance have called `.suppress('debug')` earlier - or it is a `.sub()` of an instance that have called `.suppress('debug')`,
you would still get a working function from `.get('debug')`. Its output, would on the other hand, be suppressed.

### Global Log Levels
By only using `.sub()` instances inheriting from a single base instance, you can implement global log levels at compile time by calling `.suppress()`
on the base instance - or any branch point you would like - at compile time.

````javascript
var log = new Logger('APP');
/**
 * // Uncomment this globally suppress:
 * log.suppress('info','debug');
**/
var modelsLog = log.sub('MODEL');
var eventsLog = log.sub('EVENT');
//pass the two log instances down
````

## Zalgo
H̸̡̪̯ͨ͊̽̅̾̎Ȩ̬̩̾͛ͪ̈́̀́͘ ̶̧̨̱̹̭̯ͧ̾ͬC̷̙̲̝͖ͭ̏ͥͮ͟Oͮ͏̮̪̝͍M̲̖͊̒ͪͩͬ̚̚͜Ȇ̴̟̟͙̞ͩ͌͝S̨̥̫͎̭ͯ̿̔̀ͅ

````javascript
log.zalgo("all is lost");
````

## Installation

````bash
$ npm install logule
````

## License
MIT-Licensed. See LICENSE file for details.
