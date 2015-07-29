import Types = require("event-loop");
export = get;

var get = (topicFilter: string, functionId: string) => {
	var self: Types.EventLoop = this;
	
	var topicHandlers = self.taskHandlers[topicFilter] || {};
	return topicHandlers[functionId] || null;
}