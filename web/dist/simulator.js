(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.simulator = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
Set.prototype.intersection = function(otherSet)
{
	let intersectionSet = new Set();
	for(let elem of otherSet)
	{
		if(this.has(elem))
			intersectionSet.add(elem);
	}

	return intersectionSet;
};

class Column {

	constructor(relName, name, idx, typeStr, trustSet) {
		this.relName = relName;
		this.name = name;
		this.idx = idx;
		this.typeStr = typeStr;
		this.trustSet = trustSet;
	}

	mergeCollSetsIn(otherCollSets) {
		this.trustSet = this.trustSet.intersection(otherCollSets)
	}
}

module.exports = {
	Column: Column
};
},{}],2:[function(require,module,exports){
class Node {

	constructor(outRel) {
		this.name = "node";
		this.outRel = outRel;
		this.children = new Set();
		this.parents = new Set();
	}

	toStr() {
		let childStr = Array.from(this.children).map(c => c.name).join(", ");
		let parentStr = Array.from(this.parents).map(p => p.name).join(", ");
		return `name: ${this.name}\nchildren: ${childStr}\nparents: ${parentStr}`;
	}
}

class Create extends Node {

	constructor(outRel) {
		super(outRel);

		this.name = "create";
	}
}

class Open extends Node {

	constructor(outRel, parent) {
		super(outRel);

		this.name = "open";
		this.parents.add(parent);
	}
}

class Concat extends Node {

	constructor(outRel, parents) {
		super(outRel);

		this.name = "concat";

		for (let i = 0; i < parents.length; i++)
		{
			this.parents.add(parents[i])
		}
	}
}

class Aggregate extends Node {

	constructor(outRel, parent, groupCols, aggCol, aggregator) {
		super(outRel);

		this.name = "aggregation";
		this.parents.add(parent);
		this.groupCols = groupCols;
		this.aggCol = aggCol;
		this.aggregator = aggregator;
	}
}

class Project extends Node {

	constructor(outRel, parent, selectedCols) {
		super(outRel);

		this.name = "Project";
		this.parents.add(parent);
		this.selectedCols = selectedCols;
	}
}

class Multiply extends Node {

	constructor(outRel, parent, targetCol, operands) {
		super(outRel);

		this.name = "multiply";
		this.parents.add(parent);
		this.targetCol = targetCol;
		this.operands = operands;
	}
}

class Divide extends Node {

	constructor(outRel, parent, targetCol, operands) {
		super(outRel);

		this.name = "divide";
		this.parents.add(parent);
		this.targetCol = targetCol;
		this.operands = operands;
	}
}

class Join extends Node {

	constructor(outRel, leftParent, rightParent, leftJoinCols, rightJoinCols) {
		super(outRel);

		this.name = "join";
		this.leftParent = leftParent;
		this.rightParent = rightParent;
		this.leftJoinCols = leftJoinCols;
		this.rightJoinCols = rightJoinCols;

		this.parents.add(leftParent);
		this.parents.add(rightParent);
	}
}

class Dag {

	constructor(roots) {
		this.roots = roots;
	}

	_recursiveVisit(node, visited) {

		if (!visited.has(node)) {
			this._dfs_visit(node, visited)
		}
	}

	_dfs_visit(node, visited) {

		visited.add(node);
		node.children.forEach(c => this._recursiveVisit(c, visited));

		return visited;
	}

	dfs_visit() {

		let visited = new Set();
		this.roots.forEach(r => this._dfs_visit(r, visited));

		return visited;
	}

	get_all_nodes() {

		return this.dfs_visit();
	}

	_top_sort_visit(node, marked, tempMarked, unmarked, ordered) {

		if (tempMarked.has(node)) throw `Error: Not a Dag - node ${node} was in ${tempMarked}.\n`;

		if (!marked.has(node)) {
			if (unmarked.includes(node)) {
				for (let i = 0; i < unmarked.length; i++) {
					if (unmarked[i] === node) {
						unmarked.splice(i, 1);
					}
				}
			}

			tempMarked.add(node);
			let children = Array.from(node.children)
				.sort((a, b) => (a.outRel.name > b.outRel.name) ? 1: -1);

			for (let i = 0; i < children.length; i++) {
				this._top_sort_visit(children[i], marked, tempMarked, unmarked, ordered)
			}

			marked.add(node);
			unmarked.push(node);
			tempMarked.delete(node);
			ordered.unshift(node);
		}
	}

	top_sort() {

		let unmarked = Array.from(this.get_all_nodes())
			.sort((a, b) => (a.outRel.name > b.outRel.name) ? 1 : -1);

		let marked = new Set();
		let tempMarked = new Set();
		let ordered = [];

		while (unmarked.length > 0) {
			let node = unmarked.pop();
			this._top_sort_visit(node, marked, tempMarked, unmarked, ordered);
		}

		return ordered;
	}

	toStr() {
		let topSorted = this.top_sort();
		let retArr = [];

		for (let i = 0; i < topSorted.length; i++) {
			retArr.push(topSorted[i].toStr());
		}

		return retArr.join("\n\n")
	}
}

module.exports = {
	Create: Create,
	Open: Open,
	Concat: Concat,
	Aggregate: Aggregate,
	Project: Project,
	Multiply: Multiply,
	Divide: Divide,
	Join: Join,
	Dag: Dag
};
},{}],3:[function(require,module,exports){
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
},{"./col.js":1,"./dag.js":2,"./rel.js":4,"./utils.js":5}],4:[function(require,module,exports){
class Relation{

	constructor(name, columns, storedWith) {
		this.name = name;
		this.columns = columns;
		this.storedWith = storedWith;
	}

	rename(newName) {
		this.name = newName;

		for (let i = 0; i < this.columns.length; i++) {
			this.columns[i].relName = newName;
		}
	}

	updateColumnIndexes() {
		for (let i = 0; i < this.columns.length; i++) {
			this.columns[i].idx = i;
		}
	}

	updateColumns() {
		this.updateColumnIndexes();

		for (let i = 0; i < this.columns.length; i++) {
			this.columns[i].relName = this.name;
		}
	}

}

module.exports = {
	Relation: Relation
};
},{}],5:[function(require,module,exports){

function defCol(name, type, ...collSets) {

	let trustSet = new Set();

	for (let i = 0; i < collSets.length; i++) {
		trustSet.add(collSets[i]);
	}

	return [name, type, trustSet]
}

function find(columns, colName) {

	for (let i = 0; i < columns.length; i++) {
		if (columns[i].name === colName) {
			return columns[i];
		}
	}

	return null;

}

module.exports = {
	defCol: defCol,
	find: find
};
},{}],6:[function(require,module,exports){
const dag = require('./dag.js');

class Verify {

	constructor(protocol, policy) {
		this.protocol = new dag.Dag(protocol);
		this.policy = policy;
	}

	_findRoot() {
		/*
		Identify which root node in the workflow corresponds to the policy provided.
		 */

		let nodeName = this.policy.fileName;
		let rootNodes = this.protocol.roots;

		let rootArray = Array.from(rootNodes);

		for (let i = 0; i < rootArray.length; i++) {
			if (rootArray[i].outRel.name === nodeName) {
				return rootArray[i];
			}
		}

		throw `Error: node ${nodeName} not found in DAG.\n`;
	}

	_handleAggregate(column, node) {
		/*
		Determine if column in the set {agg_col, group_cols}.
    Update idx / name accordingly, and verify the column if necessary.
		 */

		if (node.aggCol.name === column.name) {
			let newCol = node.outRel.columns.slice(-1)[0];
			column.name = newCol.name;
			column.idx = newCol.idx;
			return column.verify();

		} else if (node.groupCols.map(c => c.name).includes(column.name)) {
			for (let i = 0; i < node.groupCols.length; i++) {
				if (node.groupCols[i].name === column.name) {
					column.idx = node.groupCols[i].idx;
				}
			}
			return this._continueTraversal(column, node);

		} else {
			return column.verify();

		}
	}

	_handleConcat(column, node) {
		/*
    Concat relations can rename columns, so update
    column name by its idx in the output relation.
		 */

		column.name = node.outRel.columns[column.idx].name;

		return this._continueTraversal(column, node);
	}

	_handleProject(column, node) {
		/*
    Project relations can involve shuffling of columns
    (but not renaming), so update column idx by name.
		 */

		for (let i = 0; i < node.outRel.columns.length; i++) {
			if (node.outRel.columns[i].name === column.name) {
				column.idx = node.outRel.columns[i].idx;
				return this._continueTraversal(column,node);
			}
		}

		/*
		NOTE - we don't automatically verify the column here because it is possible
		to perform some backwards inferrable operation on a revealable column
		(e.g. - multiply) from a non-revealable column and then project out the
		non-revealable column from the relation. Thus, even though this column is
		not explicitly part of the output, we still treat it as such to avoid this kind
		of exploit.
		 */
		return column;
	}

	_rewriteColumnForLeft(column, node) {
		/*
		Update column idx according to it's idx in the join node's output relation.
		 */

		let numColsInLeft = node.leftParent.outRel.columns.length;

		for (let i = 0; i < numColsInLeft; i++) {
			if (column.name === node.outRel.columns[i].name) {
				column.idx = node.outRel.columns[i].idx;
				return column;
			}
		}

		throw `Error: Column from right parent wasn't present in Join output relation.\n`
	}

	_rewriteColumnForRight(column, node) {
		/*
		Determine where this column is in the output relation and overwrite it's name / idx as needed.
		 */

		let rightJoinCols = node.rightJoinCols.map(c => c.name);
		let rightNonJoinCols = [];

		for (let i = 0; i < node.rightParent.outRel.columns; i++) {
			if (!rightJoinCols.includes(node.rightParent.outRel.columns[i])) {
				rightNonJoinCols.push(node.rightParent.outRel.columns[i]);
			}
		}

		if (rightJoinCols.includes(column.name)) {
			for (let i = 0; i < rightJoinCols.length; i++) {
				if (rightJoinCols[i].name === column.name) {
					column.name = node.outRel.columns[i].name;
					column.idx = i;
					return column;
				}
			}
		} else if (rightNonJoinCols.includes(column.name)) {
			for (let i = rightJoinCols.length; i < node.outRel.columns.length; i++) {
				if (node.outRel.columns[i].name === column.name) {
					column.idx = i;
					return column;
				}
			}
		} else {
			throw `Error: Column from right parent wasn't present in Join output relation.\n`
		}

	}

	_handleJoin(column, node) {
		/*
		Map column name / idx from appropriate column in output rel to this column.
		 */

		let leftParentName = node.leftParent.outRel.name;
		let rightParentName = node.rightParent.outRel.name;
		let retColumn;

		if (leftParentName === column.currentRelName) {
			retColumn = this._rewriteColumnForLeft(column, node);
		} else if (rightParentName === column.currentRelName) {
			retColumn = this._rewriteColumnForRight(column, node);
		} else {
			throw `Current node not present in parent relations.\n`
		}

		return this._continueTraversal(retColumn, node);
	}

	_continueTraversal(column, node) {
		/*
		Continue traversing the DAG. Only handling cases where the node
    is either terminal or has exactly one child for now, as conclave
    only handles single-path workflows.
		 */

		column.updateRelName(node);

		if (node.children.size === 1) {
			return this._verifyColumn(column, Array.from(node.children).pop());
		} else if (node.children.size === 0) {
			return column;
		} else {
			throw "Error: Split workflows not yet implemented. All nodes can have at most one child.\n";
		}

	}

	_verifyColumn(column, node) {
		/*
		For a given column, traverse the DAG and determine if the
    workflow is compatible with it's policy.

    TODO: might be able to work something out with the exploit in project() here -
    could force the reveal attribute to false on columns involved in mult/div ops.
		 */

		if (column.reveal) {
			return column.verify();
		}

		if (node instanceof dag.Aggregate) {
			return this._handleAggregate(column, node);
		} else if (node instanceof dag.Concat) {
			return this._handleConcat(column, node);
		} else if (node instanceof dag.Project) {
			return this._handleProject(column, node);
		} else if (node instanceof dag.Join) {
			return this._handleJoin(column, node);
		} else {
			// other ops dont affect policy evaluation
			return this._continueTraversal(column, node);
		}
	}

	_isVerified(c) {

		return c.verified;
	}

	verify() {
		/*(
		Entry point for policy verification. Verifies the policy against each column
		individually, and returns true if all columns were successfully verified.
		 */

		let root = this._findRoot();
		let columnsToVerify = root.outRel.columns
			.map(c =>
				new Column(this.policy.columns[c.name]["read"], c.name, c.idx));
		let verifiedColumns = columnsToVerify
			.map(v =>
				this._verifyColumn(v, Object.assign(Object.create(Object.getPrototypeOf(root)), root)));

		return verifiedColumns.every(this._isVerified);
	}
}

class Column {
	constructor(reveal, name, idx) {
		this.reveal = reveal;
		this.name = name;
		this.idx = idx;
		this.verified = false;
		this.currentRelName = "none";
	}

	verify() {
		this.verified = true;
		return this;
	}

	updateRelName(node) {
		this.currentRelName = node.outRel.name;
	}
}

module.exports = {
	Verify: Verify
};
},{"./dag.js":2}],7:[function(require,module,exports){
const cc = require('../../src/lang.js');
const utils = require('../../src/utils.js');
const ver = require('../../src/ver.js');

module.exports = {
  cc: cc,
  utils: utils,
  Verifier: ver
};

},{"../../src/lang.js":3,"../../src/utils.js":5,"../../src/ver.js":6}]},{},[7])(7)
});

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIi4uL3NyYy9jb2wuanMiLCIuLi9zcmMvZGFnLmpzIiwiLi4vc3JjL2xhbmcuanMiLCIuLi9zcmMvcmVsLmpzIiwiLi4vc3JjL3V0aWxzLmpzIiwiLi4vc3JjL3Zlci5qcyIsInNyYy9zaW11bGF0b3IuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdE5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNQQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gcihlLG4sdCl7ZnVuY3Rpb24gbyhpLGYpe2lmKCFuW2ldKXtpZighZVtpXSl7dmFyIGM9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZTtpZighZiYmYylyZXR1cm4gYyhpLCEwKTtpZih1KXJldHVybiB1KGksITApO3ZhciBhPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIraStcIidcIik7dGhyb3cgYS5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGF9dmFyIHA9bltpXT17ZXhwb3J0czp7fX07ZVtpXVswXS5jYWxsKHAuZXhwb3J0cyxmdW5jdGlvbihyKXt2YXIgbj1lW2ldWzFdW3JdO3JldHVybiBvKG58fHIpfSxwLHAuZXhwb3J0cyxyLGUsbix0KX1yZXR1cm4gbltpXS5leHBvcnRzfWZvcih2YXIgdT1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlLGk9MDtpPHQubGVuZ3RoO2krKylvKHRbaV0pO3JldHVybiBvfXJldHVybiByfSkoKSIsIlNldC5wcm90b3R5cGUuaW50ZXJzZWN0aW9uID0gZnVuY3Rpb24ob3RoZXJTZXQpXG57XG5cdGxldCBpbnRlcnNlY3Rpb25TZXQgPSBuZXcgU2V0KCk7XG5cdGZvcihsZXQgZWxlbSBvZiBvdGhlclNldClcblx0e1xuXHRcdGlmKHRoaXMuaGFzKGVsZW0pKVxuXHRcdFx0aW50ZXJzZWN0aW9uU2V0LmFkZChlbGVtKTtcblx0fVxuXG5cdHJldHVybiBpbnRlcnNlY3Rpb25TZXQ7XG59O1xuXG5jbGFzcyBDb2x1bW4ge1xuXG5cdGNvbnN0cnVjdG9yKHJlbE5hbWUsIG5hbWUsIGlkeCwgdHlwZVN0ciwgdHJ1c3RTZXQpIHtcblx0XHR0aGlzLnJlbE5hbWUgPSByZWxOYW1lO1xuXHRcdHRoaXMubmFtZSA9IG5hbWU7XG5cdFx0dGhpcy5pZHggPSBpZHg7XG5cdFx0dGhpcy50eXBlU3RyID0gdHlwZVN0cjtcblx0XHR0aGlzLnRydXN0U2V0ID0gdHJ1c3RTZXQ7XG5cdH1cblxuXHRtZXJnZUNvbGxTZXRzSW4ob3RoZXJDb2xsU2V0cykge1xuXHRcdHRoaXMudHJ1c3RTZXQgPSB0aGlzLnRydXN0U2V0LmludGVyc2VjdGlvbihvdGhlckNvbGxTZXRzKVxuXHR9XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHRDb2x1bW46IENvbHVtblxufTsiLCJjbGFzcyBOb2RlIHtcblxuXHRjb25zdHJ1Y3RvcihvdXRSZWwpIHtcblx0XHR0aGlzLm5hbWUgPSBcIm5vZGVcIjtcblx0XHR0aGlzLm91dFJlbCA9IG91dFJlbDtcblx0XHR0aGlzLmNoaWxkcmVuID0gbmV3IFNldCgpO1xuXHRcdHRoaXMucGFyZW50cyA9IG5ldyBTZXQoKTtcblx0fVxuXG5cdHRvU3RyKCkge1xuXHRcdGxldCBjaGlsZFN0ciA9IEFycmF5LmZyb20odGhpcy5jaGlsZHJlbikubWFwKGMgPT4gYy5uYW1lKS5qb2luKFwiLCBcIik7XG5cdFx0bGV0IHBhcmVudFN0ciA9IEFycmF5LmZyb20odGhpcy5wYXJlbnRzKS5tYXAocCA9PiBwLm5hbWUpLmpvaW4oXCIsIFwiKTtcblx0XHRyZXR1cm4gYG5hbWU6ICR7dGhpcy5uYW1lfVxcbmNoaWxkcmVuOiAke2NoaWxkU3RyfVxcbnBhcmVudHM6ICR7cGFyZW50U3RyfWA7XG5cdH1cbn1cblxuY2xhc3MgQ3JlYXRlIGV4dGVuZHMgTm9kZSB7XG5cblx0Y29uc3RydWN0b3Iob3V0UmVsKSB7XG5cdFx0c3VwZXIob3V0UmVsKTtcblxuXHRcdHRoaXMubmFtZSA9IFwiY3JlYXRlXCI7XG5cdH1cbn1cblxuY2xhc3MgT3BlbiBleHRlbmRzIE5vZGUge1xuXG5cdGNvbnN0cnVjdG9yKG91dFJlbCwgcGFyZW50KSB7XG5cdFx0c3VwZXIob3V0UmVsKTtcblxuXHRcdHRoaXMubmFtZSA9IFwib3BlblwiO1xuXHRcdHRoaXMucGFyZW50cy5hZGQocGFyZW50KTtcblx0fVxufVxuXG5jbGFzcyBDb25jYXQgZXh0ZW5kcyBOb2RlIHtcblxuXHRjb25zdHJ1Y3RvcihvdXRSZWwsIHBhcmVudHMpIHtcblx0XHRzdXBlcihvdXRSZWwpO1xuXG5cdFx0dGhpcy5uYW1lID0gXCJjb25jYXRcIjtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcGFyZW50cy5sZW5ndGg7IGkrKylcblx0XHR7XG5cdFx0XHR0aGlzLnBhcmVudHMuYWRkKHBhcmVudHNbaV0pXG5cdFx0fVxuXHR9XG59XG5cbmNsYXNzIEFnZ3JlZ2F0ZSBleHRlbmRzIE5vZGUge1xuXG5cdGNvbnN0cnVjdG9yKG91dFJlbCwgcGFyZW50LCBncm91cENvbHMsIGFnZ0NvbCwgYWdncmVnYXRvcikge1xuXHRcdHN1cGVyKG91dFJlbCk7XG5cblx0XHR0aGlzLm5hbWUgPSBcImFnZ3JlZ2F0aW9uXCI7XG5cdFx0dGhpcy5wYXJlbnRzLmFkZChwYXJlbnQpO1xuXHRcdHRoaXMuZ3JvdXBDb2xzID0gZ3JvdXBDb2xzO1xuXHRcdHRoaXMuYWdnQ29sID0gYWdnQ29sO1xuXHRcdHRoaXMuYWdncmVnYXRvciA9IGFnZ3JlZ2F0b3I7XG5cdH1cbn1cblxuY2xhc3MgUHJvamVjdCBleHRlbmRzIE5vZGUge1xuXG5cdGNvbnN0cnVjdG9yKG91dFJlbCwgcGFyZW50LCBzZWxlY3RlZENvbHMpIHtcblx0XHRzdXBlcihvdXRSZWwpO1xuXG5cdFx0dGhpcy5uYW1lID0gXCJQcm9qZWN0XCI7XG5cdFx0dGhpcy5wYXJlbnRzLmFkZChwYXJlbnQpO1xuXHRcdHRoaXMuc2VsZWN0ZWRDb2xzID0gc2VsZWN0ZWRDb2xzO1xuXHR9XG59XG5cbmNsYXNzIE11bHRpcGx5IGV4dGVuZHMgTm9kZSB7XG5cblx0Y29uc3RydWN0b3Iob3V0UmVsLCBwYXJlbnQsIHRhcmdldENvbCwgb3BlcmFuZHMpIHtcblx0XHRzdXBlcihvdXRSZWwpO1xuXG5cdFx0dGhpcy5uYW1lID0gXCJtdWx0aXBseVwiO1xuXHRcdHRoaXMucGFyZW50cy5hZGQocGFyZW50KTtcblx0XHR0aGlzLnRhcmdldENvbCA9IHRhcmdldENvbDtcblx0XHR0aGlzLm9wZXJhbmRzID0gb3BlcmFuZHM7XG5cdH1cbn1cblxuY2xhc3MgRGl2aWRlIGV4dGVuZHMgTm9kZSB7XG5cblx0Y29uc3RydWN0b3Iob3V0UmVsLCBwYXJlbnQsIHRhcmdldENvbCwgb3BlcmFuZHMpIHtcblx0XHRzdXBlcihvdXRSZWwpO1xuXG5cdFx0dGhpcy5uYW1lID0gXCJkaXZpZGVcIjtcblx0XHR0aGlzLnBhcmVudHMuYWRkKHBhcmVudCk7XG5cdFx0dGhpcy50YXJnZXRDb2wgPSB0YXJnZXRDb2w7XG5cdFx0dGhpcy5vcGVyYW5kcyA9IG9wZXJhbmRzO1xuXHR9XG59XG5cbmNsYXNzIEpvaW4gZXh0ZW5kcyBOb2RlIHtcblxuXHRjb25zdHJ1Y3RvcihvdXRSZWwsIGxlZnRQYXJlbnQsIHJpZ2h0UGFyZW50LCBsZWZ0Sm9pbkNvbHMsIHJpZ2h0Sm9pbkNvbHMpIHtcblx0XHRzdXBlcihvdXRSZWwpO1xuXG5cdFx0dGhpcy5uYW1lID0gXCJqb2luXCI7XG5cdFx0dGhpcy5sZWZ0UGFyZW50ID0gbGVmdFBhcmVudDtcblx0XHR0aGlzLnJpZ2h0UGFyZW50ID0gcmlnaHRQYXJlbnQ7XG5cdFx0dGhpcy5sZWZ0Sm9pbkNvbHMgPSBsZWZ0Sm9pbkNvbHM7XG5cdFx0dGhpcy5yaWdodEpvaW5Db2xzID0gcmlnaHRKb2luQ29scztcblxuXHRcdHRoaXMucGFyZW50cy5hZGQobGVmdFBhcmVudCk7XG5cdFx0dGhpcy5wYXJlbnRzLmFkZChyaWdodFBhcmVudCk7XG5cdH1cbn1cblxuY2xhc3MgRGFnIHtcblxuXHRjb25zdHJ1Y3Rvcihyb290cykge1xuXHRcdHRoaXMucm9vdHMgPSByb290cztcblx0fVxuXG5cdF9yZWN1cnNpdmVWaXNpdChub2RlLCB2aXNpdGVkKSB7XG5cblx0XHRpZiAoIXZpc2l0ZWQuaGFzKG5vZGUpKSB7XG5cdFx0XHR0aGlzLl9kZnNfdmlzaXQobm9kZSwgdmlzaXRlZClcblx0XHR9XG5cdH1cblxuXHRfZGZzX3Zpc2l0KG5vZGUsIHZpc2l0ZWQpIHtcblxuXHRcdHZpc2l0ZWQuYWRkKG5vZGUpO1xuXHRcdG5vZGUuY2hpbGRyZW4uZm9yRWFjaChjID0+IHRoaXMuX3JlY3Vyc2l2ZVZpc2l0KGMsIHZpc2l0ZWQpKTtcblxuXHRcdHJldHVybiB2aXNpdGVkO1xuXHR9XG5cblx0ZGZzX3Zpc2l0KCkge1xuXG5cdFx0bGV0IHZpc2l0ZWQgPSBuZXcgU2V0KCk7XG5cdFx0dGhpcy5yb290cy5mb3JFYWNoKHIgPT4gdGhpcy5fZGZzX3Zpc2l0KHIsIHZpc2l0ZWQpKTtcblxuXHRcdHJldHVybiB2aXNpdGVkO1xuXHR9XG5cblx0Z2V0X2FsbF9ub2RlcygpIHtcblxuXHRcdHJldHVybiB0aGlzLmRmc192aXNpdCgpO1xuXHR9XG5cblx0X3RvcF9zb3J0X3Zpc2l0KG5vZGUsIG1hcmtlZCwgdGVtcE1hcmtlZCwgdW5tYXJrZWQsIG9yZGVyZWQpIHtcblxuXHRcdGlmICh0ZW1wTWFya2VkLmhhcyhub2RlKSkgdGhyb3cgYEVycm9yOiBOb3QgYSBEYWcgLSBub2RlICR7bm9kZX0gd2FzIGluICR7dGVtcE1hcmtlZH0uXFxuYDtcblxuXHRcdGlmICghbWFya2VkLmhhcyhub2RlKSkge1xuXHRcdFx0aWYgKHVubWFya2VkLmluY2x1ZGVzKG5vZGUpKSB7XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdW5tYXJrZWQubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRpZiAodW5tYXJrZWRbaV0gPT09IG5vZGUpIHtcblx0XHRcdFx0XHRcdHVubWFya2VkLnNwbGljZShpLCAxKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0dGVtcE1hcmtlZC5hZGQobm9kZSk7XG5cdFx0XHRsZXQgY2hpbGRyZW4gPSBBcnJheS5mcm9tKG5vZGUuY2hpbGRyZW4pXG5cdFx0XHRcdC5zb3J0KChhLCBiKSA9PiAoYS5vdXRSZWwubmFtZSA+IGIub3V0UmVsLm5hbWUpID8gMTogLTEpO1xuXG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGNoaWxkcmVuLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdHRoaXMuX3RvcF9zb3J0X3Zpc2l0KGNoaWxkcmVuW2ldLCBtYXJrZWQsIHRlbXBNYXJrZWQsIHVubWFya2VkLCBvcmRlcmVkKVxuXHRcdFx0fVxuXG5cdFx0XHRtYXJrZWQuYWRkKG5vZGUpO1xuXHRcdFx0dW5tYXJrZWQucHVzaChub2RlKTtcblx0XHRcdHRlbXBNYXJrZWQuZGVsZXRlKG5vZGUpO1xuXHRcdFx0b3JkZXJlZC51bnNoaWZ0KG5vZGUpO1xuXHRcdH1cblx0fVxuXG5cdHRvcF9zb3J0KCkge1xuXG5cdFx0bGV0IHVubWFya2VkID0gQXJyYXkuZnJvbSh0aGlzLmdldF9hbGxfbm9kZXMoKSlcblx0XHRcdC5zb3J0KChhLCBiKSA9PiAoYS5vdXRSZWwubmFtZSA+IGIub3V0UmVsLm5hbWUpID8gMSA6IC0xKTtcblxuXHRcdGxldCBtYXJrZWQgPSBuZXcgU2V0KCk7XG5cdFx0bGV0IHRlbXBNYXJrZWQgPSBuZXcgU2V0KCk7XG5cdFx0bGV0IG9yZGVyZWQgPSBbXTtcblxuXHRcdHdoaWxlICh1bm1hcmtlZC5sZW5ndGggPiAwKSB7XG5cdFx0XHRsZXQgbm9kZSA9IHVubWFya2VkLnBvcCgpO1xuXHRcdFx0dGhpcy5fdG9wX3NvcnRfdmlzaXQobm9kZSwgbWFya2VkLCB0ZW1wTWFya2VkLCB1bm1hcmtlZCwgb3JkZXJlZCk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIG9yZGVyZWQ7XG5cdH1cblxuXHR0b1N0cigpIHtcblx0XHRsZXQgdG9wU29ydGVkID0gdGhpcy50b3Bfc29ydCgpO1xuXHRcdGxldCByZXRBcnIgPSBbXTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdG9wU29ydGVkLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRyZXRBcnIucHVzaCh0b3BTb3J0ZWRbaV0udG9TdHIoKSk7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHJldEFyci5qb2luKFwiXFxuXFxuXCIpXG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdENyZWF0ZTogQ3JlYXRlLFxuXHRPcGVuOiBPcGVuLFxuXHRDb25jYXQ6IENvbmNhdCxcblx0QWdncmVnYXRlOiBBZ2dyZWdhdGUsXG5cdFByb2plY3Q6IFByb2plY3QsXG5cdE11bHRpcGx5OiBNdWx0aXBseSxcblx0RGl2aWRlOiBEaXZpZGUsXG5cdEpvaW46IEpvaW4sXG5cdERhZzogRGFnXG59OyIsImNvbnN0IGRhZyA9IHJlcXVpcmUoJy4vZGFnLmpzJyk7XG5jb25zdCByZWwgPSByZXF1aXJlKCcuL3JlbC5qcycpO1xuY29uc3QgY29sID0gcmVxdWlyZSgnLi9jb2wuanMnKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi91dGlscy5qcycpO1xuXG5cbkFycmF5LnByb3RvdHlwZS5zZXRVbmlvbiA9IGZ1bmN0aW9uKHNldEFycmF5KSB7XG5cdC8qXG5cdEdpdmVuIGFuIGFycmF5IG9mIHNldHMsIGNvbnN0cnVjdCB0aGVpciB1bmlvbi5cblx0ICovXG5cblx0bGV0IF91bmlvbiA9IHNldEFycmF5WzBdO1xuXHRmb3IgKGxldCBpID0gMTsgaSA8IHNldEFycmF5Lmxlbmd0aDsgaSsrKVxuXHR7XG5cdFx0bGV0IHNldEVsZW07XG5cdFx0Zm9yIChzZXRFbGVtIG9mIHNldEFycmF5W2ldKVxuXHRcdHtcblx0XHRcdF91bmlvbi5hZGQoc2V0RWxlbSk7XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIF91bmlvbjtcbn07XG5cblxuZnVuY3Rpb24gY29weShvYmopIHtcblx0Lypcblx0UmV0dXJuIGEgZGVlcCBjb3B5IG9mIGFuIG9iamVjdC5cblx0ICovXG5cblx0cmV0dXJuIE9iamVjdC5hc3NpZ24oT2JqZWN0LmNyZWF0ZShPYmplY3QuZ2V0UHJvdG90eXBlT2Yob2JqKSksIG9iaik7XG59XG5cblxuZnVuY3Rpb24gY3JlYXRlKHJlbE5hbWUsIGNvbHVtbnMsIHN0b3JlZFdpdGgpIHtcblx0Lypcblx0Q29uc3RydWN0IGEgQ3JlYXRlIG5vZGUuXG5cdCAqL1xuXG5cdGxldCBjb2xzID0gW107XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG5cblx0XHRsZXQgdGhpc0NvbCA9IGNvbHVtbnNbaV07XG5cblx0XHRjb2xzLnB1c2goXG5cdFx0XHRuZXcgY29sLkNvbHVtbihyZWxOYW1lLCB0aGlzQ29sWzBdLCBpLCB0aGlzQ29sWzFdLCB0aGlzQ29sWzJdKSk7XG5cdH1cblxuXHRsZXQgb3V0UmVsID0gbmV3IHJlbC5SZWxhdGlvbihyZWxOYW1lLCBjb2xzLCBzdG9yZWRXaXRoKTtcblxuXHRyZXR1cm4gbmV3IGRhZy5DcmVhdGUob3V0UmVsKTtcbn1cblxuXG5mdW5jdGlvbiBfb3BlbihpbnB1dE9wTm9kZSwgb3V0cHV0TmFtZSwgdGFyZ2V0UGFydHkpIHtcblx0Lypcblx0Q29uc3RydWN0IGFuIE9wZW4gbm9kZSB3aG9zZSBzdG9yZWRXaXRoIHNldCBpcyB0aGUgdGFyZ2V0UGFydHkuXG5cdCAqL1xuXG5cdGxldCBvdXRSZWwgPSBjb3B5KGlucHV0T3BOb2RlLm91dFJlbCk7XG5cblx0b3V0UmVsLnN0b3JlZFdpdGggPSB0YXJnZXRQYXJ0eTtcblx0b3V0UmVsLnJlbmFtZShvdXRwdXROYW1lKTtcblxuXHRsZXQgb3Blbk9wID0gbmV3IGRhZy5PcGVuKG91dFJlbCwgaW5wdXRPcE5vZGUpO1xuXHRpbnB1dE9wTm9kZS5jaGlsZHJlbi5hZGQob3Blbk9wKTtcblxuXHRyZXR1cm4gb3Blbk9wO1xufVxuXG5cbmZ1bmN0aW9uIGNvbGxlY3QoaW5wdXRPcE5vZGUsIG91dHB1dE5hbWUsIHRhcmdldFBhcnR5KSB7XG5cdC8qXG5cdENvbGxlY3QgdGhlIG91dHB1dCBkYXRhIG9mIGEgY29tcHV0YXRpb24uIFJldHVybnMgYW4gT3BlbiBub2RlLlxuXHQgKi9cblxuXHRfb3BlbihpbnB1dE9wTm9kZSwgb3V0cHV0TmFtZSwgdGFyZ2V0UGFydHkpO1xufVxuXG5mdW5jdGlvbiBjb25jYXRlbmF0ZShpbnB1dE9wTm9kZXMsIG91dHB1dE5hbWUsIGNvbHVtbk5hbWVzKSB7XG5cdC8qXG5cdENvbmNhdGVuYXRlIHR3byBob3Jpem9udGFsbHkgcGFydGl0aW9uZWQgZGF0YXNldHMuXG5cdCAqL1xuXG5cdGlmIChpbnB1dE9wTm9kZXMubGVuZ3RoIDwgMilcblx0XHR0aHJvdyBcIkVSUk9SOiBNdXN0IHBhc3MgYXQgbGVhc3QgdHdvIGlucHV0IG5vZGVzIHRvIGNvbmNhdC5cXG5cIjtcblxuXHRsZXQgaW5SZWxzID0gW107XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRPcE5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aW5SZWxzLnB1c2goaW5wdXRPcE5vZGVzW2ldLm91dFJlbCk7XG5cdH1cblxuXG5cdGxldCBudW1Db2xzID0gaW5SZWxzWzBdLmNvbHVtbnMubGVuZ3RoO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGluUmVscy5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKGluUmVsc1tpXS5jb2x1bW5zLmxlbmd0aCAhPT0gbnVtQ29scylcblx0XHRcdFx0dGhyb3cgXCJFUlJPUjogQWxsIGlucHV0IG5vZGVzIHRvIGNvbmNhdCBtdXN0IGhhdmUgdGhlIHNhbWUgbnVtYmVyIG9mIGNvbHVtbnMuXFxuXCJcblx0fVxuXG5cdGlmIChjb2x1bW5OYW1lcykge1xuXHRcdGlmIChjb2x1bW5OYW1lcy5sZW5ndGggIT09IG51bUNvbHMpXG5cdFx0XHR0aHJvdyBcIkVSUk9SOiBDb2x1bW4gbmFtZXMgYXJyYXkgbXVzdCBoYXZlIHNpemUgZXF1YWwgdG8gbnVtYmVyIG9mIGNvbHVtbnMuXFxuXCJcblx0fVxuXG5cdGxldCBvdXRSZWxDb2xzID0gWy4uLmluUmVsc1swXS5jb2x1bW5zXTtcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IG91dFJlbENvbHMubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAoY29sdW1uTmFtZXMpIHtcblx0XHRcdG91dFJlbENvbHNbaV0ubmFtZSA9IGNvbHVtbk5hbWVzW2ldO1xuXHRcdH1cblx0XHRvdXRSZWxDb2xzW2ldLnRydXN0U2V0ID0gbmV3IFNldCgpO1xuXHR9XG5cblx0bGV0IGluU3RvcmVkV2l0aCA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGluUmVscy5sZW5ndGg7IGkrKykge1xuXHRcdGluU3RvcmVkV2l0aC5wdXNoKGluUmVsc1tpXS5zdG9yZWRXaXRoKTtcblx0fVxuXG5cdGxldCBvdXRTdG9yZWRXaXRoID0gQXJyYXkucHJvdG90eXBlLnNldFVuaW9uKGluU3RvcmVkV2l0aCk7XG5cblx0bGV0IG91dFJlbCA9IG5ldyByZWwuUmVsYXRpb24ob3V0cHV0TmFtZSwgb3V0UmVsQ29scywgb3V0U3RvcmVkV2l0aCk7XG5cdG91dFJlbC51cGRhdGVDb2x1bW5zKCk7XG5cblx0bGV0IG9wID0gbmV3IGRhZy5Db25jYXQob3V0UmVsLCBpbnB1dE9wTm9kZXMpO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgaW5wdXRPcE5vZGVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aW5wdXRPcE5vZGVzW2ldLmNoaWxkcmVuLmFkZChvcClcblx0fVxuXG5cdHJldHVybiBvcDtcbn1cblxuZnVuY3Rpb24gYWdncmVnYXRlKGlucHV0T3BOb2RlLCBvdXRwdXROYW1lLCBncm91cENvbE5hbWVzLCBhZ2dDb2xOYW1lLCBhZ2dyZWdhdG9yLCBhZ2dPdXRDb2xOYW1lKSB7XG5cdC8qXG5cdENvbnN0cnVjdCBhbiBvdXRwdXQgUmVsYXRpb24vTm9kZSBwYWlyIHdob3NlIGNvbHVtbnMgYXJlIHRoZSBbZ3JvdXBDb2xzLCBhZ2dDb2xdLlxuXHQgKi9cblxuXHRsZXQgaW5SZWwgPSBpbnB1dE9wTm9kZS5vdXRSZWw7XG5cblx0bGV0IGluQ29scyA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGluUmVsLmNvbHVtbnMubGVuZ3RoOyBpKyspIHtcblx0XHRpbkNvbHMucHVzaChpblJlbC5jb2x1bW5zW2ldKTtcblx0fVxuXG5cdGxldCBncm91cENvbHMgPSBbXTtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBncm91cENvbE5hbWVzLmxlbmd0aDsgaSsrKSB7XG5cdFx0bGV0IHRoaXNDb2wgPSB1dGlscy5maW5kKGluQ29scywgZ3JvdXBDb2xOYW1lc1tpXSk7XG5cblx0XHRpZiAodGhpc0NvbCA9PT0gbnVsbClcblx0XHRcdHRocm93IGBFcnJvcjogQ29sdW1uICR7Z3JvdXBDb2xOYW1lc1tpXX0gbm90IGZvdW5kLlxcbmA7XG5cblx0XHRncm91cENvbHMucHVzaCh0aGlzQ29sKTtcblx0fVxuXG5cdGxldCBhZ2dDb2wgPSB1dGlscy5maW5kKGluQ29scywgYWdnQ29sTmFtZSk7XG5cdGlmIChhZ2dDb2wgPT09IG51bGwpIHRocm93IGBFcnJvcjogQ29sdW1uICR7YWdnQ29sTmFtZX0gbm90IGZvdW5kLlxcbmA7XG5cblx0bGV0IGFnZ091dENvbCA9IGNvcHkoYWdnQ29sKTtcblx0YWdnT3V0Q29sLm5hbWUgPSBhZ2dPdXRDb2xOYW1lO1xuXG5cdGxldCBvdXRSZWxDb2xzID0gW107XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgZ3JvdXBDb2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0b3V0UmVsQ29scy5wdXNoKGNvcHkoZ3JvdXBDb2xzW2ldKSk7XG5cdH1cblx0b3V0UmVsQ29scy5wdXNoKGNvcHkoYWdnT3V0Q29sKSk7XG5cblx0bGV0IG91dFJlbCA9IG5ldyByZWwuUmVsYXRpb24ob3V0cHV0TmFtZSwgb3V0UmVsQ29scywgbmV3IFNldChpblJlbC5zdG9yZWRXaXRoKSk7XG5cdG91dFJlbC51cGRhdGVDb2x1bW5zKCk7XG5cblx0bGV0IG9wID0gbmV3IGRhZy5BZ2dyZWdhdGUob3V0UmVsLCBpbnB1dE9wTm9kZSwgZ3JvdXBDb2xzLCBhZ2dDb2wsIGFnZ3JlZ2F0b3IpO1xuXHRpbnB1dE9wTm9kZS5jaGlsZHJlbi5hZGQob3ApO1xuXG5cdHJldHVybiBvcDtcbn1cblxuZnVuY3Rpb24gcHJvamVjdChpbnB1dE9wTm9kZSwgb3V0cHV0TmFtZSwgc2VsZWN0ZWRDb2xOYW1lcykge1xuXHQvKlxuXHRQcm9qZWN0IG91dCBvbmUgb3IgbW9yZSBjb2x1bW5zIGluIHRoZSBvcmRlciBpbmRpY2F0ZWQgYnkgc2VsZWN0ZWRDb2xOYW1lcy5cblx0ICovXG5cblx0bGV0IGluUmVsID0gaW5wdXRPcE5vZGUub3V0UmVsO1xuXHRsZXQgaW5Db2xzID0gaW5SZWwuY29sdW1ucztcblxuXHRsZXQgb3V0UmVsQ29scyA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IHNlbGVjdGVkQ29sTmFtZXMubGVuZ3RoOyBpKyspIHtcblx0XHRsZXQgdGhpc0NvbCA9IHV0aWxzLmZpbmQoaW5Db2xzLCBzZWxlY3RlZENvbE5hbWVzW2ldKTtcblxuXHRcdGlmICh0aGlzQ29sID09PSBudWxsKVxuXHRcdFx0dGhyb3cgYEVycm9yOiBDb2x1bW4gJHtzZWxlY3RlZENvbE5hbWVzW2ldfSBub3QgZm91bmQuXFxuYDtcblxuXHRcdGxldCBwdXNoZWRDb2wgPSBjb3B5KHRoaXNDb2wpO1xuXHRcdHB1c2hlZENvbC50cnVzdFNldCA9IG5ldyBTZXQoKTtcblxuXHRcdG91dFJlbENvbHMucHVzaChwdXNoZWRDb2wpO1xuXHR9XG5cblx0bGV0IG91dFJlbCA9IG5ldyByZWwuUmVsYXRpb24ob3V0cHV0TmFtZSwgb3V0UmVsQ29scywgbmV3IFNldChpblJlbC5zdG9yZWRXaXRoKSk7XG5cdG91dFJlbC51cGRhdGVDb2x1bW5zKCk7XG5cblx0bGV0IG9wID0gbmV3IGRhZy5Qcm9qZWN0KG91dFJlbCwgaW5wdXRPcE5vZGUsIG91dFJlbENvbHMpO1xuXHRpbnB1dE9wTm9kZS5jaGlsZHJlbi5hZGQob3ApO1xuXG5cdHJldHVybiBvcDtcbn1cblxuZnVuY3Rpb24gbXVsdGlwbHkoaW5wdXRPcE5vZGUsIG91dHB1dE5hbWUsIHRhcmdldENvbE5hbWUsIG9wZXJhbmRzKSB7XG5cdC8qXG5cdE11bHRpcGx5IGEgY29sdW1uIGJ5IG9uZSBvciBtb3JlIGNvbHVtbnMsIGEgc2NhbGFyLCBvciBib3RoLiBBbGwgdmFsdWVzIGluIHRoZSBvcGVyYW5kcyBhcnJheSB3aWxsXG5cdGJlIG11bHRpcGxpZWQgdG9nZXRoZXIgdG8gY3JlYXRlIHRoZSByZXN1bHRpbmcgb3V0cHV0IGNvbHVtbi4gSWYgdGhlIGZpcnN0IHZhbHVlIG9mIG9wZXJhbmRzIGlzIGVxdWFsXG5cdHRvIHRoZSB0YXJnZXRDb2xOYW1lLCB0aGVuIHRoYXQgY29sdW1uIHdpbGwgYmUgb3BlcmF0ZWQgdXBvbiBpbiBwbGFjZSBhbmQgaW5jbHVkZWQgaW4gdGhlIG91dHB1dC4gRWxzZSxcblx0YSBuZXcgY29sdW1uIHdpbGwgYmUgY29uc3RydWN0ZWQgd2hvc2UgbmFtZSB3aWxsIGJlIHRhcmdldENvbE5hbWUsIGFuZCB0aGUgcHJvZHVjdCBvZiB0aGUgb3BlcmFuZHMgYXJyYXlcblx0d2lsbCBiZSBzdG9yZWQgaW4gdGhhdCBjb2x1bW4uXG5cdCAqL1xuXG5cdGxldCBpblJlbCA9IGlucHV0T3BOb2RlLm91dFJlbDtcblx0bGV0IG91dFJlbENvbHMgPSBbLi4uaW5SZWwuY29sdW1uc107XG5cblx0bGV0IG9wcyA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IG9wZXJhbmRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKHR5cGVvZihvcGVyYW5kc1tpXSA9PT0gXCJzdHJpbmdcIikpIHtcblx0XHRcdG9wcy5wdXNoKHV0aWxzLmZpbmQoaW5SZWwuY29sdW1ucywgb3BlcmFuZHNbaV0pKVxuXHRcdH0gZWxzZSBpZiAodHlwZW9mKG9wZXJhbmRzW2ldKSA9PT0gXCJudW1iZXJcIikge1xuXHRcdFx0b3BzLnB1c2gob3BlcmFuZHNbaV0pO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBgRVJST1I6IFVuc3VwcG9ydGVkIG9wZXJhbmQgJHtvcGVyYW5kc1tpXX0gXFxuYDtcblx0XHR9XG5cdH1cblxuXHRsZXQgdGFyZ2V0Q29sO1xuXHRpZiAodGFyZ2V0Q29sTmFtZSA9PT0gb3BlcmFuZHNbMF0ubmFtZSkge1xuXHRcdHRhcmdldENvbCA9IGNvcHkodXRpbHMuZmluZChpblJlbC5jb2x1bW5zLCB0YXJnZXRDb2xOYW1lKSk7XG5cdH0gZWxzZSB7XG5cdFx0dGFyZ2V0Q29sID0gbmV3IGNvbC5Db2x1bW4ob3V0cHV0TmFtZSwgdGFyZ2V0Q29sTmFtZSwgaW5SZWwuY29sdW1ucy5sZW5ndGgsIFwiSU5URUdFUlwiLCBuZXcgU2V0KCkpO1xuXHRcdG91dFJlbENvbHMucHVzaCh0YXJnZXRDb2wpXG5cdH1cblxuXHRsZXQgb3V0UmVsID0gbmV3IHJlbC5SZWxhdGlvbihvdXRwdXROYW1lLCBvdXRSZWxDb2xzLCBuZXcgU2V0KGluUmVsLnN0b3JlZFdpdGgpKTtcblx0b3V0UmVsLnVwZGF0ZUNvbHVtbnMoKTtcblxuXHRsZXQgb3AgPSBuZXcgZGFnLk11bHRpcGx5KG91dFJlbCwgaW5wdXRPcE5vZGUsIHRhcmdldENvbCwgb3BlcmFuZHMpO1xuXHRpbnB1dE9wTm9kZS5jaGlsZHJlbi5hZGQob3ApO1xuXG5cdHJldHVybiBvcDtcbn1cblxuZnVuY3Rpb24gZGl2aWRlKGlucHV0T3BOb2RlLCBvdXRwdXROYW1lLCB0YXJnZXRDb2xOYW1lLCBvcGVyYW5kcykge1xuXHQvKlxuXHREaXZpZGUgYSBjb2x1bW4gYnkgb25lIG9yIG1vcmUgY29sdW1ucywgYSBzY2FsYXIsIG9yIGJvdGguIFRoZSBzeW50YXggZm9yIHRoZSBvcGVyYW5kcyBhcnJheSBhbmRcblx0dGFyZ2V0Q29sTmFtZSBmb3IgdGhpcyBtZXRob2QgaXMgaWRlbnRpY2FsIHRvIHRoZSBtdWx0aXBseSgpIG1ldGhvZCBhYm92ZS5cblx0ICovXG5cblx0bGV0IGluUmVsID0gaW5wdXRPcE5vZGUub3V0UmVsO1xuXHRsZXQgb3V0UmVsQ29scyA9IFsuLi5pblJlbC5jb2x1bW5zXTtcblxuXHRsZXQgb3BzID0gW107XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgb3BlcmFuZHMubGVuZ3RoOyBpKyspIHtcblx0XHRpZiAodHlwZW9mKG9wZXJhbmRzW2ldID09PSBcInN0cmluZ1wiKSkge1xuXHRcdFx0b3BzLnB1c2godXRpbHMuZmluZChpblJlbC5jb2x1bW5zLCBvcGVyYW5kc1tpXSkpXG5cdFx0fSBlbHNlIGlmICh0eXBlb2Yob3BlcmFuZHNbaV0pID09PSBcIm51bWJlclwiKSB7XG5cdFx0XHRvcHMucHVzaChvcGVyYW5kc1tpXSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IGBFUlJPUjogVW5zdXBwb3J0ZWQgb3BlcmFuZCAke29wZXJhbmRzW2ldfSBcXG5gO1xuXHRcdH1cblx0fVxuXG5cdGxldCB0YXJnZXRDb2w7XG5cdGlmICh0YXJnZXRDb2xOYW1lID09PSBvcGVyYW5kc1swXS5uYW1lKSB7XG5cdFx0dGFyZ2V0Q29sID0gY29weSh1dGlscy5maW5kKGluUmVsLmNvbHVtbnMsIHRhcmdldENvbE5hbWUpKTtcblx0fSBlbHNlIHtcblx0XHR0YXJnZXRDb2wgPSBuZXcgY29sLkNvbHVtbihvdXRwdXROYW1lLCB0YXJnZXRDb2xOYW1lLCBpblJlbC5jb2x1bW5zLmxlbmd0aCwgXCJJTlRFR0VSXCIsIG5ldyBTZXQoKSk7XG5cdFx0b3V0UmVsQ29scy5wdXNoKHRhcmdldENvbClcblx0fVxuXG5cdGxldCBvdXRSZWwgPSBuZXcgcmVsLlJlbGF0aW9uKG91dHB1dE5hbWUsIG91dFJlbENvbHMsIG5ldyBTZXQoaW5SZWwuc3RvcmVkV2l0aCkpO1xuXHRvdXRSZWwudXBkYXRlQ29sdW1ucygpO1xuXG5cdGxldCBvcCA9IG5ldyBkYWcuRGl2aWRlKG91dFJlbCwgaW5wdXRPcE5vZGUsIHRhcmdldENvbCwgb3BlcmFuZHMpO1xuXHRpbnB1dE9wTm9kZS5jaGlsZHJlbi5hZGQob3ApO1xuXG5cdHJldHVybiBvcDtcbn1cblxuZnVuY3Rpb24gY29sc0Zyb21SZWwoc3RhcnRJZHgsIHJlbGF0aW9uLCBrZXlDb2xJZHhzLCBvdXRwdXROYW1lKSB7XG5cdC8qXG5cdEV4dHJhY3QgY29sdW1ucyB3aG9zZSBpZHggaXMgbm90IGluIHRoZSBrZXlDb2xJZHhzIHNldCBhbmQgY29uc3RydWN0IG5ld1xuXHRjb2x1bW5zIGFjY29yZGluZ2x5LiBSZXR1cm5zIGFuIGFycmF5IG9mIHRoZSBuZXdseSBjb25zdHJ1Y3RlZCBjb2x1bW5zLlxuXHQgKi9cblxuXHRsZXQgcmVzdWx0Q29scyA9IFtdO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgcmVsYXRpb24uY29sdW1ucy5sZW5ndGg7IGkrKykge1xuXHRcdGxldCB0aGlzQ29sID0gcmVsYXRpb24uY29sdW1uc1tpXTtcblxuXHRcdGlmICgha2V5Q29sSWR4cy5pbmNsdWRlcyh0aGlzQ29sLmlkeCkpIHtcblx0XHRcdGxldCBuZXdDb2wgPVxuXHRcdFx0XHRuZXcgY29sLkNvbHVtbihvdXRwdXROYW1lLCB0aGlzQ29sLm5hbWUsIGkgKyBzdGFydElkeCAtIGtleUNvbElkeHMubGVuZ3RoLCB0aGlzQ29sLnR5cGVTdHIsIG5ldyBTZXQoKSk7XG5cdFx0XHRyZXN1bHRDb2xzLnB1c2gobmV3Q29sKTtcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gcmVzdWx0Q29scztcbn1cblxuZnVuY3Rpb24gam9pbihsZWZ0SW5wdXROb2RlLCByaWdodElucHV0Tm9kZSwgb3V0cHV0TmFtZSwgbGVmdENvbE5hbWVzLCByaWdodENvbE5hbWVzKSB7XG5cdC8qXG5cdENvbnN0cnVjdHMgYSBSZWxhdGlvbi9Ob2RlIHBhaXIgY29uc2lzdGluZyBvZiB0aGUgcmVzdWx0IG9mIGEgam9pbiBvdmVyIHRoZSBsZWZ0Q29sTmFtZXNcblx0YW5kIHJpZ2h0Q29sTmFtZXMgYXJyYXlzIHdpdGggcmVzcGVjdCB0byB0aGUgdHdvIGlucHV0IG5vZGVzLlxuXHQgKi9cblxuXHRpZiAobGVmdENvbE5hbWVzLmxlbmd0aCAhPT0gcmlnaHRDb2xOYW1lcy5sZW5ndGgpXG5cdFx0dGhyb3cgYEVycm9yOiBKb2luIGNvbHVtbiBhcnJheXMgbXVzdCBoYXZlIGVxdWFsIGxlbmd0aC5cXG5gO1xuXG5cdGxldCBsZWZ0SW5SZWwgPSBsZWZ0SW5wdXROb2RlLm91dFJlbDtcblx0bGV0IHJpZ2h0SW5SZWwgPSByaWdodElucHV0Tm9kZS5vdXRSZWw7XG5cblx0bGV0IGxlZnRDb2xzID0gbGVmdEluUmVsLmNvbHVtbnM7XG5cdGxldCByaWdodENvbHMgPSByaWdodEluUmVsLmNvbHVtbnM7XG5cblx0bGV0IGxlZnRKb2luQ29scyA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxlZnRDb2xOYW1lcy5sZW5ndGg7IGkrKykge1xuXHRcdGxldCB0aGlzQ29sID0gdXRpbHMuZmluZChsZWZ0Q29scywgbGVmdENvbE5hbWVzW2ldKTtcblxuXHRcdGlmICh0aGlzQ29sID09PSBudWxsKVxuXHRcdFx0dGhyb3cgYEVycm9yOiBDb2x1bW4gJHtsZWZ0Q29sTmFtZXNbaV19IG5vdCBmb3VuZC5cXG5gO1xuXG5cdFx0bGVmdEpvaW5Db2xzLnB1c2godGhpc0NvbCk7XG5cdH1cblxuXHRsZXQgcmlnaHRKb2luQ29scyA9IFtdO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IHJpZ2h0Q29sTmFtZXMubGVuZ3RoOyBpKyspIHtcblx0XHRsZXQgdGhpc0NvbCA9IHV0aWxzLmZpbmQocmlnaHRDb2xzLCByaWdodENvbE5hbWVzW2ldKTtcblxuXHRcdGlmICh0aGlzQ29sID09PSBudWxsKVxuXHRcdFx0dGhyb3cgYEVycm9yOiBDb2x1bW4gJHtyaWdodENvbE5hbWVzW2ldfSBub3QgZm91bmQuXFxuYDtcblxuXHRcdHJpZ2h0Sm9pbkNvbHMucHVzaCh0aGlzQ29sKTtcblx0fVxuXG5cdGxldCBvdXRLZXlDb2xzID0gW107XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVmdEpvaW5Db2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0b3V0S2V5Q29scy5wdXNoKG5ldyBjb2wuQ29sdW1uKG91dHB1dE5hbWUsIGxlZnRKb2luQ29sc1tpXS5uYW1lLCBpLCBsZWZ0Sm9pbkNvbHMudHlwZVN0ciwgbmV3IFNldCgpKSk7XG5cdH1cblxuXHRsZXQgc3RhcnRJZHggPSBvdXRLZXlDb2xzLmxlbmd0aDtcblx0bGV0IGNvbnRpbnVlSWR4ID0gbGVmdENvbHMubGVuZ3RoO1xuXG5cdGxldCBsZWZ0S2V5Q29sSWR4cyA9IFtdO1xuXHRsZXQgcmlnaHRLZXlDb2xJZHhzID0gW107XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVmdEpvaW5Db2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0bGVmdEtleUNvbElkeHMucHVzaChsZWZ0Sm9pbkNvbHNbaV0uaWR4KTtcblx0XHRyaWdodEtleUNvbElkeHMucHVzaChyaWdodEpvaW5Db2xzW2ldLmlkeCk7XG5cdH1cblxuXHRsZXQgbGVmdE91dFJlbENvbHMgPSBjb2xzRnJvbVJlbChzdGFydElkeCwgbGVmdEluUmVsLCBsZWZ0S2V5Q29sSWR4cywgb3V0cHV0TmFtZSk7XG5cdGxldCByaWdodE91dFJlbENvbHMgPSBjb2xzRnJvbVJlbChjb250aW51ZUlkeCwgcmlnaHRJblJlbCwgcmlnaHRLZXlDb2xJZHhzLCBvdXRwdXROYW1lKTtcblxuXHRsZXQgb3V0UmVsQ29scyA9IG91dEtleUNvbHMuY29uY2F0KGxlZnRPdXRSZWxDb2xzLCByaWdodE91dFJlbENvbHMpO1xuXHRsZXQgb3V0U3RvcmVkV2l0aCA9IEFycmF5LnByb3RvdHlwZS5zZXRVbmlvbihbbGVmdEluUmVsLnN0b3JlZFdpdGgsIHJpZ2h0SW5SZWwuc3RvcmVkV2l0aF0pO1xuXG5cdGxldCBvdXRSZWwgPSBuZXcgcmVsLlJlbGF0aW9uKG91dHB1dE5hbWUsIG91dFJlbENvbHMsIG91dFN0b3JlZFdpdGgpO1xuXHRvdXRSZWwudXBkYXRlQ29sdW1ucygpO1xuXG5cdGxldCBvcCA9IG5ldyBkYWcuSm9pbihvdXRSZWwsIGxlZnRJbnB1dE5vZGUsIHJpZ2h0SW5wdXROb2RlLCBsZWZ0Sm9pbkNvbHMsIHJpZ2h0Sm9pbkNvbHMpO1xuXG5cdGxlZnRJbnB1dE5vZGUuY2hpbGRyZW4uYWRkKG9wKTtcblx0cmlnaHRJbnB1dE5vZGUuY2hpbGRyZW4uYWRkKG9wKTtcblxuXHRyZXR1cm4gb3A7XG59XG5cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGNyZWF0ZTogY3JlYXRlLFxuXHRjb2xsZWN0OiBjb2xsZWN0LFxuXHRjb25jYXRlbmF0ZTogY29uY2F0ZW5hdGUsXG5cdGFnZ3JlZ2F0ZTogYWdncmVnYXRlLFxuXHRwcm9qZWN0OiBwcm9qZWN0LFxuXHRtdWx0aXBseTogbXVsdGlwbHksXG5cdGRpdmlkZTogZGl2aWRlLFxuXHRqb2luOiBqb2luXG59OyIsImNsYXNzIFJlbGF0aW9ue1xuXG5cdGNvbnN0cnVjdG9yKG5hbWUsIGNvbHVtbnMsIHN0b3JlZFdpdGgpIHtcblx0XHR0aGlzLm5hbWUgPSBuYW1lO1xuXHRcdHRoaXMuY29sdW1ucyA9IGNvbHVtbnM7XG5cdFx0dGhpcy5zdG9yZWRXaXRoID0gc3RvcmVkV2l0aDtcblx0fVxuXG5cdHJlbmFtZShuZXdOYW1lKSB7XG5cdFx0dGhpcy5uYW1lID0gbmV3TmFtZTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbHVtbnNbaV0ucmVsTmFtZSA9IG5ld05hbWU7XG5cdFx0fVxuXHR9XG5cblx0dXBkYXRlQ29sdW1uSW5kZXhlcygpIHtcblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuY29sdW1ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dGhpcy5jb2x1bW5zW2ldLmlkeCA9IGk7XG5cdFx0fVxuXHR9XG5cblx0dXBkYXRlQ29sdW1ucygpIHtcblx0XHR0aGlzLnVwZGF0ZUNvbHVtbkluZGV4ZXMoKTtcblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5jb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0aGlzLmNvbHVtbnNbaV0ucmVsTmFtZSA9IHRoaXMubmFtZTtcblx0XHR9XG5cdH1cblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0UmVsYXRpb246IFJlbGF0aW9uXG59OyIsIlxuZnVuY3Rpb24gZGVmQ29sKG5hbWUsIHR5cGUsIC4uLmNvbGxTZXRzKSB7XG5cblx0bGV0IHRydXN0U2V0ID0gbmV3IFNldCgpO1xuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgY29sbFNldHMubGVuZ3RoOyBpKyspIHtcblx0XHR0cnVzdFNldC5hZGQoY29sbFNldHNbaV0pO1xuXHR9XG5cblx0cmV0dXJuIFtuYW1lLCB0eXBlLCB0cnVzdFNldF1cbn1cblxuZnVuY3Rpb24gZmluZChjb2x1bW5zLCBjb2xOYW1lKSB7XG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBjb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0aWYgKGNvbHVtbnNbaV0ubmFtZSA9PT0gY29sTmFtZSkge1xuXHRcdFx0cmV0dXJuIGNvbHVtbnNbaV07XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGw7XG5cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdGRlZkNvbDogZGVmQ29sLFxuXHRmaW5kOiBmaW5kXG59OyIsImNvbnN0IGRhZyA9IHJlcXVpcmUoJy4vZGFnLmpzJyk7XG5cbmNsYXNzIFZlcmlmeSB7XG5cblx0Y29uc3RydWN0b3IocHJvdG9jb2wsIHBvbGljeSkge1xuXHRcdHRoaXMucHJvdG9jb2wgPSBuZXcgZGFnLkRhZyhwcm90b2NvbCk7XG5cdFx0dGhpcy5wb2xpY3kgPSBwb2xpY3k7XG5cdH1cblxuXHRfZmluZFJvb3QoKSB7XG5cdFx0Lypcblx0XHRJZGVudGlmeSB3aGljaCByb290IG5vZGUgaW4gdGhlIHdvcmtmbG93IGNvcnJlc3BvbmRzIHRvIHRoZSBwb2xpY3kgcHJvdmlkZWQuXG5cdFx0ICovXG5cblx0XHRsZXQgbm9kZU5hbWUgPSB0aGlzLnBvbGljeS5maWxlTmFtZTtcblx0XHRsZXQgcm9vdE5vZGVzID0gdGhpcy5wcm90b2NvbC5yb290cztcblxuXHRcdGxldCByb290QXJyYXkgPSBBcnJheS5mcm9tKHJvb3ROb2Rlcyk7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHJvb3RBcnJheS5sZW5ndGg7IGkrKykge1xuXHRcdFx0aWYgKHJvb3RBcnJheVtpXS5vdXRSZWwubmFtZSA9PT0gbm9kZU5hbWUpIHtcblx0XHRcdFx0cmV0dXJuIHJvb3RBcnJheVtpXTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aHJvdyBgRXJyb3I6IG5vZGUgJHtub2RlTmFtZX0gbm90IGZvdW5kIGluIERBRy5cXG5gO1xuXHR9XG5cblx0X2hhbmRsZUFnZ3JlZ2F0ZShjb2x1bW4sIG5vZGUpIHtcblx0XHQvKlxuXHRcdERldGVybWluZSBpZiBjb2x1bW4gaW4gdGhlIHNldCB7YWdnX2NvbCwgZ3JvdXBfY29sc30uXG4gICAgVXBkYXRlIGlkeCAvIG5hbWUgYWNjb3JkaW5nbHksIGFuZCB2ZXJpZnkgdGhlIGNvbHVtbiBpZiBuZWNlc3NhcnkuXG5cdFx0ICovXG5cblx0XHRpZiAobm9kZS5hZ2dDb2wubmFtZSA9PT0gY29sdW1uLm5hbWUpIHtcblx0XHRcdGxldCBuZXdDb2wgPSBub2RlLm91dFJlbC5jb2x1bW5zLnNsaWNlKC0xKVswXTtcblx0XHRcdGNvbHVtbi5uYW1lID0gbmV3Q29sLm5hbWU7XG5cdFx0XHRjb2x1bW4uaWR4ID0gbmV3Q29sLmlkeDtcblx0XHRcdHJldHVybiBjb2x1bW4udmVyaWZ5KCk7XG5cblx0XHR9IGVsc2UgaWYgKG5vZGUuZ3JvdXBDb2xzLm1hcChjID0+IGMubmFtZSkuaW5jbHVkZXMoY29sdW1uLm5hbWUpKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUuZ3JvdXBDb2xzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChub2RlLmdyb3VwQ29sc1tpXS5uYW1lID09PSBjb2x1bW4ubmFtZSkge1xuXHRcdFx0XHRcdGNvbHVtbi5pZHggPSBub2RlLmdyb3VwQ29sc1tpXS5pZHg7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHJldHVybiB0aGlzLl9jb250aW51ZVRyYXZlcnNhbChjb2x1bW4sIG5vZGUpO1xuXG5cdFx0fSBlbHNlIHtcblx0XHRcdHJldHVybiBjb2x1bW4udmVyaWZ5KCk7XG5cblx0XHR9XG5cdH1cblxuXHRfaGFuZGxlQ29uY2F0KGNvbHVtbiwgbm9kZSkge1xuXHRcdC8qXG4gICAgQ29uY2F0IHJlbGF0aW9ucyBjYW4gcmVuYW1lIGNvbHVtbnMsIHNvIHVwZGF0ZVxuICAgIGNvbHVtbiBuYW1lIGJ5IGl0cyBpZHggaW4gdGhlIG91dHB1dCByZWxhdGlvbi5cblx0XHQgKi9cblxuXHRcdGNvbHVtbi5uYW1lID0gbm9kZS5vdXRSZWwuY29sdW1uc1tjb2x1bW4uaWR4XS5uYW1lO1xuXG5cdFx0cmV0dXJuIHRoaXMuX2NvbnRpbnVlVHJhdmVyc2FsKGNvbHVtbiwgbm9kZSk7XG5cdH1cblxuXHRfaGFuZGxlUHJvamVjdChjb2x1bW4sIG5vZGUpIHtcblx0XHQvKlxuICAgIFByb2plY3QgcmVsYXRpb25zIGNhbiBpbnZvbHZlIHNodWZmbGluZyBvZiBjb2x1bW5zXG4gICAgKGJ1dCBub3QgcmVuYW1pbmcpLCBzbyB1cGRhdGUgY29sdW1uIGlkeCBieSBuYW1lLlxuXHRcdCAqL1xuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBub2RlLm91dFJlbC5jb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAobm9kZS5vdXRSZWwuY29sdW1uc1tpXS5uYW1lID09PSBjb2x1bW4ubmFtZSkge1xuXHRcdFx0XHRjb2x1bW4uaWR4ID0gbm9kZS5vdXRSZWwuY29sdW1uc1tpXS5pZHg7XG5cdFx0XHRcdHJldHVybiB0aGlzLl9jb250aW51ZVRyYXZlcnNhbChjb2x1bW4sbm9kZSk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Lypcblx0XHROT1RFIC0gd2UgZG9uJ3QgYXV0b21hdGljYWxseSB2ZXJpZnkgdGhlIGNvbHVtbiBoZXJlIGJlY2F1c2UgaXQgaXMgcG9zc2libGVcblx0XHR0byBwZXJmb3JtIHNvbWUgYmFja3dhcmRzIGluZmVycmFibGUgb3BlcmF0aW9uIG9uIGEgcmV2ZWFsYWJsZSBjb2x1bW5cblx0XHQoZS5nLiAtIG11bHRpcGx5KSBmcm9tIGEgbm9uLXJldmVhbGFibGUgY29sdW1uIGFuZCB0aGVuIHByb2plY3Qgb3V0IHRoZVxuXHRcdG5vbi1yZXZlYWxhYmxlIGNvbHVtbiBmcm9tIHRoZSByZWxhdGlvbi4gVGh1cywgZXZlbiB0aG91Z2ggdGhpcyBjb2x1bW4gaXNcblx0XHRub3QgZXhwbGljaXRseSBwYXJ0IG9mIHRoZSBvdXRwdXQsIHdlIHN0aWxsIHRyZWF0IGl0IGFzIHN1Y2ggdG8gYXZvaWQgdGhpcyBraW5kXG5cdFx0b2YgZXhwbG9pdC5cblx0XHQgKi9cblx0XHRyZXR1cm4gY29sdW1uO1xuXHR9XG5cblx0X3Jld3JpdGVDb2x1bW5Gb3JMZWZ0KGNvbHVtbiwgbm9kZSkge1xuXHRcdC8qXG5cdFx0VXBkYXRlIGNvbHVtbiBpZHggYWNjb3JkaW5nIHRvIGl0J3MgaWR4IGluIHRoZSBqb2luIG5vZGUncyBvdXRwdXQgcmVsYXRpb24uXG5cdFx0ICovXG5cblx0XHRsZXQgbnVtQ29sc0luTGVmdCA9IG5vZGUubGVmdFBhcmVudC5vdXRSZWwuY29sdW1ucy5sZW5ndGg7XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG51bUNvbHNJbkxlZnQ7IGkrKykge1xuXHRcdFx0aWYgKGNvbHVtbi5uYW1lID09PSBub2RlLm91dFJlbC5jb2x1bW5zW2ldLm5hbWUpIHtcblx0XHRcdFx0Y29sdW1uLmlkeCA9IG5vZGUub3V0UmVsLmNvbHVtbnNbaV0uaWR4O1xuXHRcdFx0XHRyZXR1cm4gY29sdW1uO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHRocm93IGBFcnJvcjogQ29sdW1uIGZyb20gcmlnaHQgcGFyZW50IHdhc24ndCBwcmVzZW50IGluIEpvaW4gb3V0cHV0IHJlbGF0aW9uLlxcbmBcblx0fVxuXG5cdF9yZXdyaXRlQ29sdW1uRm9yUmlnaHQoY29sdW1uLCBub2RlKSB7XG5cdFx0Lypcblx0XHREZXRlcm1pbmUgd2hlcmUgdGhpcyBjb2x1bW4gaXMgaW4gdGhlIG91dHB1dCByZWxhdGlvbiBhbmQgb3ZlcndyaXRlIGl0J3MgbmFtZSAvIGlkeCBhcyBuZWVkZWQuXG5cdFx0ICovXG5cblx0XHRsZXQgcmlnaHRKb2luQ29scyA9IG5vZGUucmlnaHRKb2luQ29scy5tYXAoYyA9PiBjLm5hbWUpO1xuXHRcdGxldCByaWdodE5vbkpvaW5Db2xzID0gW107XG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IG5vZGUucmlnaHRQYXJlbnQub3V0UmVsLmNvbHVtbnM7IGkrKykge1xuXHRcdFx0aWYgKCFyaWdodEpvaW5Db2xzLmluY2x1ZGVzKG5vZGUucmlnaHRQYXJlbnQub3V0UmVsLmNvbHVtbnNbaV0pKSB7XG5cdFx0XHRcdHJpZ2h0Tm9uSm9pbkNvbHMucHVzaChub2RlLnJpZ2h0UGFyZW50Lm91dFJlbC5jb2x1bW5zW2ldKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRpZiAocmlnaHRKb2luQ29scy5pbmNsdWRlcyhjb2x1bW4ubmFtZSkpIHtcblx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgcmlnaHRKb2luQ29scy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRpZiAocmlnaHRKb2luQ29sc1tpXS5uYW1lID09PSBjb2x1bW4ubmFtZSkge1xuXHRcdFx0XHRcdGNvbHVtbi5uYW1lID0gbm9kZS5vdXRSZWwuY29sdW1uc1tpXS5uYW1lO1xuXHRcdFx0XHRcdGNvbHVtbi5pZHggPSBpO1xuXHRcdFx0XHRcdHJldHVybiBjb2x1bW47XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9IGVsc2UgaWYgKHJpZ2h0Tm9uSm9pbkNvbHMuaW5jbHVkZXMoY29sdW1uLm5hbWUpKSB7XG5cdFx0XHRmb3IgKGxldCBpID0gcmlnaHRKb2luQ29scy5sZW5ndGg7IGkgPCBub2RlLm91dFJlbC5jb2x1bW5zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdGlmIChub2RlLm91dFJlbC5jb2x1bW5zW2ldLm5hbWUgPT09IGNvbHVtbi5uYW1lKSB7XG5cdFx0XHRcdFx0Y29sdW1uLmlkeCA9IGk7XG5cdFx0XHRcdFx0cmV0dXJuIGNvbHVtbjtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aHJvdyBgRXJyb3I6IENvbHVtbiBmcm9tIHJpZ2h0IHBhcmVudCB3YXNuJ3QgcHJlc2VudCBpbiBKb2luIG91dHB1dCByZWxhdGlvbi5cXG5gXG5cdFx0fVxuXG5cdH1cblxuXHRfaGFuZGxlSm9pbihjb2x1bW4sIG5vZGUpIHtcblx0XHQvKlxuXHRcdE1hcCBjb2x1bW4gbmFtZSAvIGlkeCBmcm9tIGFwcHJvcHJpYXRlIGNvbHVtbiBpbiBvdXRwdXQgcmVsIHRvIHRoaXMgY29sdW1uLlxuXHRcdCAqL1xuXG5cdFx0bGV0IGxlZnRQYXJlbnROYW1lID0gbm9kZS5sZWZ0UGFyZW50Lm91dFJlbC5uYW1lO1xuXHRcdGxldCByaWdodFBhcmVudE5hbWUgPSBub2RlLnJpZ2h0UGFyZW50Lm91dFJlbC5uYW1lO1xuXHRcdGxldCByZXRDb2x1bW47XG5cblx0XHRpZiAobGVmdFBhcmVudE5hbWUgPT09IGNvbHVtbi5jdXJyZW50UmVsTmFtZSkge1xuXHRcdFx0cmV0Q29sdW1uID0gdGhpcy5fcmV3cml0ZUNvbHVtbkZvckxlZnQoY29sdW1uLCBub2RlKTtcblx0XHR9IGVsc2UgaWYgKHJpZ2h0UGFyZW50TmFtZSA9PT0gY29sdW1uLmN1cnJlbnRSZWxOYW1lKSB7XG5cdFx0XHRyZXRDb2x1bW4gPSB0aGlzLl9yZXdyaXRlQ29sdW1uRm9yUmlnaHQoY29sdW1uLCBub2RlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhyb3cgYEN1cnJlbnQgbm9kZSBub3QgcHJlc2VudCBpbiBwYXJlbnQgcmVsYXRpb25zLlxcbmBcblx0XHR9XG5cblx0XHRyZXR1cm4gdGhpcy5fY29udGludWVUcmF2ZXJzYWwocmV0Q29sdW1uLCBub2RlKTtcblx0fVxuXG5cdF9jb250aW51ZVRyYXZlcnNhbChjb2x1bW4sIG5vZGUpIHtcblx0XHQvKlxuXHRcdENvbnRpbnVlIHRyYXZlcnNpbmcgdGhlIERBRy4gT25seSBoYW5kbGluZyBjYXNlcyB3aGVyZSB0aGUgbm9kZVxuICAgIGlzIGVpdGhlciB0ZXJtaW5hbCBvciBoYXMgZXhhY3RseSBvbmUgY2hpbGQgZm9yIG5vdywgYXMgY29uY2xhdmVcbiAgICBvbmx5IGhhbmRsZXMgc2luZ2xlLXBhdGggd29ya2Zsb3dzLlxuXHRcdCAqL1xuXG5cdFx0Y29sdW1uLnVwZGF0ZVJlbE5hbWUobm9kZSk7XG5cblx0XHRpZiAobm9kZS5jaGlsZHJlbi5zaXplID09PSAxKSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5fdmVyaWZ5Q29sdW1uKGNvbHVtbiwgQXJyYXkuZnJvbShub2RlLmNoaWxkcmVuKS5wb3AoKSk7XG5cdFx0fSBlbHNlIGlmIChub2RlLmNoaWxkcmVuLnNpemUgPT09IDApIHtcblx0XHRcdHJldHVybiBjb2x1bW47XG5cdFx0fSBlbHNlIHtcblx0XHRcdHRocm93IFwiRXJyb3I6IFNwbGl0IHdvcmtmbG93cyBub3QgeWV0IGltcGxlbWVudGVkLiBBbGwgbm9kZXMgY2FuIGhhdmUgYXQgbW9zdCBvbmUgY2hpbGQuXFxuXCI7XG5cdFx0fVxuXG5cdH1cblxuXHRfdmVyaWZ5Q29sdW1uKGNvbHVtbiwgbm9kZSkge1xuXHRcdC8qXG5cdFx0Rm9yIGEgZ2l2ZW4gY29sdW1uLCB0cmF2ZXJzZSB0aGUgREFHIGFuZCBkZXRlcm1pbmUgaWYgdGhlXG4gICAgd29ya2Zsb3cgaXMgY29tcGF0aWJsZSB3aXRoIGl0J3MgcG9saWN5LlxuXG4gICAgVE9ETzogbWlnaHQgYmUgYWJsZSB0byB3b3JrIHNvbWV0aGluZyBvdXQgd2l0aCB0aGUgZXhwbG9pdCBpbiBwcm9qZWN0KCkgaGVyZSAtXG4gICAgY291bGQgZm9yY2UgdGhlIHJldmVhbCBhdHRyaWJ1dGUgdG8gZmFsc2Ugb24gY29sdW1ucyBpbnZvbHZlZCBpbiBtdWx0L2RpdiBvcHMuXG5cdFx0ICovXG5cblx0XHRpZiAoY29sdW1uLnJldmVhbCkge1xuXHRcdFx0cmV0dXJuIGNvbHVtbi52ZXJpZnkoKTtcblx0XHR9XG5cblx0XHRpZiAobm9kZSBpbnN0YW5jZW9mIGRhZy5BZ2dyZWdhdGUpIHtcblx0XHRcdHJldHVybiB0aGlzLl9oYW5kbGVBZ2dyZWdhdGUoY29sdW1uLCBub2RlKTtcblx0XHR9IGVsc2UgaWYgKG5vZGUgaW5zdGFuY2VvZiBkYWcuQ29uY2F0KSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5faGFuZGxlQ29uY2F0KGNvbHVtbiwgbm9kZSk7XG5cdFx0fSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgZGFnLlByb2plY3QpIHtcblx0XHRcdHJldHVybiB0aGlzLl9oYW5kbGVQcm9qZWN0KGNvbHVtbiwgbm9kZSk7XG5cdFx0fSBlbHNlIGlmIChub2RlIGluc3RhbmNlb2YgZGFnLkpvaW4pIHtcblx0XHRcdHJldHVybiB0aGlzLl9oYW5kbGVKb2luKGNvbHVtbiwgbm9kZSk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIG90aGVyIG9wcyBkb250IGFmZmVjdCBwb2xpY3kgZXZhbHVhdGlvblxuXHRcdFx0cmV0dXJuIHRoaXMuX2NvbnRpbnVlVHJhdmVyc2FsKGNvbHVtbiwgbm9kZSk7XG5cdFx0fVxuXHR9XG5cblx0X2lzVmVyaWZpZWQoYykge1xuXG5cdFx0cmV0dXJuIGMudmVyaWZpZWQ7XG5cdH1cblxuXHR2ZXJpZnkoKSB7XG5cdFx0LyooXG5cdFx0RW50cnkgcG9pbnQgZm9yIHBvbGljeSB2ZXJpZmljYXRpb24uIFZlcmlmaWVzIHRoZSBwb2xpY3kgYWdhaW5zdCBlYWNoIGNvbHVtblxuXHRcdGluZGl2aWR1YWxseSwgYW5kIHJldHVybnMgdHJ1ZSBpZiBhbGwgY29sdW1ucyB3ZXJlIHN1Y2Nlc3NmdWxseSB2ZXJpZmllZC5cblx0XHQgKi9cblxuXHRcdGxldCByb290ID0gdGhpcy5fZmluZFJvb3QoKTtcblx0XHRsZXQgY29sdW1uc1RvVmVyaWZ5ID0gcm9vdC5vdXRSZWwuY29sdW1uc1xuXHRcdFx0Lm1hcChjID0+XG5cdFx0XHRcdG5ldyBDb2x1bW4odGhpcy5wb2xpY3kuY29sdW1uc1tjLm5hbWVdW1wicmVhZFwiXSwgYy5uYW1lLCBjLmlkeCkpO1xuXHRcdGxldCB2ZXJpZmllZENvbHVtbnMgPSBjb2x1bW5zVG9WZXJpZnlcblx0XHRcdC5tYXAodiA9PlxuXHRcdFx0XHR0aGlzLl92ZXJpZnlDb2x1bW4odiwgT2JqZWN0LmFzc2lnbihPYmplY3QuY3JlYXRlKE9iamVjdC5nZXRQcm90b3R5cGVPZihyb290KSksIHJvb3QpKSk7XG5cblx0XHRyZXR1cm4gdmVyaWZpZWRDb2x1bW5zLmV2ZXJ5KHRoaXMuX2lzVmVyaWZpZWQpO1xuXHR9XG59XG5cbmNsYXNzIENvbHVtbiB7XG5cdGNvbnN0cnVjdG9yKHJldmVhbCwgbmFtZSwgaWR4KSB7XG5cdFx0dGhpcy5yZXZlYWwgPSByZXZlYWw7XG5cdFx0dGhpcy5uYW1lID0gbmFtZTtcblx0XHR0aGlzLmlkeCA9IGlkeDtcblx0XHR0aGlzLnZlcmlmaWVkID0gZmFsc2U7XG5cdFx0dGhpcy5jdXJyZW50UmVsTmFtZSA9IFwibm9uZVwiO1xuXHR9XG5cblx0dmVyaWZ5KCkge1xuXHRcdHRoaXMudmVyaWZpZWQgPSB0cnVlO1xuXHRcdHJldHVybiB0aGlzO1xuXHR9XG5cblx0dXBkYXRlUmVsTmFtZShub2RlKSB7XG5cdFx0dGhpcy5jdXJyZW50UmVsTmFtZSA9IG5vZGUub3V0UmVsLm5hbWU7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cdFZlcmlmeTogVmVyaWZ5XG59OyIsImNvbnN0IGNjID0gcmVxdWlyZSgnLi4vLi4vc3JjL2xhbmcuanMnKTtcbmNvbnN0IHV0aWxzID0gcmVxdWlyZSgnLi4vLi4vc3JjL3V0aWxzLmpzJyk7XG5jb25zdCB2ZXIgPSByZXF1aXJlKCcuLi8uLi9zcmMvdmVyLmpzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBjYzogY2MsXG4gIHV0aWxzOiB1dGlscyxcbiAgVmVyaWZpZXI6IHZlclxufTtcbiJdfQ==
