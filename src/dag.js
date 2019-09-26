class Node {

	constructor(outRel) {
		this.outRel = outRel;
		this.children = new Set();
		this.parents = new Set();
	}

	isLeaf() {
		return this.children.size === 0;
	}

	isRoot() {
		return this.parents.size === 0;
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

		let p;
		for (p in parents) {
			this.parents.add(p);
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
		this.parents.add(leftParent);
		this.parents.add(rightParent);
		this.leftJoinCols = leftJoinCols;
		this.rightJoinCols = rightJoinCols;
	}
}

class Dag {

	constructor(roots) {
		this.roots = roots;
	}
}

module.exports = {
	Node: Node,
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
