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