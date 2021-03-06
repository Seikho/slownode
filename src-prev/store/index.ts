export import addCall = require("./eventLoop/add");
export import nextCall = require("./eventLoop/next");
export import removeCall = require("./eventLoop/remove");

export import addListener = require("./listener/add");
export import getListeners = require("./listener/get");
export import removeListener = require("./listener/remove");
export import removeListeners = require("./listener/removeAll");

export import addFunction = require("./slowFunction/add");
export import addTimedFunction = require("./slowFunction/addTimed");
export import getFunction = require("./slowFunction/get");

export import addPromise = require("./promise/add");
export import getPromise = require("./promise/get");
export import rejectPromise = require("./promise/reject");
export import resolvePromise = require("./promise/resolve");