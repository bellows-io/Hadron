"use strict";

var regex = /(\.\d+)|(\d+(\.\d+)?)|([^\d.]+)|(\.\D+)|(\.$)/g;

function comparePreparedStrings(prepA, prepB) {
	var a1, b1, i = 0, n;

	while (i < prepA.length) {
		if (! prepB[i]) {
			return 1;
		}
		a1 = prepA[i];
		b1 = prepB[i++];
		if (a1 !== b1) {
			n = a1 - b1;
			if (! isNaN(n)) {
				return n;
			}
			return a1 > b1 ? 1 : -1;
		}
	}

	return prepB[i] ? -1 : 0;
}

function prepareString(input) {

	var matches = input.toLowerCase().match(regex), i, out = [];
	if (matches) {
		for (i = 0; i < matches.length; i++) {
			if (i < matches.length -1 && matches[i] == '-' && ! isNaN(matches[i+1])) {
				out.push(-1 * parseInt(matches[i+1], 10));
				i++;
			} else {
				out.push(matches[i]);
			}
		}
	}
	return out;
}

var NaturalSort = {

	compare: function(inputA, inputB) {
		if (inputA === inputB) {
			return 0;
		}

		return comparePreparedStrings(
			prepareString(inputA),
			prepareString(inputB));
	},

	sort: function(array) {
		return array.map(val => {
				var p = prepareString(val);
				p.originalValue = val;
				return p;
			}).
			sort(comparePreparedStrings).
			map(p => p.originalValue);
	}

};



export { NaturalSort };
