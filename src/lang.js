const dag = require('./dag.js');
const rel = require('./rel.js');
const col = require('./col.js');
const utils = require('./utils.js');


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

function copy(obj) {
	return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
}

function create(relName, columns, storedWith) {

	let cols = [];

	for (let i = 0; i < columns.length; i++) {

		let thisCol = columns[i];

		cols.push(
			col.Column(relName, thisCol[0], i, thisCol[1], thisCol[2]));
	}

	let outRel = rel.Relation(relName, cols, storedWith);

	return dag.Create(outRel);
}

function _open(inputOpNode, outputName, targetParty) {

	let outRel = copy(inputOpNode.outRel);

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

	let outRelCols = copy(inRels[0].columns);

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

	let inRel = inputOpNode.outRel;
	let inCols = inRel.columns;

	let groupCols = [];
	for (let i = 0; i < groupColNames.length; i++) {
		let thisCol = utils.find(inCols, groupColNames[i]);

		if (thisCol === null)
			throw `Error: Column ${groupColNames[i]} not found.\n`;

		groupCols.push(thisCol);
	}

	let aggCol = utils.find(inCols, aggColName);
	if (aggCol === null) throw `Error: Column ${aggColName} not found.\n`;

	let aggOutCol = copy(aggCol);
	aggOutCol.name = aggOutColName;

	let outRelCols = [];
	for (let i = 0; i < groupCols.length; i++) {
		outRelCols.push(copy(groupCols[i]));
	}
	outRelCols.push(copy(aggOutCol));

	let outRel = rel.Relation(outputName, outRelCols, copy(inRel.storedWith));
	outRel.updateColumns();

	let op = dag.Aggregate(outRel, inputOpNode, groupCols, aggCol, aggregator);
	inputOpNode.children.add(op);

	return op;
}

function project(inputOpNode, outputName, selectedColNames) {

	let inRel = inputOpNode.outRel;
	let inCols = inRel.columns;

	let outRelCols = [];
	for (let i = 0; i < selectedColNames.length; i++) {
		let thisCol = utils.find(inCols, selectedColNames[i]);

		if (thisCol === null)
			throw `Error: Column ${selectedColNames[i]} not found.\n`;

		let pushedCol = copy(thisCol);
		pushedCol.trustSet = new Set();

		outRelCols.push(pushedCol);
	}

	let outRel = rel.Relation(outputName, outRelCols, copy(inRel.storedWith));
	outRel.updateColumns();

	let op = dag.Project(outRel, inputOpNode, outRelCols);
	inputOpNode.children.add(op);

	return op;
}

function multiply(inputOpNode, outputName, targetColName, operands) {

	let inRel = inputOpNode.outRel;
	let outRelCols = copy(inRel.columns);

	let ops = [];
	for (let i = 0; i < operands.length; i++) {
		if (typeof(operands[i] === "string")) {
			ops.append(utils.find(inRel.columns, operands[i]))
		} else if (typeof(operands[i]) === "number") {
			ops.append(operands[i]);
		} else {
			throw `ERROR: Unsupported operand ${operands[i]} \n`;
		}
	}

	let targetCol;
	if (targetColName === operands[0].name) {
		targetCol = copy(utils.find(inRel.columns, targetColName));
	} else {
		targetCol = col.Column(outputName, targetColName, inRel.columns.length, "INTEGER", new Set());
		outRelCols.append(targetCol)
	}

	let outRel = rel.Relation(outputName, outRelCols, copy(inRel.storedWith));
	outRel.updateColumns();

	let op = dag.Multiply(outRel, inputOpNode, targetCol, operands);
	inputOpNode.children.add(op);

	return op;
}


module.exports = {
	create: create,
	collect: collect,
	concat: concat,
	aggregate: aggregate,
	project: project,
	multiply: multiply
};

