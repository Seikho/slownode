import Types = require("slownode-prev");
import settings = require("../../settings");
export = remove;

function remove(event: string) {
    return settings.connection("listener")
        .delete()
        .where("topic", "=", event)
        .limit(1);
}
