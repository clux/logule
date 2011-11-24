# Logule
Logule is an advanced logging utility for nodejs. It is analogous to `console.log` and can take multiple arguments,
but additionally it prefixes the current time, the log level, and optionally, a caller prefix.

## Usage
Here's with a prefix:

````javascript
var Logger = require('logule');
var log = new Logger('prefix');
log.error("this is an error message");
log.warn("warning").info("info msg").debug("chained debug");
````
![output!](https://github.com/clux/logule/raw/master/output.png)
### Prefix Padding
Padding of the prefix level can be done by setting the second parameter in the constructor to the indentation level you want.

````javascript
var log = new Logger('prefix', 16);
````

Now, the actual log messages will all begin 16 characters after the prefix starts.
If the prefix is longer than the size limit, it will stand out from the crowd.

This is useful when different Logger instances is created in different places with different prefixes, and you want to line up the output.

### No Prefix
If Logger is instantiated with no constructor arguments, then the output will simply not contain any prefixes and remove one delimiter.
Everything will be aligned automatically.

## Passing log around
To give submodules full control over what to send to the logger, simply pass down the log variable to them.

If, however, you only want a submodule to be able to log debugs for instance, you can make a sanitized logger function for them without access to .error, .warn and .info.

````javascript
var debug = function(){
  return log.debug.apply(log, arguments);
};
````

## Installation

````bash
$ npm install logule
````

## License
MIT-Licensed. See LICENSE file for details.
