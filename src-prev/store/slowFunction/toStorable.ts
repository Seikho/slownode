import Types = require("slownode-prev");
import crypto = require("crypto");
import serialise = require("../../slowFunction/serialise");
export = toStorable;


function toStorable(slowFunction: Types.SlowFunction): Types.Schema.Function {
    var options = slowFunction.options || <Types.SlowOptions> {};
    
    var body = serialise(slowFunction.body);
    var id = slowFunction.id || generateFunctionId(body);
    var dependencies = JSON.stringify(options.dependencies || []);
    
    return {
        id: id,
        body: body,
        dependencies: dependencies,
        intervalMs: options.intervalMs || 0,
        retryCount: options.retryCount || 0,
        retryIntervalMs: options.retryIntervalMs || 0
    };
}


function generateFunctionId(body: string) {
    return crypto.createHash("md5")
        .update(body)
        .digest("hex");
}
