import Types = require("slownode-prev");
import settings = require("../../settings");
export = removeAll;

function removeAll(event: string) {
    return settings.connection("listener")
        .delete()
        .where("topic", "=", event);
}
