"use strict";

import { DataSet } from "./DataSet.es6";

var userData = new DataSet(["firstName", "lastname", "id"], ["id"]);

userData.onCreate(event => global.console.log("create", event));

userData.createMany([{
		firstName: "Frodo",
		lastName:  "Baggins",
		id: 1
	}, {
		firstName: "Bilbo",
		lastName:  "Baggins",
		id: 2
	}, {
		firstName: "Jeff",
		lastName:  "Baggins",
		id: 3
	}
]);

global.console.log(userData.read({id: 1}));
