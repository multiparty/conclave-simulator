class Relation{

	constructor(name, columns, storedWith) {
		this.name = name;
		this.columns = columns;
		this.storedWith = storedWith;
	}

	rename(newName) {
		this.name = newName;

		let col;
		for (col in this.columns) {
			col.relName = newName;
		}
	}

	isShared() {
		return this.storedWith.length > 1;
	}

	updateColumnIndexes() {
		for (let i = 0; i < this.columns.length; i++) {
			this.columns[i].idx = i;
		}
	}

	updateColumns() {
		this.updateColumnIndexes();

		let col;
		for (col in self.columns) {
			col.relName = this.name;
		}
	}

}

module.exports = {
	Relation: Relation
};