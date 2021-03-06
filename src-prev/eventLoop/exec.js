var EventLoop = require("./index");
var store = require("../store/index");
var deserialise = require("../slowFunction/deserialise");
var settings = require('../settings');
function callFunc(funcCall) {
    var startTime = Date.now();
    if (!funcCall) {
        settings.flushCallback = setTimeout(function () { return EventLoop.flush(); }, settings.configuration.pollIntervalMs);
        return Promise.resolve(true);
    }
    return getSlowFunc(funcCall.funcId)
        .then(function (func) { return createCall(func, funcCall); });
}
function getSlowFunc(funcId) {
    return store.getFunction(funcId)
        .then(cacheFunc);
}
function cacheFunc(rawFunc) {
    var deserialisedFunc = deserialise(rawFunc);
    return deserialisedFunc;
}
function createCall(slowFunc, call) {
    var args = JSON.parse(call.arguments);
    var result = slowFunc.body.apply(slowFunc.body, args);
    return result;
}
module.exports = callFunc;
//# sourceMappingURL=exec.js.map