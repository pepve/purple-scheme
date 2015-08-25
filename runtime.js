var common = require('./common'),
	MVal = common.MVal,
	Err = common.Err,
	Table = common.Table,
	Op = common.Op,
	pluck = common.pluck;

module.exports = {
	Vm: Vm,
};

var builtinProcedures = {
	'binary-sum': function (a, b) {
		return new MVal('number', a.value + b.value);
	},
	'binary-subtract': function (a, b) {
		return new MVal('number', a.value - b.value);
	},
	'binary-multiply': function (a, b) {
		return new MVal('number', a.value * b.value);
	},
	'binary-divide': function (a, b) {
		return new MVal('number', a.value / b.value);
	},
	'>': function (a, b) {
		return new MVal('boolean', a.value > b.value);
	},
	'<': function (a, b) {
		return new MVal('boolean', a.value < b.value);
	},
	'>=': function (a, b) {
		return new MVal('boolean', a.value >= b.value);
	},
	'<=': function (a, b) {
		return new MVal('boolean', a.value <= b.value);
	},
	car: function (cons) {
		return cons.value[0];
	},
	cdr: function (cons) {
		return new MVal('list', cons.value.slice(1));
	},
	cons: function (head, tail) {
		return new MVal('list', [head].concat(tail.value));
	},
	'null?': function (cons) {
		return new MVal('boolean', !cons.value.length);
	},
	display: function (val) {
		console.log('' + val);
		return val;
	},
	'call-with-current-continuation': true,
	'apply': true
};

function Vm (init) {
	this.table = new Table();

	for (var symbol in builtinProcedures) {
		this.table.define(new MVal('symbol', symbol), new MVal('procedure',
			{ builtin: builtinProcedures[symbol], name: symbol }));
	}

	init(this);

	this.table = this.table.open();
	this.debug = false;
}

Vm.prototype.printState = function printState () {
	var t = (function printTable (table) {
		if (table) {
			var symbols = Object.keys(table.symbols);
			if (symbols.length > 4) {
				return printTable(table.parent) +
					'|' + symbols.length + '    ';
			} else {
				return printTable(table.parent) +
					'|' + Object.keys(table.symbols) + '    ';
			}
		} else {
			return '';
		}
	}(this.op.table));

	var s = (function printOp (op) {
		return op ? (printOp(op.next) + op + '\n;.      ') : '';
	}(this.op));

	console.log(';. TABL ' + t);
	console.log(';. RSLT ' + (this.result || ''));
	console.log(';. STCK ' + s);
};

Vm.prototype.eval = function eval (expression) {
	this.result = undefined;
	this.op = undefined;
	this.ops = new Op('expr', expression, this.table);

	while (this.ops) {
		this.op = this.ops;
		this.ops = this.ops.next;

		if (this.debug) {
			this.printState();
		}

		var opFunction = this['op' + this.op.act[0].toUpperCase() +
			this.op.act.substr(1)];

		if (typeof opFunction === 'function') {
			opFunction.call(this);
		} else {
			throw new Error('unknown op');
		}
	}

	return this.result;
};

Vm.prototype.opAnd = function opAnd () {
	if (this.result.value) {
		if (this.op.arg.length) {
			this.result = undefined;
			this.newOp('expr', this.op.arg.shift(), null, this.op);
		} else {
			this.result = new MVal('boolean', true);
		}
	}
};

Vm.prototype.opOr = function opOr () {
	if (!this.result.value) {
		if (this.op.arg.length) {
			this.result = undefined;
			this.newOp('expr', this.op.arg.shift(), null, this.op);
		} else {
			this.result = new MVal('boolean', false);
		}
	}
};

Vm.prototype.opPeek = function opPeek () {
	if (this.result.type === 'procedure') {
		this.newOp('call', { r: [], e: this.op.arg.value.slice(1) });

	} else if (this.result.type === 'syntax') {
		throw Err.aboutVal('notImplemented', this.result);

	} else {
		throw Err.aboutVal('notProcedureOrSyntax', this.result);
	}
};

Vm.prototype.opCall = function opCall () {
	var n = this.op.arg.e[0];

	this.op = new Op('call',
		{ r: this.result ?
				this.op.arg.r.concat([this.result]) :
				this.op.arg.r.slice(0),
		  e: this.op.arg.e.slice(1) },
		this.op.table,
		this.op.next);

	this.result = undefined;

	if (n) {
		this.newOp('expr', n, null, this.op);
	} else {
		var proc = this.op.arg.r.shift();

		if (proc.type !== 'procedure') {
			throw Err.aboutVal('notProcedure', proc);
		}

		if (proc.value.builtin === true &&
				proc.value.name === 'call-with-current-continuation') {
			// exceptionally built in
			this.result = new MVal('procedure', { cont: this.ops });
			this.newOp('call', { r: [this.op.arg.r[0]], e: [] });

		} else if (proc.value.builtin === true && proc.value.name === 'apply') {
			// exceptionally built in
			this.newOp('call',
				{ r: [this.op.arg.r[0]].concat(this.op.arg.r[1].value),
				  e: [] });

		} else if (proc.value.builtin) {
			// built in
			this.result = proc.value.builtin.apply(null, this.op.arg.r);

		} else if ('cont' in proc.value) {
			// an escape procedure
			this.ops = proc.value.cont;
			this.result = this.op.arg.r[0];

		} else {
			// user defined
			this.callUser(proc);
		}
	}
};

