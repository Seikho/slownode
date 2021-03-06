import Types = require("slownode-prev");
import store = require("../store/index");

export = interval;

function interval(func: () => any, delayMs: number, options?: Types.SlowOptions) {
    options = options || {};
    options.runAt = Date.now();
    options.intervalMs = delayMs;

    return store.addTimedFunction({
        body: func,
        options: options
    });
}