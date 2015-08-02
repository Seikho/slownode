import Promise = require("bluebird")
import fs = require("fs");
import db = require("./store/db");
var unlink = Promise.promisify(fs.unlink);
var readFile = Promise.promisify(fs.readFile);
export = stop;

function stop() {
	return databaseExists()
		.then(teardown);
}

function databaseExists() {
	return readFile("slownode.db")
		.then(() => true)
		.catch(() => false);
}

function teardown(exists: boolean) {
	if (!exists) return Promise.resolve(true);

	return db.destroy()
		.then(() => unlink("slownode.db"))
		.then(() => true)
		.catch(() => false);
}