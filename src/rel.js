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