"use strict";

var messages = [];

class ActionMessages {

	static post(id, message) {
		ActionMessages.remove(id);
		messages.push({
			id: id,
			message: message
		});
	}

	static get(id) {
		var index = ActionMessages.getIndex(id);
		return messages[index];
	}

	static remove(id) {
		var index = ActionMessages.getIndex(id);
		if (index < 0) return;
		return messages.splice(i, 1);
	}

	static getIndex(id) {
		for (var i = 0, l = messages.length; i < l; i++) {
			var messageId = messages[i].id;
			var found = true;
			for (var k in id) {
				if (id[k] != messageId[k]) {
					found = false;
					break;
				}
			}
			if (found) return i;
		}
		return -1;
	}
}

module.exports = GLOBAL.messages = ActionMessages;