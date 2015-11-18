"use strict";

import { isArray, isObject } from "./Utils.es6";

var readyCallbacks = [],
	readyBound = false,
	triggerReady = function() {
		var buffReadyCallbacks = readyCallbacks, i;
		readyCallbacks = [];
		for (i = 0; i < buffReadyCallbacks.length; i++) {
			buffReadyCallbacks[i].call(window);
		}
	},
	contentLoaded = function() {
		if (document.addEventListener) {
			document.removeEventListener("DomContentLoaded", triggerReady, false);
			triggerReady();
		} else if (document.attachEvent) {
			if (document.readyState === "complete") {
				document.detachEvent("onreadystatechange", contentLoaded);
			}
		}
	},
	bindReady = function() {
		if (readyBound) { return; }
		if (readyCallbacks.length) { return; }
		if (document.readyState === "complete") {
			return setTimeout(triggerReady, 1);
		}
		if (document.addEventListener) {
			document.addEventListener("DomContentLoaded", contentLoaded, false);
			window.addEventListener("load", triggerReady, false);
		} else if (document.attachEvent) {
			document.attachEvent("onreadystatechange", contentLoaded);
			window.attachEvent("onload", triggerReady);
		}
		readyBound = true;
	},
	getMatchingElement = function (root, selector, target) {
		var candidates = [].slice.call(root.querySelectorAll(selector));

		while (target != root && target) {
			if (candidates.indexOf(target) !== -1) {
				return target;
			}
			target = target.parentNode;
		}
		return null;
	},
	ccCache = {},
	toCamelCase = function(string) {
		if (! ccCache.hasOwnProperty(string)) {
			ccCache[string] = string.replace(/(.)\-([a-zA-Z])/g, function(b, pre, post) { return  pre + post.toUpperCase(); });
		}
		return ccCache[string];
	}, Dom;




