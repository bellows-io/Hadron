"use strict";

import { isArray, isObject } from "./Utils.es6";

var Xml, FormData, Json;

Json = {
	encode: function(data) {
		return JSON.stringify(data);
	},
	decode: function(string) {
		return JSON.parse(string);
	}
};

Xml = {
	/* stolen from jQuery */
	decode: function(text) {
		var parser, xmlDoc = null;
		if (! text || (typeof text) != "string") {
			return null;
		}
		try {
			if (window.DOMParser) {
				parser = new window.DOMParser();
				xmlDoc = parser.parseFromString(text, "text/xml");
			} else { // IE lt 10
				xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
				xmlDoc.async = false;
				xmlDoc.loadXML(text);
			}
		} catch (ignore) {}
		if (xmlDoc && xmlDoc.documentElement && ! xmlDoc.getElementsByTagName('parsererror').length) {
			return xmlDoc;
		}
		throw new Error("Invalid XML: " + text);
	},
	encode: function(xmlDoc) {
		if (window.ActiveXObject) {
			return xmlDoc.xml;
		}
		return new window.XMLSerializer().serializeToString(xmlDoc);
	}
};

FormData = (function() {

	function encodeScalarValue(scalar) {
		if (scalar === undefined || scalar === null || scalar === false) {
			return '';
		}
		if (scalar === true) {
			return '1';
		}
		return encodeURIComponent(scalar);
	}

	function encode(data, inputKeyPrefix) {
		var s = [],
			key, value, key2, keyPrefix;

		if (!(isArray(data) || isObject(data))) {

			if (inputKeyPrefix === undefined) {
				return encodeScalarValue(data);
			}
			return encodeURIComponent(inputKeyPrefix) + '=' + encodeScalarValue(data);
		}
		for (key in data) {
			if (data.hasOwnProperty(key)) {
				if (inputKeyPrefix === undefined) {
					keyPrefix = key;
				} else {
					keyPrefix = inputKeyPrefix + '[' + key + ']';
				}

				value = data[key];
				if (isArray(value)) {
					for (key2 = 0; key2 < value.length; key2++) {
						s.push(encode(value[key2], keyPrefix + '[' + key2 + ']'));
					}
				} else if (isObject(value)) {
					for (key2 in value) {
						if (value.hasOwnProperty(key2)) {
							s.push(encode(value[key2], keyPrefix + '[' + key2 + ']'));
						}
					}
				} else {
					s.push(encodeURIComponent(keyPrefix) + '=' + encodeScalarValue(value));
				}
			}
		}
		return s.join('&');
	}

	/**
	 * If an objects set of keys is numeric and continuous,
	 * it should be resolved to an array.
	 *
	 * @param  Object       obj Any object
	 * @return Array|Object
	 */
	function resolveArrays(obj) {
		var i, isArray = true, out = {}, keys = [], max, min, intVal;

		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				intVal = parseInt(i, 10);
				if (intVal != i) {
					isArray = false;
					break;
				}
				keys.push(intVal);
			}
		}


		if (isArray) {
			max = Math.max.apply(Math, keys);
			min = Math.min.apply(Math, keys);
			if (max - min == keys.length - 1) {
				out = [];
			}
		}

		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				if (isObject(obj[i])) {
					out[i] = resolveArrays(obj[i]);
				} else {
					out[i] = obj[i];
				}
			}
		}
		return out;

	}

	function decode(string) {
		var params = string.split('&'), i, j, key, keyPath, pathValue, value, param, out = {}, node;

		for (i = 0; i < params.length; i++) {
			param = params[i].split('=');
			value = decodeURIComponent(param[1]);
			key = decodeURIComponent(param[0]).replace(/\]/g, '');
			keyPath = key.split('[');

			node = out;
			for (j = 0; j < keyPath.length - 1; j++) {
				pathValue = keyPath[j];
				if (! node.hasOwnProperty(pathValue)) {
					node[pathValue] = {};
				}
				node = node[pathValue];
			}
			node[keyPath[j]] = value;
		}

		return resolveArrays(out);
	}

	return {
		encode: function(data) {
			return encode(data, undefined);
		},
		decode: function(string) {
			return decode(string);
		}
	};
}());

var Encoding = { FormData, Xml, Json };

export { FormData, Xml , Json, Encoding };

