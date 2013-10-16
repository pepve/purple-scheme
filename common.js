module.exports = {
	MVal: MVal,
	Err: Err,
	Table: Table,
	Op: Op,
	pluck: pluck,
};

function MVal (type, value, begin, end, file) {
	this.type = type;
	this.value = value;

	if (begin) {
		this.begin = begin;
		this.x = begin[0];
		this.y = begin[1];
	} else {
		this.begin = [];
	}

	if (end) {
		this.end = end;
	} else if (begin) {
		this.end = [begin[0] + 1, begin[1]];
	} else {
		this.end = [];
	}

	this.file = file;
}

MVal.prototype.toString = function toString () {
	if (this.type === 'number') {
		return this.value + '';
	} else if (this.type === 'boolean') {
		return '#' + (this.value ? 't' : 'f');
	} else if (this.type === 'string') {
		return '"' + this.value + '"';
	} else if (this.type === 'symbol') {
		return this.value;
	} else if (this.type === 'nil') {
		return '<nil>';
	} else if (this.type === 'procedure') {
		if (this.value.builtin) {
			return '<builtin ' + this.value.name + '>';
		} else if ('cont' in this.value) {
			return '<escape>';
		} else if (this.value.name) {
			return '<procedure ' + this.value.name + '>';
		} else {
			return '<procedure>';
		}
	} else if (this.type === 'syntax') {
		if (this.value.builtin) {
			return '<builtin-syntax ' + this.value.name + '>';
		} else if (this.value.name) {
			return '<syntax ' + this.value.name + '>';
		} else {
			return '<syntax>';
		}
	} else if (this.type === 'list') {
		return '(' + this.value.join(' ') + ')';
	} else if (this.type === 'shebang') {
		return '';
	} else {
		throw new Error('unknown MVal type');
	}
};

function Err () {
	this.err = true;
}

Err.aboutText = function aboutText (code, begin, end) {
	var err = new Err();
	err.code = code;
	err.begin = begin;
	err.end = end;
	return err;
};

Err.aboutVal = function aboutVal (code, val) {
	var err = new Err();
	err.code = code;
	err.val = val;
	return err;
};

Err.prototype.msg = function msg () {
	return {
		badNumber: 'Bad number',
		undefinedSymbol: 'Undefined symbol',
		unclosedString: 'Unclosed string',
		unclosedList: 'Unclosed list',
		unexpectedClosingBracket: 'Unexpected closing bracket',
		unsupported: 'Unsupported feature',
		notProcedure: 'Not a procedure',
		alreadyDefined: 'Symbol is already defined',
		undefinable: 'That can not be defined',
		notImplemented: 'Not implemented here',
	}[this.code];
};

Err.prototype.print = function print (lines) {
	var text;

	if (this.val && this.val.begin.length) {
		text = lines[this.val.begin[1]];
		return ';! ' +
			text.substring(0, this.val.begin[0]) + '\033[7m' +
			text.substring(this.val.begin[0], this.val.end[0]) + '\033[m' +
			text.substring(this.val.end[0]) + '\n;! ' + this.msg();

	} else if (this.val) {
		return ';! ' + this.val + '\n;! ' + this.msg();

	} else if (this.end) {
		text = lines[this.begin[1]];
		return ';! ' +
			text.substring(0, this.begin[0]) + '\033[7m' +
			text.substring(this.begin[0], this.end[0]) + '\033[m' +
			text.substring(this.end[0]) + '\n;! ' + this.msg();

	} else if (this.begin) {
		text = lines[this.begin[1]];
		return ';! ' +
			text.substring(0, this.begin[0]) + '\033[7m' +
			text.substring(this.begin[0]) + '\033[m\n;! ' + this.msg();

	} else {
		throw new Error('corrupt Err instance');
	}
};

function Table (symbols, parent) {
	this.symbols = symbols;
	this.parent = parent;
}

Table.prototype.lookup = function lookup (symbol) {
	if (this.symbols[symbol] !== undefined) {
		return this.symbols[symbol];
	} else if (this.parent) {
		return this.parent.lookup(symbol);
	} else {
		return undefined;
	}
};

Table.prototype.defined = function lookup (symbol) {
	return this.symbols[symbol] !== undefined;
};

function Op (act, arg, table, next) {
	this.act = act;
	this.arg = arg;
	this.table = table;
	this.next = next;
}

Op.prototype.toString = function toString () {
	if (this.act === 'expr') {
		return '' + this.arg;
	} else if (this.act === 'def') {
		return 'def ' + this.arg;
	} else if (this.act === 'ass') {
		return 'ass ' + this.arg;
	} else if (this.act === 'call') {
		return 'call ' +
			this.arg.r.concat(['...']).concat(this.arg.e).join(' ');
	} else if (this.act === 'peek') {
		return 'peek ' + this.arg;
	} else if (this.act === 'and') {
		return 'and ' + this.arg.join(' ');
	} else if (this.act === 'or') {
		return 'or ' + this.arg.join(' ');
	} else if (this.act === 'if') {
		return 'if ... then ' + this.arg[0] + ' else ' + this.arg[1];
	} else {
		throw new Error('Unknown op');
	}
};

function pluck (array, name) {
	return array.map(function (item) {
		return item[name];
	});
}
