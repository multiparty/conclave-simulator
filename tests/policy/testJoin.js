const cc = require('../../src/lang.js');
const utils = require('../../src/utils.js');
const ver = require('../../src/ver.js');


function workflow() {

	let colsInOne = [
		utils.defCol("a", "INTEGER", 1),
		utils.defCol("b", "INTEGER", 1)
	];

	let colsInTwo = [
		utils.defCol("a", "INTEGER", 2),
		utils.defCol("b", "INTEGER", 2)
	];

	let inOne = cc.create("inOne", colsInOne, new Set([1]));
	let inTwo = cc.create("inTwo", colsInTwo, new Set([2]));

	let j = cc.join(inOne, inTwo, "joined", ['a'], ['a']);

	let o = cc.collect(j, "opened", 1);

	return new Set([inOne, inTwo]);
}

let policyOne =
	{
		"fileName": "inOne",
		"columns":
			{
				"a":
					{
						"read": true
					},
				"b":
					{
						"read": true
					}
			}
	};

let vOne = new ver.Verify(workflow(), policyOne);
let resOne = vOne.verify();

let policyTwo =
	{
		"fileName": "inOne",
		"columns":
			{
				"a":
					{
						"read": true
					},
				"b":
					{
						"read": false
					}
			}
	};

let vTwo = new ver.Verify(workflow(), policyTwo);
let resTwo = vTwo.verify();

if (resOne === true && resTwo === false) {
	console.log("testJoin.js Passed.")
} else {
	console.log("testJoin.js Failed.")
}


