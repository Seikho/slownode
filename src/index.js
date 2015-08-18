var fs = require('fs');
var path = require('path');
var databaseLocation = require('./databaseLocation');
var SlowRoutineFunction = require('./slowRoutine/slowRoutineFunction');
// Resume the current epoch (if DB exists) or start a new epoch (if no DB).
// NB: Module initialisation must be synchronous, so we use only sync methods here.
try {
    var templateLocation = path.join(__dirname, '../empty.db');
    fs.statSync(templateLocation);
}
catch (ex) {
    // Start a new epoch by copying from the empty template database (synchronously).
    fs.writeFileSync(databaseLocation, fs.readFileSync(templateLocation));
}
// Connect to the database
var db = require('./knexConnection');
// TODO: temp testing... Build the API for export...
var api = {};
api.SlowRoutineFunction = SlowRoutineFunction;
module.exports = api;
//# sourceMappingURL=index.js.map