// some of this stolen from jQuery
Dom = {
	fromId : function (id, doc) {
		if (doc === undefined) {
			doc = document;
		}
		return doc.getElementById(id);
	},

	isPixel : function (value) {
		return (/^-?[0-9]+(\.[0-9]+)?px$/i).test(value);
	},

	isNumber : function (value) {
		return (/^-?[0-9]+(\.[0-9]+)?$/).test(value);
	},

	text : function (elements) {
		var str = '',
			element = null,
			i;
		if (elements.nodeType) {
			elements = [elements];
		}
		for (i = 0; elements[i]; i++) {
			element = elements[i];
			if (element.nodeType === 3 || element.nodeType === 4) {
				str += element.nodeValue;
			} else if (element.nodeType !== 8) {
				str += Dom.text(element.childNodes);
			}
		}
		return str;
	},

	hasClass: function (element, className) {
		return ((" " + element.className + " ").replace(/[\n\t]/g, " ").indexOf(" " + className + " ") > -1);
	},

	addClass: function (element, className) {
		if (!Dom.hasClass(element, className)) {
			element.className += " " + className;
		}
	},

	removeClasses: function (element, classNames) {
		classNames.forEach(className => Dom.removeClass(element, className));
	},

	removeClass: function (element, className) {
		var classString = (" " + element.className + " ").replace(/[\n\t]/g, " ");
		className = " " + className + " ";
		classString = classString.replace(className, " ").replace(/^\s+|\s+$/g, '');
		element.className = classString;
	},

	removeElement: function (element) {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
		}
	},

	outputStyleValue: function (value) {
		if (value == "") {
			return "auto";
		}
		if (Dom.isPixel(value) || Dom.isNumber(value)) {
			return parseFloat(value);
		}
		return value;
	},

	inputStyleValue: function (value, property) {
		if (property == 'opacity') {
			return parseFloat(value);
		}
		if (Dom.isNumber(value)) {
			value += 'px';
		}
		return value;
	},

	hasAttr: function (element, attribute) {
		if (element.hasAttribute) {
			return element.hasAttribute(attribute);
		}
		return (element[attribute] !== undefined);
	},

	getAttr: function (element, attribute) {
		return element.getAttribute(attribute);
	},

	setAttr: function (element, attribute, value) {
		element.setAttribute(attribute, value);
	},

	setAttrs: function (element, map) {

		if (Utils.isIterable(map)) {
			Utils.forEach(map, function (value, key) {
				element.setAttribute(key, value);
			});
		}
	},

	withAttr: function (elements, attributes, value) {
		var output = [],
			shouldAdd;
		if (elements.nodeType) {
			elements = [elements];
		}
		Utils.forEach(elements, function (element) {
			shouldAdd = true;
			if (Utils.isArray(attributes)) {
				Utils.forEach(attributes, function (attribute) {
					if (!Dom.hasAttr(element, attribute)) {
						shouldAdd = false;
						return false;
					}
				});
			} else if (Utils.isObject(attributes)) {
				Utils.forEach(attributes, function (attrValue, attribute) {
					if (Dom.getAttr(element, attribute) != attrValue) {
						shouldAdd = false;
						return false;
					}
				});
			} else if (Utils.isUndefined(value)) {
				if (!Dom.hasAttr(element, attributes)) {
					shouldAdd = false;
				}
			} else {
				shouldAdd = (Dom.getAttr(element, attributes) == value);
			}

			if (shouldAdd) {
				output.push(element);
			}
		});
		return output;
	},

	findTags: function (elements, tag) {
		var out = [];
		if (Utils.isIterable(elements) && ! elements.nodeType) {
			Utils.forEach(elements, function (element) {
				var results = Dom.findTags(element, tag);
				out = Array.prototype.concat.apply(out, results);
			});
			return out;
		}
		return elements.getElementsByTagName(tag);
	},

	findTag: function (element, tag, nth) {
		var els = Dom.findTags(element, tag);
		if (nth === undefined) {
			nth = 0;
		}
		if (nth >= els.length) {
			return null;
		}
		return els[nth];
	},

	make: function (tagName, attributes, doc) {
		var element;
		if (doc === undefined) {
			doc = document;
		}
		element = doc.createElement(tagName);
		Utils.forEach(attributes, function (value, attribute) {
			if (attribute == 'children') {
				Utils.forEach(value, function (child) {
					if (! child.nodeType) {
						child = doc.createTextNode(child);
					}
					element.appendChild(child);
				});
			} else {
				element.setAttribute(attribute, value);
			}
		});
		return element;
	},

	attr: function (element, attributes, value) {
		var output = {};
		if (Utils.isArray(attributes)) {
			Utils.forEach(attributes, function (attrName) {
				output[attrName] = element.getAttribute(attrName);
			});
			return output;
		}

		if (Utils.isIterable(attributes)) {
			Dom.setAttrs(element, attributes);
		} else if (!Utils.isUndefined(value)) {
			Dom.setAttr(element, attributes, value);
		} else {
			return Dom.getAttr(element, attributes);
		}
	},

	empty: function (element) {
		while (element.firstChild) {
			element.removeChild(element.firstChild);
		}
	},

	remove: function (element) {
		if (element.parentNode) {
			element.parentNode.removeChild(element);
		}
	},

	insertBefore: function(element, ref) {
		ref.parentNode.insertBefore(element, ref);
	},

	insertAfter: function(element, ref) {
		if (ref.parentNode.lastChild == ref) {
			ref.parentNode.appendChild(element);
		} else {
			ref.parentNode.insertBefore(element, ref.nextSibling);
		}
	},

	style: function (element, keys, value) {
		if (Utils.isObject(keys)) {
			Dom.setStyles(element, keys);
			return;
		}
		if (value !== undefined) {
			Dom.setStyle(element, keys, value);
			return;
		}
		return Dom.getStyle(element, keys);
	},

	setStyles: function (element, map) {
		if (Utils.isObject(map)) {
			Utils.forEach(map, function (value, key) {
				Dom.setStyle(element, key, value);
			});
		}
	},

	setStyle: function (element, key, value) {
		value = Dom.inputStyleValue(value, key);
		element.style[toCamelCase(key)] = value;
		element.style[key] = value;
	},

	getStyle : (function () {
		if (document.defaultView && document.defaultView.getComputedStyle) {
			return function (element, keys) {
				var defaultView = element.ownerDocument.defaultView,
					computedStyle, out = {},
					i, key;
				if (!defaultView) {
					return undefined;
				}
				computedStyle = defaultView.getComputedStyle(element, null);
				if (computedStyle) {
					if (isArray(keys)) {
						keys.forEach(key => {
							out[key] = Dom.outputStyleValue(computedStyle.getPropertyValue(key));
						});
					} else if (keys) {
						// get css
						out = Dom.outputStyleValue(computedStyle.getPropertyValue(keys));
					} else {
						for (i = 0; i < computedStyle.length; i++) {
							key = computedStyle[i];
							out[key] = Dom.outputStyleValue(computedStyle.getPropertyValue(key));
						}
					}
					return out;
				}
			};
		}
		if (document.documentElement.currentStyle) {
			return function (element, keys) {
				var out = null;

				if (Utils.isArray(keys)) {
					out = {};
					Utils.forEach(keys, function (key) {
						out[key] = Dom.outputStyleValue(element.currentStyle[key]);
					});
				} else {
					out = Dom.outputStyleValue(element.currentStyle[keys]);
				}
				return out;
			};
		}
		return null;
	}()),

	width: function (element, size) {
		var clientWidth, widths = [];
		if (Dom.isWindow(element)) {
			clientWidth = element.document.documentElement.clientWidth;
			return (element.document.compatMode === 'CSS1Compat' && clientWidth) || element.document.body.clientWidth || clientWidth;
		}
		if (Dom.isDocument(element)) {
			widths = [element.documentElement.clientWidth, element.documentElement.scrollWidth, element.documentElement.offsetWidth];
			if (element.body) {
				widths.push(element.body.scrollWidth);
				widths.push(element.body.offsetWidth);
			}
			return Math.max.apply(Math, widths);
		}
		if (size === undefined) {
			return Dom.getStyle(element, 'width');
		}
		Dom.setStyle(element, 'width', size);
	},

	swap: function(removeEl, addEl) {
		if (! removeEl.parentNode) {
			throw new Error("Cannot swap element");
		}
		removeEl.parentNode.insertBefore(addEl, removeEl);
		addEl.parentNode.removeChild(removeEl);
	},

	height: function (element, size) {
		var clientHeight, heights = [];
		if (Dom.isWindow(element)) {
			clientHeight = element.document.documentElement.clientHeight;
			return (element.document.compatMode === 'CSS1Compat' && clientHeight) || element.document.body.clientHeight || clientHeight;
		}
		if (Dom.isDocument(element)) {
			heights = [element.documentElement.clientHeight, element.documentElement.scrollHeight, element.documentElement.offsetHeight];
			if (element.body) {
				heights.push(element.body.scrollHeight);
				heights.push(element.body.offsetHeight);
			}
			return Math.max.apply(Math, heights);
		}
		if (size === undefined) {
			return Dom.getStyle(element, 'height');
		}
		Dom.setStyle(element, 'height', size);
	},

	bind: function (element, type, callback, useCapture) {
		if (element.addEventListener) {
			element.addEventListener(type, callback, useCapture);
		} else if (element.attachEvent) {
			element.attachEvent('on' + type, callback);
		}
	},

	listen : function (root, selector, type, callback) {
		Dom.bind(root, type, function(e) {
			var match = getMatchingElement(root, selector, e.target);
			if (match) {
				callback.call(match, e);
			}
		});
	},

	size: function (element, size) {
		if (size !== undefined) {
			if (size.width) {
				Dom.width(element, size.width);
			}
			if (size.height) {
				Dom.height(element, size.height);
			}
		} else {
			return {
				width: Dom.width(element),
				height: Dom.height(element)
			};
		}
	},

	onResize: function(callback) {
		window.addEventListener('resize', callback);
	},

	onReady: function(callback) {
		bindReady();
		readyCallbacks.push(callback);
	},

	isWindow: function (element) {
		return element && (typeof element === "object") && (element.setInterval);
	},

	isDocument: function (element) {
		return (element.nodeType && element.nodeType === 9);
	},

	position: function(element) {

		var xPosition = 0,
			yPosition = 0;

		while(element) {
			xPosition += (element.offsetLeft + element.clientLeft);
			yPosition += (element.offsetTop + element.clientTop);
			element = element.offsetParent;
		}
		return { left: xPosition, top: yPosition };

	}
};

export { Dom };