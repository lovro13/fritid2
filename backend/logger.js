// Shim for JS files while we migrate to TS.
const loggerModule = require('./logger.ts');
module.exports = loggerModule.default || loggerModule;
