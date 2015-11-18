"use strict";

import { Promise } from "./Promise.es6";
import { Event } from "./Event.es6";
import { FormData, Json, Xml } from "./Encoding.es6";
import { trim, ucWord } from "./Utils.es6";


var RequestState = {
		REQUEST_NOT_INITIALIZED: 0,
		SERVER_CONNECTION_ESTABLISHED: 1,
		REQUEST_RECEIVED: 2,
		PROCESSING_REQUEST: 3,
		REQUEST_FINISHED: 4
	},
	eventCallbacks = {},
	localDomain = location.protocol + '//' + location.hostname;


function triggerInstanceStaticEvent(self, type) {
	var data = {
		url: self.url,
		method: self.method,
		data: self.data
	};
	eventCallbacks[type].forEach(callback => callback.call(null, data));
}

function urlIsCrossDomain(url) {
	if (url.slice(0, 4) == 'http') {
		if (url.slice(0, localDomain.length) == localDomain) {
			return false;
		}
		return true;
	}
	return false;
}

function doError(self, message) {
	if (! message) {
		message = "Error requesting `"+self.url+"`";
	}
	triggerInstanceStaticEvent(self, 'error');
	if (self.error) {
		self.error(self.xr, 'error');
	}
	self.promise.reject(message);
}

function doProgress(self) {

	if (self.contentLength === false) {
		if (self.getResponseHeader('Content-length')) {
			self.contentLength = parseInt(self.getResponseHeader('Content-length'));
		} else {
			self.contentLength = null;
		}
	}

	Event.trigger(self, 'progress', {
		numerator: self.xr.responseText.length,
		denominator: self.contentLength
	});
}

function doRedirect(self, url) {
	self.promise.resolve({
		status: 'redirect',
		result: url
	});
}

function doAbort(self) {
	Event.trigger(self, 'abort', {});
}


function doLoad(self) {
	var text = self.xr.responseText,
		responseType, output;

	if (self.dataType === null) {
		responseType = self.getResponseHeader("Content-Type").split(";")[0];
		if (responseType == 'application/xml') {
			self.dataType = 'xml';
		} else if (responseType == 'application/json') {
			self.dataType = 'json';
		}
	}

	if (!self.xr.responseText) {
		output = null;
	} else if (self.dataType == 'xml') {
		try {
			output = Xml.decode(text);
		} catch (exParseXML) {
			return self.error(self.xr, 'error', 'Could not parse XML');
		}
	} else if (self.dataType == 'json') {
		try {
			output = Json.decode(text);
		} catch (exParseJSON) {
			return self.error(self.xr, 'error', 'Could not parse JSON');
		}
	} else {
		output = self.xr.responseText;
	}

	triggerInstanceStaticEvent(self, 'success');
	if (self.success) {
		self.success(output);
	}
	self.promise.resolve(output);
}


function doReadyStateChange(self) {
	switch (self.xr.readyState) {
		case RequestState.REQUEST_NOT_INITIALIZED:
			if (self.aborted) {
				doAbort(self);
			}
			break;
		case RequestState.SERVER_CONNECTION_ESTABLISHED:
			break;
		case RequestState.REQUEST_RECEIVED:
			if (self.xr.responseURL && self.xr.responseURL.indexOf(self.url) < 0) {
				doRedirect(self, self.xr.responseURL);
			}
			break;
		case RequestState.PROCESSING_REQUEST:
			break;
		case RequestState.REQUEST_FINISHED:
			var responseType = parseInt(self.xr.status.toString().charAt(0), 10) * 100;

			switch (responseType) {
			case 200:
				doLoad(self);
				break;
			case 400:
				doError(self, self.xr.statusText);
				break;
			}
			break;
	}
}


function setRequestHeaders(self, headerData) {
	var i;
	if (!this.xr.setRequestHeader) {
		console.warn("Cannot set request headers", this.xr);
		return false;
	}

	for (i in headerData) {
		if (headerData.hasOwnProperty(i)) {
			try {
				this.xr.setRequestHeader(i, headerData[i]);
			} catch (ex) {
				console.warn(ex.message);
			}
		}
	}
}

function perform(self) {
	var postData = '',
		query = FormData.encode(self.data);

	triggerInstanceStaticEvent(self, 'request');

	if (self.method == 'GET') {
		if (query.length) {
			query = '?' + query;
		}
		self.xr.open(self.method, self.url + query, true);
	} else {
		self.xr.open(self.method, self.url, true);

		setRequestHeaders(self, {
			"Content-type": "application/x-www-form-urlencoded"
		});

		postData = query;
	}

	self.xr.onerror = function() { doError(self); };
	self.xr.onreadystatechange = function() { doReadyStateChange(self); };
	self.xr.ontimeout = function () { doError(self, "Timeout"); };
	self.xr.onprogress = function () { doProgress(self); };

	if (!! window.XDomainRequest && self.xr instanceof XDomainRequest) {
		self.xr.onload = function() { doLoad(self); };
	}

	try {
		// for whatever reason, IE's async requests would timeout without this.
		setTimeout(function() {
			try {
				self.xr.send(postData);
			} catch (ex) {
				doError(self, ex.message);
			}
		}, 0);
	} catch (ex) {
		doError(self, ex.message);
	}
}


function urlIsCrossDomain(url) {
	if (url.slice(0, 4) == 'http') {
		if (url.slice(0, localDomain.length) == localDomain) {
			return false;
		}
		return true;
	}
	return false;
}

class Request {
	constructor(url, method, data, dataType, success, error) {
		this.url = url;
		this.method = method || 'GET';
		this.data = data || {};
		this.dataType = dataType || null;
		this.success = success;
		this.error = error;
		if (window && !! window.XDomainRequest && urlIsCrossDomain(url)) {
			this.xr = new XDomainRequest();
		} else {
			this.xr = new XMLHttpRequest();
		}
		this.promise = new Promise();
		perform(this);
		this.responseHeaders = null;
	}
	abort() {
		this.aborted = true;
		this.xr.abort();
	}
	getResponseHeader(key) {
		var headers = this.getResponseHeaders();
		if (key in headers) {
			return headers[key];
		}
		return null;
	}
	getResponseHeaders() {
		if (this.responseHeaders === null) {
			let responseHeaders = {};
			if (this.xr.getAllResponseHeaders) {
				let headers = this.xr.getAllResponseHeaders(),
					list = headers.split("\n");

				list.forEach(line => {
					let ci = line.indexOf(":"),
						key = line.substring(0, ci),
						values = line.substring(ci + 1);

					responseHeaders[key] = trim(values);
				});
			}
			this.responseHeaders = responseHeaders;
		}
		return this.responseHeaders;
	}
}

Event.mixin({
	timeout: [],
	error: [],
	progress: ["numerator", "denominator"],
	readyStateChanged: ["from", "to"],
	redirect: []
}, Request);


['GET', 'PUT', 'POST', 'DELETE'].forEach(method => {
	Request[method.toLowerCase()] = function(url, data, dataType) {
		return (new Request(url, method, data, dataType)).promise;
	};
});

['success', 'request', 'error'].forEach(event => {
	eventCallbacks[event] = [];
	Request['on'+ucWord(event)] = function(callback) {
		eventCallbacks[event].push(callback);
	};
});

export { Request, RequestState };
