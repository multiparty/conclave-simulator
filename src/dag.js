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