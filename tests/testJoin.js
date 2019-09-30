const cc = require('.././src/lang.js');
const dag = require('.././src/dag.js');
const utils = require('.././src/utils.js');


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

	let j = cc.join(inOne, inTwo, "joined", ["a"], ["a"]);

	let o = cc.collect(j, "opened", 1);

	return new Set([inOne, inTwo]);
}

let d = new dag.Dag(workflow());

if (d.toStr() === "name: create\n" +
	"children: join\n" +
	"parents: \n" +
	"\n" +
	"name: create\n" +
	"children: join\n" +
	"parents: \n" +
	"\n" +
	"name: join\n" +
	"children: open\n" +
	"parents: create, create\n" +
	"\n" +
	"name: open\n" +
	"children: \n" +
	"parents: join") {
	console.log("testJoin.js Passed.\n")
} else {
	console.log("testJoin.js Failed");
}