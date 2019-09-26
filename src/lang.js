const dag = require('./dag.js');
const rel = require('./rel.js');
const col = require('./col.js');


Array.prototype.setUnion = function(setArray)
{
	let _union = setArray[0];
	for (let i = 1; i < setArray.length; i++)
	{
		let setElem;
		for (setElem of setArray[i])
		{
			_union.add(setElem);
		}
	}

	return _union;
};

function create(relName, columns, storedWith) {

	let cols = [];

	for (let i = 0; i < columns.length; i++) {

		let thisCol = columns[i];

		cols.push(
			col.Column(relName, thisCol.name, i, thisCol.typeStr, thisCol.trustSet));
	}

	let outRel = rel.Relation(relName, cols, storedWith);

	return dag.Create(outRel);
}

function _open(inputOpNode, outputName, targetParty) {

	let outRel =
		Object.assign(Object.create(Object.getPrototypeOf(inputOpNode.outRel)), inputOpNode.outRel);

	outRel.storedWith = targetParty;
	outRel.rename(outputName);

	let openOp = dag.Open(outRel, inputOpNode);
	inputOpNode.children.add(openOp);

	return openOp;
}

function collect(inputOpNode, outputName, targetParty) {
	_open(inputOpNode, outputName, targetParty);
}

function concat(inputOpNodes, outputName, columnNames) {

		if (inputOpNodes.length < 2)
			throw "ERROR: Must pass at least two input nodes to concat.\n"

	let inRels = [];
	let inNode;
	for (inNode in inputOpNodes) {
		inRels.push(inNode.outRel);
	}

	let numCols = inRels[0].columns.length;
	for (let i = 0; i < inRels.length; i++) {
			if (inRels[i].columns.length !== numCols)
				throw "ERROR: All input nodes to concat must have the same number of columns.\n"
	}

	if (columnNames) {
		if (columnNames.length !== numCols)
			throw "ERROR: Column names array must have size equal to number of columns.\n"
	}

	let outRelCols =
		Object.assign(Object.create(Object.getPrototypeOf(inRels[0].columns)), inRels[0].columns);

	for (let i = 0; i < outRelCols.length; i++) {
		if (columnNames) {
			outRelCols[i].name = columnNames[i];
		}
		outRelCols[i].trustSet = new Set();
	}

	let inStoredWith = [];
	let inRel;
	for (inRel in inRels) {
		inStoredWith.push(inRel.storedWith);
	}
	let outStoredWith = Array.prototype.setUnion(inStoredWith);

	let outRel = rel.Relation(outputName, outRelCols, outStoredWith);
	outRel.updateColumns();

	let op = dag.Concat(outRel, inputOpNodes);

	let inputOpNode;
	for (inputOpNode in inputOpNodes) {
		inputOpNode.children.add(op);
	}

	return op;
}

function aggregate(inputOpNode, outputName, groupColNames, aggColName, aggregator, aggOutColName) {

}


// constructor(relName, name, idx, typeStr, trustSet) {
// 	this.relName = relName;
// 	this.name = name;
// 	this.idx = idx;
// 	this.typeStr = typeStr;
// 	this.trustSet = trustSet;
// }

// constructor(name, columns, storedWith) {
// 	this.name = name;
// 	this.columns = columns;
// 	this.storedWith = storedWith;
// }

let a = new Set([1,2]);
let b = new Set([2,3]);

let c = [a,b];
let d = Array.prototype.setUnion(c);

console.log(d);