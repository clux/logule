## Usage

````javascript
var Logger = require('logule');
var log new Logger('prefix');
log.error("this is an error message");
log.warn("warning").info("info msg").debug("chained debug");
````
![output!](https://github.com/clux/logule/raw/master/output.png)
### Padding
Padding of the prefix level can be done by setting the second parameter in the constructor to the indentation level you want.

````javascript
var log new Logger('prefix', 16);
````

Now, the actual log messages will all begin 16 characters after the prefix starts.
If the prefix is longer than the size limit, it will stand out from the crowd.

## License
MIT-Licensed. See LICENSE file for details.
