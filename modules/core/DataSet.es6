"use strict";

import { Event } from "./Event.es6";
import { isArray, isObject, isString } from "./Utils.es6";

var ordinalSymbol = Symbol("ordinal");

var DataSet = Event.mixin({
	create: ["action", "record", "batchNumber", "batchSize"],
	delete: ["action", "record", "batchNumber", "batchSize"],
	update: ["action", "record", "batchNumber", "batchSize"]
}, class {
	constructor(requiredFields, indexedFields) {

		this.requiredFields = requiredFields;
		this.indexedFields = indexedFields;
		this.indexes = {};
		this.data = [];

		this.indexedFields.forEach(x => { this.indexes[x] = {}; });
	}
	create(record) {
		doRecordCreate(this, record);
		Event.trigger(this, "create", makeEvent("create", record, 0, 1));
	}
	createMany(records) {
		records = [].slice.apply(records);
		records.forEach(record => { doRecordCreate(this, record); });
		records.forEach((record, i) => {
			Event.trigger(this, "create", makeEvent("create", record, i, records.length));
		});
	}
	readOne(where, format) {
		var out = this.read(where, format);
		if (out.length) {
			return out[0];
		}
		return null;
	}
	read(where, format) {
		var field, value, nthFilter = 1,
			set, out = [], ordinals = [],
			inSet = function(ordinal) {
				return set.indexOf(ordinal) != -1;
			};

		Object.keys(where).forEach(field => {
			var value = where[field];
			set = [];
			if (isArray(value)) {
				value.forEach(v => { findFieldValue(this, field, v, set); });
			} else {
				findFieldValue(this, field, value, set);
			}
			if (nthFilter++ === 1) {
				ordinals = set;
			} else {
				ordinals = ordinals.filter(inSet);
			}
		});
		out = ordinals.map(value => this.data[value] );

		if (format) {
			return formatResults(this, out, format);
		}

		return out;
	}
	readAll(format) {
		var out = this.data.filter(x => (x !== null));

		if (format) {
			return formatResults(this, out, format);
		}
		return out;
	}
	replace(records, where) {
		replaceRecords(this, records, this.read(where), Object.keys(where));
	}
	replaceAll(records, matchKeys) {
		replaceRecords(this, records, this.readAll(), matchKeys);
	}
	update(values, where) {
		var updatedRecordResults = this.read(where).map(record => {
			return doUpdateRecord(this, record, values) || false;
		}).filter(x => x !== false);
		bulkDispatchUpdates(this, updatedRecordResults);
	}
	delete(where) {
		bulkDeleteRecords(this, this.read(where));
	}
	validateRecord(record) {
		this.requiredFields.forEach(field => {
			if (! record.hasOwnProperty(field)) {
				throw new Error("Invalid record: missing field `"+field+"`");
			}
		});
	}
	subset(matches) {
		return new DataSubset(this, matches);
	}
});

var DataSubset = Event.mixin({
	create: ["action", "record", "batchNumber", "batchSize"],
	delete: ["action", "record", "batchNumber", "batchSize"],
	update: ["action", "record", "batchNumber", "batchSize"]
}, class {
	constructor(dataSet, where) {
		this.dataSet = dataSet;
		this.where = where;

		dataSet
			.onUpdate(e => {
				var wasIn = true, isIn = true;
				Object.keys(e.changes).forEach(key => {
					if (! this.where.hasOwnProperty(key)) {
						return;
					}
					var value = this.where[key],
						isArr = isArray(value),
						change = e.changes[key];

					if (wasIn && ((isArr && value.indexOf(change.from) < 0) || (! isArr && value != change.from))) {
						wasIn = false;
					}
					if (isIn && ((isArr && value.indexOf(change.to) > 0) || (! isArr && value != change.to))) {
						isIn = false;
					}
				});
				if (wasIn && isIn) {
					Event.trigger(this, 'update', e);
				} else if (wasIn && ! isIn) {
					Event.trigger(this, 'delete', makeEvent("delete", e.record, 1, 1));
				} else if (isIn && ! wasIn) {
					Event.trigger(this, 'create', makeEvent("create", e.record, 1, 1));
				}
			})
			.onDelete(e => {
				try {
					this.validateRecord(e.record);
					Event.trigger(this, 'create', e);
				} catch (ignore) {}
			})
			.onCreate(e => {
				try {
					this.validateRecord(e.record);
					Event.trigger(this, 'create', e);
				} catch (ignore) {}
			});
	}
	create(record) {
		this.validateRecord(record, true);
		this.dataSet.create(record);
	}
	createMany(records) {
		records.forEach(r => this.validateRecord(r, true));
		this.dataSet.createMany(records);
	}
	readOne(where, format) {
		return this.dataSet.readOne(mergeObjects(this.where, where), format);
	}
	update(values, where) {
		this.dataSet.update(values, where);
	}
	read(where, format) {
		return this.dataSet.read(mergeObjects(this.where, where), format);
	}
	readAll(format) {
		return this.dataSet.read(this.where, format);
	}
	validateRecord(record, set) {
		Object.keys(this.where).forEach(key => {
			var value = this.where[key],
				isArr = isArray(value),
				has = record.hasOwnProperty(key);

			if (has) {
				if ((isArr && value.indexOf(record[key]) < 0) ||
					(! isArr && value != record[key])) {
					throw new Error("Invalid value `"+record[key]+"` for key `"+key+"`");
				}
			} else if (isArr) {
				throw new Error("Missing value for subview `IN` key: \""+key+"\"");
			} else if (set) {
				record[key] = value;
			}
		});
	}

});

