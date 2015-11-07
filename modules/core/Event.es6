"use strict";


var eventSymbol = Symbol("event"),
	instanceIter = 0,
	instanceCallbacks = {};

function ucWord(string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function registerInstance(instance) {
	if (! instance.hasOwnProperty(eventSymbol)) {
		instance[eventSymbol] = instanceIter;
		instanceCallbacks[instanceIter] = {};
		instanceIter++;
	}
}

function registerInstanceEvent(instance, event) {
	registerInstance(instance);
	if (! instanceCallbacks[instance[eventSymbol]].hasOwnProperty(event)) {
		instanceCallbacks[instance[eventSymbol]][event] = [];
	}
}

function pushInstanceEventCallback(instance, event, callback) {
	instanceCallbacks[instance[eventSymbol]][event].push(callback);
}

let Event = {

	mixin: function(definitions, Constructor) {
		Object.keys(definitions).forEach(name => {
			Constructor.prototype["on" + ucWord(name)] = function(callback) {
				registerInstanceEvent(this, name);
				pushInstanceEventCallback(this, name, callback);
				return this;
			};
		});
		return Constructor;
	},

	trigger: function(instance, event, data) {
		if (instance.hasOwnProperty(eventSymbol) && instanceCallbacks[instance[eventSymbol]].hasOwnProperty(event)) {
			instanceCallbacks[instance[eventSymbol]][event].forEach(callback => { callback.call(null, data); });
		}
	}

};

export { Event };
