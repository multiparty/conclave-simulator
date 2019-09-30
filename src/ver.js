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
			let newCol = node.outRel.columns.slice(-1);
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
			this._handleAggregate(column, node);
		} else if (node instanceof dag.Concat) {
			this._handleConcat(column, node);
		} else {
			this._continueTraversal(column, node);
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

		let isVerified = verifiedColumns.every(this._isVerified);

		console.log(isVerified)
	}
}

class Column {
	constructor(reveal, name, idx) {
		this.reveal = reveal;
		this.name = name;
		this.idx = idx;
		this.verified = false;
		this.currentRelName = null;
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