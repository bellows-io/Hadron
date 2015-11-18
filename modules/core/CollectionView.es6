"use strict";

import { trim, escapeHTML } from "./Utils.es6";

var templateRegex = new RegExp("{{(.*?)}}"),
	attrRegex = new RegExp("\\[(.*?)\\]");

class CollectionView {
	constructor(root) {
		this.parentNode = root.parentNode;
		this.parentNode.removeChild(root);
		// removes utility hide class
		root.className = (" " + root.className + " ").replace(" cv-hidden ", "");
		this.sourceHTML = root.outerHTML;
		this.fakeParent = document.createElement(this.parentNode.tagName);
		this.all = {};
		this.filters = {};
		this.keyIncrement = 0;
	}
	addFilter(name, callback) {
		this.filters[name] = callback;
		return this;
	}
	listenToDataSet(dataSet, where) {
		dataSet.
			onCreate(event => {
				if (where && ! where(event.record)) {
					return;
				}
				this.add(event.record.id, event.record);
			}).
			onUpdate(event => {
				if (where && ! where(event.record)) {
					return;
				}
				this.update(event.record.id, event.record);
			}).
			onDelete(event => {
				if (where && ! where(event.record)) {
					return;
				}
				this.remove(event.record.id);
			});
	}
	updateAll(map) {
		Object.keys(this.all).
			filter(key => ! map.hasOwnProperty(key)).
			forEach(key => this.remove(key));

		Object.keys(map).forEach(key => this.replace(key, map[key]));
	}
	has(name) {
		return this.all.hasOwnProperty(name);
	}
	get(name) {
		if (! this.has(name)) {
			throw new Error("Unknown key: `" + name + "`");
		}
		return this.all[name];
	}
	add(name, data) {
		var out;
		if (name === undefined) {
			name = this.keyIncrement++;
		}
		this.remove(name);
		out = buildElFromData(this, data);
		this.all[name] = out;
		this.parentNode.appendChild(out.element);
		return out;
	}
	replace(name, data) {
		if (this.has(name)) {
			return this.update(name, data);
		}
		return this.add(name, data);
	}
	update(name, data) {
		var oldInst = this.get(name),
			newInst = buildElFromData(this, data);

		this.all[name] = newInst;
		this.parentNode.insertBefore(newInst.element, oldInst.element);
		this.parentNode.removeChild(oldInst.element);
		return newInst;
	}
	remove(name) {
		if (this.has(name)) {
			let el = this.all[name].element;
			if (el.parentNode) {
				el.parentNode.removeChild(el);
			}
			delete this.all[name];
		}
	}
	empty() {
		Object.keys(this.all).forEach(name => this.remove(name));
	}
}

class CollectionViewFactory {
	constructor(filterMap) {
		this.filterMap = filterMap;
	}
	make(root) {
		var view = new CollectionView(root);
		Object.keys(this.filterMap).forEach(key => {
			view.addFilter(key, this.filterMap[key]);
		});
		return view;
	}
}

export { CollectionView, CollectionViewFactory };


function resolveTemplateStatement(self, statement, object) {
	var statements = statement.split('|').map(trim),
		key = statements.shift(),
		value;

	if (! object.hasOwnProperty(key)) {
		return '';
	}

	value = statements.reduce((value, key) => {
		var match = key.match(attrRegex);
		if (match) {
			if (! value.hasOwnProperty(match[1])) {
				throw new Error("Undefined key: `" + match[1] + "`");
			}
			return value[match[1]];
		}
		if (! self.filters.hasOwnProperty(key)) {
			throw new Error("Undefined filter `" + key + "`");
		}
		return self.filters[key].call(null, value);
	}, object[key]);

	return escapeHTML(value);
}

function buildElFromData(self, data) {
	var html = self.sourceHTML,
		out = {}, elements;

	if (data) {
		let i = 1000;
		while (html.match(templateRegex) && i > 0) {
			let results = html.match(templateRegex),
				variableHTML = resolveTemplateStatement(self, trim(results[1]), data);

			html = html.replace(results[0], variableHTML);
			i --;
		}
	}

	self.fakeParent.innerHTML = html;
	out.element = self.fakeParent.firstChild;
	elements = out.element.querySelectorAll('[data-cv-name]');
	[].slice.call(elements).forEach(element  => {
		let attrName = element.getAttribute('data-cv-name');
		element.removeAttribute('data-cv-name');
		out[attrName] = element;
	});

	elements = out.element.querySelectorAll('[data-cv-attr]');
	[].slice.call(elements).forEach(element  => {
		let values = element.getAttribute('data-cv-attr').split(',');
		element.removeAttribute('data-cv-attr');

		values.forEach(line => {
			let [elKey, dataKey] = line.split("=");
			if (dataKey in data && data[dataKey]) {
				element.setAttribute(elKey, elKey);
			}
		});
	});

	return out;
}
