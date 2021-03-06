import Types = require("slownode-prev");
import store = require("../store/index");
import deserialise = require("./deserialise");
export = callback;

function callback(functionId: string, ...args: any[]): Promise<any> {
    var opts: Types.SlowOptions = {
        arguments: args,
        runAt: 0
    };
    
    return store.getFunction(functionId)
        .then(deserialise)
        .then(func => func.body.apply(func.body, args))
}