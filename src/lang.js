const dag = require('./dag.js');
const rel = require('./rel.js');
const col = require('./col.js');
const utils = require('./utils.js');


Array.prototype.setUnion = function(setArray) {
	/*
	Given an array of sets, construct their union.
	 */

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
	/*
	Return a deep copy of an object.
	 */

	return Object.assign(Object.create(Object.getPrototypeOf(obj)), obj);
}


function create(relName, columns, storedWith) {
	/*
	Construct a Create node.
	 */

	let cols = [];

	for (let i = 0; i < columns.length; i++) {

		let thisCol = columns[i];

		cols.push(
			new col.Column(relName, thisCol[0], i, thisCol[1], thisCol[2]));
	}

	let outRel = new rel.Relation(relName, cols, storedWith);

	return new dag.Create(outRel);
}


function _open(inputOpNode, outputName, targetParty) {
	/*
	Construct an Open node whose storedWith set is the targetParty.
	 */

	let outRel = copy(inputOpNode.outRel);

	outRel.storedWith = targetParty;
	outRel.rename(outputName);

	let openOp = new dag.Open(outRel, inputOpNode);
	inputOpNode.children.add(openOp);

	return openOp;
}


function collect(inputOpNode, outputName, targetParty) {
	/*
	Collect the output data of a computation. Returns an Open node.
	 */

	_open(inputOpNode, outputName, targetParty);
}

