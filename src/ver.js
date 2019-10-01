const dag = require('./dag.js');

class Verify {

	constructor(protocol, policy) {
		this.protocol = new dag.Dag(protocol);
		this.policy = policy;
	}

	_findRoot() {

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

		column.name = node.outRel.columns[column.idx].name;

		return this._continueTraversal(column, node);
	}

	_handleProject(column, node) {

		for (let i = 0; i < node.outRel.columns.length; i++) {
			if (node.outRel.columns[i].name === column.name) {
				column.idx = node.outRel.columns[i].idx;
				return this._continueTraversal(column,node);
			}
		}

		// node isn't present in the output, so can be verified.
		return column.verify();
	}

	_rewriteColumnForLeft(column, node) {

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