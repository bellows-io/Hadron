"use strict";

function isArray(data) {
	return (Object.prototype.toString.call(data) == "[object Array]");
}
function isObject(data) {
	return (data instanceof Object) && ! isArray(data);
}
function isString(data) {
	return (typeof data === "string");
}
var escapeNode = document.createElement('div');
function escapeHTML(text) {
	escapeNode.innerHTML = '';
	escapeNode.appendChild(document.createTextNode(text));
	return escapeNode.innerHTML;
}

function trim(str) {
	if (typeof str !== 'string') {
		str = Object.prototype.toString.call(str);
	}
	return str.replace(/^\s+|\s+$/g, '');
}

function ucWord(str) {
	if (typeof str !== 'string') {
		str = Object.prototype.toString.call(str);
	}
	return str.charAt(0).toUpperCase() + str.slice(1);
}

export { isArray, isObject, isString, trim, escapeHTML, ucWord };
