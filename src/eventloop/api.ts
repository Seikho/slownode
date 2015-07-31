import Types = require("slownode");
import errors = require("../errors");
import Knex = require("knex");

import store = require("../store/eventLoop");
import processEvent = require("./calls/run");
import flushEvent = require("./calls/flush");
import stopEvents = require("./calls/stop");
export = EventLoop;

class EventLoop implements Types.SlowEventLoop {

	constructor(public config: Types.EventLoopConfig) {
		// TODO: Move config validation to seperate module
		if (typeof config.pollIntervalMs !== "number") throw new TypeError(errors.MustBeNumber);
		if (config.pollIntervalMs < 50) throw new Error(errors.InvalidPollDelay);
		if (config.pollIntervalMs === Infinity) throw new Error(errors.NotInfinity)
	}

	ready: Promise<boolean> = Promise.delay(500).then(() => true);
	flushCallback: NodeJS.Timer;

	stop = stopEvents.bind(this);
	start = flushEvent.bind(this);

	addCall = store.add.bind(this);
	processCall = processEvent.bind(this);
	removeCall = store.remove.bind(this);
	getNextCall = store.getNext.bind(this);
}
