const cc = require('./src/lang.js');
const dag = require('./src/dag.js');
const utils = require('./src/utils.js');


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

	let c = cc.concat([inOne, inTwo], "con", ["a", "b"]);
	let a =
		cc.aggregate(c, "agg", ["a"], "b", "sum", "summed")

	let o = cc.collect(a, "opened", 1);

	return new Set([inOne, inTwo]);
}

let d = new dag.Dag(workflow());

console.log("Hi");