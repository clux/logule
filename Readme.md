# Logule
Logule is an advanced logging utility for nodejs. It is analogous to `console.log` and can take multiple arguments,
but additionally it prefixes the current time, the log level, and optionally, prefixed namespaces (with optional padding).

Shortcut methods for the log levels are available as `log.error`, `log.warn`, `log.info`, `log.debug` and `log.trace`.
These methods are additionally chainable.

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

![simple output!](https://github.com/clux/logule/raw/master/outputsimple.png)

## Namespaces
To add a namespace prefix, subclass logule and pass it in

````javascript
log = logule.sub('prefix')
log.error("this is an error message")
log.warn("warning").info("info msg").debug("chained debug");
````

![one namespace output!](https://github.com/clux/logule/raw/master/output.png)

### Multiple Namespaces
Pass in more strings to get more namespaces prefixed

````javascript
var log = logule.sub('BUILD', 'COMPILE');
log.debug('log has two prefixes');
logule.info("ancestor remains basic")
````

### Namespace Padding
Call `.pad(size)` on a logger instance to specify a fixed indentation level for the namespaces.

````javascript
log.pad(16);
log.warn('my namespaces are padded')
````

Messages will here begin 16 + delimiter size characters away from how it would log without a namespace.
Large namespaces (>specified size), will stand out from the crowd.

This allows you to line up the output from multiple logger instances.

For multiple namespaces, the size applies to each namespace. Padding will, in other words, only look good with strict naming conventions.

## Passing log around
### Subclasses
More advanced use of `.sub()` involve inheriting based on namespaces:

````javascript
var log = logule.sub('BUILD');
var sublog = log.sub('COMPILE');
````

`sublog` here could also be constructed with `logule.sub('BUILD', 'COMPILE')`,
but this would lose the link between `log` and `sublog`.

If the link is maintained via 'one sub at a time' style passing around, then it is easy to filter log output from large chunks of code at a time.

**`.sub()` is a new clone**:
`log.sub()` maintains all padding, suppressed log levels and namespace properties set on the original `log` instance.

### Filtering log
#### Standard Way
Suppressing logs from an instance is done in a very neat, propagating, and non-breaking way.
`.suppress(methods...)` suppresses output from specified methods, but still allows them to be called, and they still chain.

````javascript
log.suppress('debug', 'info');
log.warn('works').info('suppressed').error('works').debug('suppressed');
````

#### Simple Function way
A debug module will only need `log.debug`. You can `.get('debug')` on an instance to return the correctly bound instance method to pass down.

````javascript
var dbg = log.get('debug');
dbg("same as log.debug - no other methods accessible through this var");
````

Note that if `log` have called `.suppress('debug')` earlier - or if it is a `.sub()` of an instance that have called `.suppress('debug')`,
then you would only get a suppressed function from `.get('debug')`.

### Global Log Levels
By only using `.sub()` instances inheriting from a single base instance, you can implement global log levels at compile time by calling `.suppress()`
on the base instance - or any branch point you would like - at compile time.

````javascript
var log = require('logule').sub('APP');
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
