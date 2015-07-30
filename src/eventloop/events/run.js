function run(event) {
    var self = this;
    if (!event) {
        self.flushCallback = setTimeout(function () { return self.start(); }, self.pollInterval);
        return Promise.resolve(true);
    }
    var runPromise = Promise.resolve(true);
    self.subscribers.forEach(function (sub) {
        runPromise.then(function () { return execute(sub, event); });
    });
    return runPromise;
}
;
function execute(subscriber, event) {
    //TODO: Update db according to subscriber config
    return subscriber.callback(event.event)
        .then(function () { return true; });
}
module.exports = run;
//# sourceMappingURL=run.js.map