function mergeObjects(...objects) {
	var out = {};
	objects.forEach(o => {
		Object.keys(o).forEach(key => {
			if (! out.hasOwnProperty(key)) {
				out[key] = o[key];
			}
		});
	});
	return out;
}

function doUpdateRecord(self, record, values) {
	var field, changed = false, changes = {}, index;
	Object.keys(values).forEach(field => {
		if (record[field] != values[field]) {
			changed = true;
			index = (self.indexedFields.indexOf(field) !== -1);
			if (index) {
				removeFromIndex(self, field, record);
			}
			changes[field] = {
				from: record[field],
				to:   values[field]
			};
			record[field] = values[field];
			if (index) {
				addToIndex(self, field, record);
			}
		}
	});
	if (changed) {
		return { "record": record, "changes": changes };
	}
	return null;
}
function doRecordCreate(self, record) {
	self.validateRecord(record);
	record[ordinalSymbol] = self.data.length;
	self.data.push(record);
	self.indexedFields.forEach(field => {
		addToIndex(self, field, record);
	});
}
function addToIndex(self, field, record) {
	var value = record[field];
	if (! self.indexes[field].hasOwnProperty(value)) {
		self.indexes[field][value] = [];
	}
	self.indexes[field][value].push(record[ordinalSymbol]);
}
function removeFromIndex(self, field, record) {
	var value = record[field];
	if (! self.indexes[field].hasOwnProperty(value)) {
		return;
	}
	let index = self.indexes[field][value].indexOf(record[ordinalSymbol]);
	if (index != -1) {
		self.indexes[field][value].splice(index, 1);
	}
}
function formatResults(self, results, format) {
	if (isArray(format)) {
		return results.map(result => {
			let out = {};
			format.forEach(key => {
				out[key] = result[key];
			});
			return out;
		});
	} else if (isObject(format)) {
		return results.map(result => {
			let out = {};
			Object.keys(format).forEach(from => {
				out[format[from]] = result[from];
			});
			return out;
		});
	} else if (isString(format)) {
		return results.map(result => result[format]);
	}
	return [];
}
function deleteByOrdinal(self, ordinal) {
	var record = self.data[ordinal];
	if (! record) {
		throw new Error("Could not delete record " + ordinal);
	}
	self.indexedFields.forEach(field => {
		removeFromIndex(self, field, record);
	});
	self.data[ordinal] = null;
}
function bulkDispatchUpdates(self, updates) {
	updates.forEach((update, i) => {
		Event.trigger(self, "update", makeEvent("update", update.record, i, updates.length, {
			changes: update.changes
		}));
	});
}
function bulkDeleteRecords(self, records) {
	records.forEach((record, i) => {
		deleteByOrdinal(self, record[ordinalSymbol]);
		Event.trigger(self, "delete", makeEvent("delete", record, i, records.length));
	});
}
function replaceRecords(self, inRecords, currentRecords, matchKeys) {
	var creates = [],
		updates = [],
		deletes = [],
		seen = {};

	inRecords.forEach(record => {
		let matching = {};
		matchKeys.forEach(key => { matching[key] = record[key]; });
		let match = self.readOne(matching);
		if (match) {
			let updateData = doUpdateRecord(self, match, record);
			seen[match[ordinalSymbol]] = true;
			if (updateData) {
				updates.push(updateData);
			}
		} else {
			creates.push(record);
		}
	});

	self.createMany(creates);
	creates.forEach(create => { seen[create[ordinalSymbol]] = true; });

	bulkDispatchUpdates(self, updates);
	deletes = currentRecords.filter(record => {
		return ! seen.hasOwnProperty(record[ordinalSymbol]);
	});

	bulkDeleteRecords(self, deletes);
}
function findFieldValue(self, field, value, out) {
	var i, sub;
	if (self.indexes.hasOwnProperty(field)) {
		if (self.indexes[field].hasOwnProperty(value)) {
			sub = self.indexes[field][value];
			for (i = 0; i < sub.length; i++) {
				out.push(sub[i]);
			}
		}
	} else {
		for (i = 0; i < self.data.length; i++) {
			if (self.data[i] && self.data[i][field] == value) {
				out.push(i);
			}
		}
	}
}

function makeEvent(type, record, batchNumber, batchSize, extra) {
	extra = extra || {};
	extra.batchNumber = batchNumber;
	extra.batchSize = batchSize;
	extra.record = record;

	return extra;
}

export { DataSet };
