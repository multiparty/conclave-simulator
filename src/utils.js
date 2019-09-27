
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