Vm.prototype.callUser = function callUser (proc) {
	var values = this.op.arg.r;
	var formals = proc.value.formals;
	var table = proc.value.closed.open();

	for (var i = 0; i < formals.length; i++) {
		if (formals[i].value === '.') {
			table.define(formals[i + 1], new MVal('list', values.slice(i)))
			break;
		} else {
			table.define(formals[i], values[i]);
		}
	}

	for (var i = proc.value.body.length - 1; i >= 0; i--) {
		this.newOp('expr', proc.value.body[i], table);
	}
};

Vm.prototype.opDef = function opDef () {
	this.op.table.define(this.op.arg, this.result);
	this.result = undefined;
};

Vm.prototype.opAss = function opAss () {
	this.op.table.assign(this.op.arg, this.result);
	this.result = undefined;
};

Vm.prototype.opIf = function opIf () {
	if (this.result.value) {
		this.newOp('expr', this.op.arg[0]);
	} else {
		this.newOp('expr', this.op.arg[1]);
	}
	this.result = undefined;
};

Vm.prototype.opExpr = function opExpr () {
	// Expression to be evaluated
	var expr = this.op.arg;

	if (expr.type === 'number' || expr.type === 'string' ||
			expr.type === 'boolean') {
		this.result = expr;

	} else if (expr.type === 'symbol') {
		var v = this.op.table.lookup(expr);

		if (v === undefined) {
			throw Err.aboutVal('undefinedSymbol', expr);
		} else {
			this.result = v;
		}

	} else if (expr.type === 'list') {
		// Procedure calls and special forms

		if (expr.value[0].type === 'symbol') {
			// Special case the special forms
			var specialFormFunction = this['special-form-' +
				expr.value[0].value];

			if (typeof specialFormFunction === 'function') {
				specialFormFunction.call(this, expr);
			} else {
				this.newOp('peek', expr);
				this.newOp('expr', expr.value[0]);
			}
		} else {
			this.newOp('peek', expr);
			this.newOp('expr', expr.value[0]);
		}

	} else if (expr.type === 'shebang') {
		if (expr.value === 'debug') {
			this.debug = true;
		} else if (expr.value === 'nodebug') {
			this.debug = false;
		} else {
			throw Err.aboutVal('unsupported', expr);
		}

	} else {
		throw new Error('unknown type');
	}
};

Vm.prototype['special-form-define'] = function (expr) {
	if (expr.value[1].type === 'symbol') {
		if (this.op.table.defined(expr.value[1])) {
			throw Err.aboutVal('alreadyDefined', expr.value[1]);
		} else {
			this.newOp('def', expr.value[1]);
			this.newOp('expr', expr.value[2]);
		}

	} else if (expr.value[1].type === 'list') {
		if (this.op.table.defined(expr.value[1].value[0])) {
			throw Err.aboutVal('alreadyDefined', expr.value[1].value[0]);
		} else {
			this.newOp('def', expr.value[1].value[0]);
			this.result = new MVal('procedure',
				{ closed: this.op.table,
				  formals: expr.value[1].value.slice(1),
				  body: expr.value.slice(2) },
				[expr.x, expr.y]);
		}

	} else {
		throw Err.aboutVal('undefinable', expr.value[1]);
	}
};

Vm.prototype['special-form-set!'] = function (expr) {
	if (expr.value[1].type === 'symbol') {
		if (this.op.table.lookup(expr.value[1]) === undefined) {
			throw Err.aboutVal('undefinedSymbol', expr.value[1]);
		} else {
			this.newOp('ass', expr.value[1]);
			this.newOp('expr', expr.value[2]);
		}

	} else {
		throw Err.aboutVal('undefinable', expr.value[1]);
	}
};

Vm.prototype['special-form-lambda'] = function (expr) {
	this.result = new MVal('procedure',
		{ closed: this.op.table,
		  formals: expr.value[1].value,
		  body: expr.value.slice(2) },
		[expr.x, expr.y]);
};

Vm.prototype['special-form-let'] = function (expr) {
	this.newOp('call',
		{ r: [],
		  e: pluck(pluck(expr.value[1].value, 'value'), 1) });
	this.newOp('expr', new MVal('list',
		[ new MVal('symbol', 'lambda'),
		  new MVal('list', pluck(pluck(expr.value[1].value, 'value'), 0))
		  ].concat(expr.value.slice(2))
		));
};

Vm.prototype['special-form-quote'] = function (expr) {
	this.result = new MVal(expr.value[1].type, expr.value[1].value,
		expr.begin, expr.end);
};

Vm.prototype['special-form-if'] = function (expr) {
	this.newOp('if', [expr.value[2], expr.value[3]]);
	this.newOp('expr', expr.value[1]);
};

Vm.prototype['special-form-and'] = function (expr) {
	if (expr.value.length > 1) {
		this.newOp('and', expr.value.slice(2));
		this.newOp('expr', expr.value[1]);
	} else {
		this.result = new MVal('boolean', true);
	}
};

Vm.prototype['special-form-or'] = function (expr) {
	if (expr.value.length > 1) {
		this.newOp('or', expr.value.slice(2));
		this.newOp('expr', expr.value[1]);
	} else {
		this.result = new MVal('boolean', true);
	}
};

Vm.prototype['special-form-syntax-rules'] = function (expr) {
	this.result = new MVal('syntax',
		{ literals: expr.value[1].value,
		  rules: expr.value.slice(2) });
};

Vm.prototype.newOp = function newOp (act, arg, table, next) {
	this.ops = new Op(act, arg, table || this.op.table, next || this.ops);
};
