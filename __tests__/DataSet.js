 "use strict";

jest.dontMock("../dist/hadron.js");
describe("DataSet", function() {
	require("../dist/hadron.js");
	var DataSet = global.Hadron.DataSet;

	it ("listens for create events on a create call", function() {
		var dataSet = new DataSet(["id", "make", "model", "year"], []),
			log = [];

		dataSet.onCreate(function(event) {
			log.push(event);
		});

		dataSet.create({
			id: 1,
			make: "Honda",
			model: "Civic",
			year: 2007
		});

		expect(log.length).toBe(1);

		expect(log[0].record.id).toBe(1);
		expect(log[0].record.make).toBe("Honda");
		expect(log[0].record.model).toBe("Civic");
		expect(log[0].record.year).toBe(2007);

		expect(log[0].eventType).toBe("create");
		expect(log[0].batchNumber).toBe(0);
		expect(log[0].batchSize).toBe(1);

	});

	it ("listens for create events on a createMany call", function() {

		var dataSet = new DataSet(["id"], []),
			log = [];

		dataSet.onCreate(function(event) {
			log.push(event);
		});

		dataSet.createMany([
			{ id: 1 },
			{ id: 2 },
			{ id: 3 }
		]);

		expect(log.length).toBe(3);

		// test batch number order
		expect(log[0].batchNumber).toBe(0);
		expect(log[1].batchNumber).toBe(1);
		expect(log[2].batchNumber).toBe(2);

		// test record id order
		expect(log[0].record.id).toBe(1);
		expect(log[1].record.id).toBe(2);
		expect(log[2].record.id).toBe(3);
	});

	it ("reads and formats records", function() {
		var dataSet = new DataSet(["nth", "firstName", "lastName"], ["nth", "firstName", "lastName"]);

		dataSet.createMany([
			{ nth: 1, firstName: "George", lastName: "Washington" },
			{ nth: 2, firstName: "John", lastName: "Adams" },
			{ nth: 35, firstName: "John", lastName: "Kennedy" },
			{ nth: 41, firstName: "George", lastName: "Bush" },
			{ nth: 43, firstName: "George", lastName: "Bush" }
		]);

		var georgeNths = dataSet.read({firstName: "George"}, 'nth'),
			johnLastnames = dataSet.read({firstName: "John"}, {lastName: "LAST_NAME"}),
			numGeorgeBushes = dataSet.read({firstName: "George", lastName: "Bush"}).length,
			numRecords = dataSet.readAll().length,
			noNths = dataSet.read({nth: [1, 2]}, ['firstName', 'lastName']),
			adamsOrdinal = dataSet.readOne({lastName:"Adams"}, 'nth');

		expect(georgeNths).toEqual([1, 41, 43]);
		expect(johnLastnames).toEqual([{"LAST_NAME":"Adams"},{"LAST_NAME":"Kennedy"}]);
		expect(numGeorgeBushes).toBe(2);

		expect(numRecords).toBe(5);
		expect(noNths).toEqual([
			{ firstName: "George", lastName: "Washington"  },
			{ firstName: "John", lastName: "Adams" }
		]);

		expect(adamsOrdinal).toBe(2);

	});

 	it ("deletes records", function() {
		var dataSet = new DataSet(["nth", "firstName", "lastName"], ["nth", "firstName", "lastName"]);

		dataSet.createMany([
			{ nth: 41, firstName: "George", lastName: "Bush" },
			{ nth: 42, firstName: "William", lastName: "Clinton" },
			{ nth: 43, firstName: "Albert", lastName: "Gore" }
		]);

		var log = [];
		dataSet.onDelete(function(e) {
			log.push(e);
		});

		dataSet.delete({lastName: "Gore"});

		expect(log.length).toBe(1);
		expect(log[0].record.lastName).toBe('Gore');
		expect(log[0].eventType).toBe('delete');

		var remainingGores = dataSet.read({lastName:"Gore"});
		expect(remainingGores.length).toBe(0);
 	});


 	it ("updates records", function() {
		var dataSet = new DataSet(["nth", "firstName", "lastName"], ["nth", "firstName", "lastName"]);

		dataSet.createMany([
			{ nth: 41, firstName: "George", lastName: "Bush" },
			{ nth: 42, firstName: "William", lastName: "Clinton" },
			{ nth: 43, firstName: "Albert", lastName: "Gore" }
		]);

		var log = [];
		dataSet.onUpdate(function(e) {
			log.push(e);
		});

		dataSet.update({firstName: "George", lastName:"Bush"}, {nth: 43});

		var remainingGores = dataSet.read({lastName: "Gore"});
		expect(remainingGores.length).toBe(0);
		expect(log.length).toBe(1);
		expect(log[0].changes).toEqual({
			firstName: {
				from: "Albert",
				to: "George"
			},
			lastName: {
				from: "Gore",
				to: "Bush"
			}
		});
 	});

 	it ("replaces records", function() {
		var dataSet = new DataSet(["firstName", "lastName"], ["lastName"]);

		dataSet.createMany([
			{ firstName: "Jeb!", lastName: "Bush" },
			{ firstName: "Bobby", lastName: "Jindal" },
			{ firstName: "Carly", lastName: "Fiorina" },
			{ firstName: "Donald", lastName: "Trump" },
			{ firstName: "Hillary", lastName: "Clinton" }
		]);

		var log = {updates: [], creates: [], deletes: []};
		dataSet
			.onUpdate(function(e) {
				log.updates.push(e);
			})
			.onDelete(function(e) {
				log.deletes.push(e);
			})
			.onCreate(function(e) {
				log.creates.push(e);
			});

		dataSet.replace([
			{ firstName: "Ben", lastName: "Carson" }
		], {lastName: "Jindal"});

		expect(dataSet.read({lastName:"Jindal"}).length).toBe(0);

		dataSet.replaceAll([
			{ firstName: "Jeb", lastName: "Bush" },
			{ firstName: "Bernie", lastName: "Sanders" }
		], ['lastName']);

		expect(log.updates.length).toBe(1);
		expect(log.updates[0].changes).toEqual({
			firstName: {
				from: "Jeb!", to: "Jeb"
			}
		});
		expect(log.deletes.length).toBe(5);
		expect(log.creates.length).toBe(2);

 	});

 	it ("validates record", function() {

 		var fails = false,
 			dataSet = new DataSet(["firstName", "lastName"], ["lastName"]);

 		try {
 			dataSet.validateRecord({firstname: "George", lastName:"Washington"});
 		} catch (e) {
 			fails = true;
 		}

 		expect(fails).toBe(true);

 		fails = false;
 		try {
 			dataSet.validateRecord({firstName:"George"});
 		} catch (e) {
 			fails = true;
 		}
 		expect(fails).toBe(true);
 	});
});