function concatenate(inputOpNodes, outputName, columnNames) {
	/*
	Concatenate two horizontally partitioned datasets.
	 */

	if (inputOpNodes.length < 2)
		throw "ERROR: Must pass at least two input nodes to concat.\n";

	let inRels = [];
	for (let i = 0; i < inputOpNodes.length; i++) {
		inRels.push(inputOpNodes[i].outRel);
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

	let outRelCols = [...inRels[0].columns];

	for (let i = 0; i < outRelCols.length; i++) {
		if (columnNames) {
			outRelCols[i].name = columnNames[i];
		}
		outRelCols[i].trustSet = new Set();
	}

	let inStoredWith = [];
	for (let i = 0; i < inRels.length; i++) {
		inStoredWith.push(inRels[i].storedWith);
	}

	let outStoredWith = Array.prototype.setUnion(inStoredWith);

	let outRel = new rel.Relation(outputName, outRelCols, outStoredWith);
	outRel.updateColumns();

	let op = new dag.Concat(outRel, inputOpNodes);

	for (let i = 0; i < inputOpNodes.length; i++) {
		inputOpNodes[i].children.add(op)
	}

	return op;
}

function aggregate(inputOpNode, outputName, groupColNames, aggColName, aggregator, aggOutColName) {
	/*
	Construct an output Relation/Node pair whose columns are the [groupCols, aggCol].
	 */

	let inRel = inputOpNode.outRel;

	let inCols = [];
	for (let i = 0; i < inRel.columns.length; i++) {
		inCols.push(inRel.columns[i]);
	}

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

	let outRel = new rel.Relation(outputName, outRelCols, new Set(inRel.storedWith));
	outRel.updateColumns();

	let op = new dag.Aggregate(outRel, inputOpNode, groupCols, aggCol, aggregator);
	inputOpNode.children.add(op);

	return op;
}

function project(inputOpNode, outputName, selectedColNames) {
	/*
	Project out one or more columns in the order indicated by selectedColNames.
	 */

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

	let outRel = new rel.Relation(outputName, outRelCols, new Set(inRel.storedWith));
	outRel.updateColumns();

	let op = new dag.Project(outRel, inputOpNode, outRelCols);
	inputOpNode.children.add(op);

	return op;
}

function multiply(inputOpNode, outputName, targetColName, operands) {
	/*
	Multiply a column by one or more columns, a scalar, or both. All values in the operands array will
	be multiplied together to create the resulting output column. If the first value of operands is equal
	to the targetColName, then that column will be operated upon in place and included in the output. Else,
	a new column will be constructed whose name will be targetColName, and the product of the operands array
	will be stored in that column.
	 */

	let inRel = inputOpNode.outRel;
	let outRelCols = [...inRel.columns];

	let ops = [];
	for (let i = 0; i < operands.length; i++) {
		if (typeof(operands[i] === "string")) {
			ops.push(utils.find(inRel.columns, operands[i]))
		} else if (typeof(operands[i]) === "number") {
			ops.push(operands[i]);
		} else {
			throw `ERROR: Unsupported operand ${operands[i]} \n`;
		}
	}

	let targetCol;
	if (targetColName === operands[0].name) {
		targetCol = copy(utils.find(inRel.columns, targetColName));
	} else {
		targetCol = new col.Column(outputName, targetColName, inRel.columns.length, "INTEGER", new Set());
		outRelCols.push(targetCol)
	}

	let outRel = new rel.Relation(outputName, outRelCols, new Set(inRel.storedWith));
	outRel.updateColumns();

	let op = new dag.Multiply(outRel, inputOpNode, targetCol, operands);
	inputOpNode.children.add(op);

	return op;
}

function divide(inputOpNode, outputName, targetColName, operands) {
	/*
	Divide a column by one or more columns, a scalar, or both. The syntax for the operands array and
	targetColName for this method is identical to the multiply() method above.
	 */

	let inRel = inputOpNode.outRel;
	let outRelCols = [...inRel.columns];

	let ops = [];
	for (let i = 0; i < operands.length; i++) {
		if (typeof(operands[i] === "string")) {
			ops.push(utils.find(inRel.columns, operands[i]))
		} else if (typeof(operands[i]) === "number") {
			ops.push(operands[i]);
		} else {
			throw `ERROR: Unsupported operand ${operands[i]} \n`;
		}
	}

	let targetCol;
	if (targetColName === operands[0].name) {
		targetCol = copy(utils.find(inRel.columns, targetColName));
	} else {
		targetCol = new col.Column(outputName, targetColName, inRel.columns.length, "INTEGER", new Set());
		outRelCols.push(targetCol)
	}

	let outRel = new rel.Relation(outputName, outRelCols, new Set(inRel.storedWith));
	outRel.updateColumns();

	let op = new dag.Divide(outRel, inputOpNode, targetCol, operands);
	inputOpNode.children.add(op);

	return op;
}

function colsFromRel(startIdx, relation, keyColIdxs, outputName) {
	/*
	Extract columns whose idx is not in the keyColIdxs set and construct new
	columns accordingly. Returns an array of the newly constructed columns.
	 */

	let resultCols = [];

	for (let i = 0; i < relation.columns.length; i++) {
		let thisCol = relation.columns[i];

		if (!keyColIdxs.includes(thisCol.idx)) {
			let newCol =
				new col.Column(outputName, thisCol.name, i + startIdx - keyColIdxs.length, thisCol.typeStr, new Set());
			resultCols.push(newCol);
		}
	}

	return resultCols;
}

function join(leftInputNode, rightInputNode, outputName, leftColNames, rightColNames) {
	/*
	Constructs a Relation/Node pair consisting of the result of a join over the leftColNames
	and rightColNames arrays with respect to the two input nodes.
	 */

	if (leftColNames.length !== rightColNames.length)
		throw `Error: Join column arrays must have equal length.\n`;

	let leftInRel = leftInputNode.outRel;
	let rightInRel = rightInputNode.outRel;

	let leftCols = leftInRel.columns;
	let rightCols = rightInRel.columns;

	let leftJoinCols = [];
	for (let i = 0; i < leftColNames.length; i++) {
		let thisCol = utils.find(leftCols, leftColNames[i]);

		if (thisCol === null)
			throw `Error: Column ${leftColNames[i]} not found.\n`;

		leftJoinCols.push(thisCol);
	}

	let rightJoinCols = [];
	for (let i = 0; i < rightColNames.length; i++) {
		let thisCol = utils.find(rightCols, rightColNames[i]);

		if (thisCol === null)
			throw `Error: Column ${rightColNames[i]} not found.\n`;

		rightJoinCols.push(thisCol);
	}

	let outKeyCols = [];
	for (let i = 0; i < leftJoinCols.length; i++) {
		outKeyCols.push(new col.Column(outputName, leftJoinCols[i].name, i, leftJoinCols.typeStr, new Set()));
	}

	let startIdx = outKeyCols.length;
	let continueIdx = leftCols.length;

	let leftKeyColIdxs = [];
	let rightKeyColIdxs = [];
	for (let i = 0; i < leftJoinCols.length; i++) {
		leftKeyColIdxs.push(leftJoinCols[i].idx);
		rightKeyColIdxs.push(rightJoinCols[i].idx);
	}

	let leftOutRelCols = colsFromRel(startIdx, leftInRel, leftKeyColIdxs, outputName);
	let rightOutRelCols = colsFromRel(continueIdx, rightInRel, rightKeyColIdxs, outputName);

	let outRelCols = outKeyCols.concat(leftOutRelCols, rightOutRelCols);
	let outStoredWith = Array.prototype.setUnion([leftInRel.storedWith, rightInRel.storedWith]);

	let outRel = new rel.Relation(outputName, outRelCols, outStoredWith);
	outRel.updateColumns();

	let op = new dag.Join(outRel, leftInputNode, rightInputNode, leftJoinCols, rightJoinCols);

	leftInputNode.children.add(op);
	rightInputNode.children.add(op);

	return op;
}


module.exports = {
	create: create,
	collect: collect,
	concatenate: concatenate,
	aggregate: aggregate,
	project: project,
	multiply: multiply,
	divide: divide,
	join: join
};