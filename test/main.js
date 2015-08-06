var SlowNode = require("../src/index");
var errors = require("../src/errors");
var chai = require("chai");
var expect = chai.expect;
SlowNode.DEBUG = true;
var loop;
describe("EventLoop behaviour tests", function () {
    it("will remove the previous database before starting", function (done) {
        SlowNode.stop()
            .then(function (result) { return expect(result).to.be.true; })
            .then(function () { return done(); })
            .catch(done);
    });
    it("will throw when provided a non-number polling delay", function () {
        var delay = "string";
        expect(start.bind(start, delay)).to.throw(errors.MustBeNumber);
    });
    it("will throw when provided <50 polling delay", function () {
        expect(start.bind(start, 49)).to.throw(errors.InvalidPollDelay);
    });
    it("will throw when provided polling delay of infinity", function () {
        expect(start.bind(start, Infinity)).to.throw(errors.NotInfinity);
    });
    it("will create an instance of EventLoop and create the database", function (done) {
        start(100)
            .then(function (result) { return expect(true).to.equal(result); })
            .then(function () { return done(); })
            .catch(done);
    });
    it("will have SlowNode implicitly available in a SlowFunction", function (done) {
        SlowNode.setImmediate(function () {
            this.chai.expect(SlowNode).to.exist;
        }, dep());
        wait(done);
    });
    it("will create an immediate function call with injected reference", function (done) {
        SlowNode.setImmediate(function () {
            this.chai.expect(this.h.STATUS_CODES['200']).to.equal("OK");
        }, dep("h", "http"));
        wait(done);
    });
    it("will create an immediate function call with injected value", function (done) {
        SlowNode.setImmediate(function () {
            this.chai.expect(this.injectedValue).to.equal("OK");
        }, dep("injectedValue", null, "OK"));
        wait(done);
    });
    it("will create and call a function with a delay", function (done) {
        var start = Date.now();
        SlowNode.setTimeout(function () {
            var diff = Date.now() - this.start;
            this.chai.expect(diff).to.be.above(249);
            this.chai.expect(diff).to.be.below(500);
        }, 250, dep("start", null, start));
        wait(done);
    });
    it("will create an event listener then emit an event with an argument", function (done) {
        var func = function (arg) {
            this.chai.expect(arg).to.equal("argument");
        };
        SlowNode.EventEmitter.once("test", func, dep())
            .then(function (res) { return expect(res).to.be.equal(true); })
            .then(function () { return SlowNode.EventEmitter.emit("test", "argument"); });
        wait(done);
    });
});
function wait(done) {
    setTimeout(function () { return done(); }, 500);
}
function start(pollIntervalMs, retryCount, retryIntervalMs) {
    retryCount = retryCount || null;
    retryIntervalMs = retryIntervalMs || null;
    return SlowNode.start({
        pollIntervalMs: pollIntervalMs,
        retryCount: retryCount,
        retryIntervalMs: retryIntervalMs
    });
}
function dep(as, reference, value) {
    var dep = {
        dependencies: [
            { reference: "chai", as: "chai " }
        ]
    };
    if (!as)
        return dep;
    if (reference == null)
        dep.dependencies.push({ as: as, value: value });
    else
        dep.dependencies.push({ as: as, reference: reference });
    return dep;
}
//# sourceMappingURL=main.js.map