var common = require('./common'),
	MVal = common.MVal,
	Err = common.Err;

module.exports = {
	Parser: Parser,
};

function Parser (text, x, y) {
	this.text = text;
	this.x = x || 0;
	this.y = y || 0;
}

// somestring -> new MVal(symbol, somestring)
// 123 -> new MVal(number, 1234)
// () -> new MVal(list, [])
// (+ 1 2) -> new MVal(list, [new MVal(symbol, +), new MVal(number, 1),
//                            new MVal(number, 2)])
Parser.prototype.parse = function parse () {
	if (this.x >= this.text.length) {
		throw new Error('nothing to parse');

	} else if (this.text[this.x] >= '0' && this.text[this.x] <= '9') {
		return this.number();

	} else if (this.text[this.x] === '"') {
		return this.string();

	} else if (this.text[this.x] === '\'') {
		return this.quote();

	} else if (this.text[this.x] === '#') {
		return this.hash();

	} else if (this.text[this.x] === '(') {
		return this.list();

	} else {
		return this.symbol();
	}
};

Parser.prototype.number = function number () {
	var start = this.x;
	while (this.x < this.text.length &&
			this.text[this.x] !== ' ' &&
			this.text[this.x] !== ')') {
		this.x++;
	}
	var num = this.text.substring(start, this.x);
	if (isFinite(num)) {
		return new MVal('number', parseInt(num, 10), [start, this.y],
			[this.x, this.y]);
	} else {
		throw Err.aboutText('badNumber', [start, this.y], [this.x, this.y]);
	}
};

Parser.prototype.string = function string () {
	this.x++;
	var start = this.x;
	while (this.x < this.text.length && this.text[this.x] !== '"') {
		this.x++;
	}
	if (this.text[this.x] === '"') {
		var str = this.text.substring(start, this.x);
		this.x++;
		return new MVal('string', str, [start - 1, this.y], [this.x, this.y]);
	} else {
		throw Err.aboutText('unclosedString', [start - 1, this.y],
			[this.x, this.y]);
	}
};

Parser.prototype.list = function list () {
	var start = [this.x, this.y];
	var list = [];
	this.x++;
	while (this.x < this.text.length && this.text[this.x] !== ')') {
		list.push(this.parse());
		while (this.x < this.text.length && this.text[this.x] === ' ') {
			this.x++;
		}
	}
	if (this.text[this.x] === ')') {
		this.x++;
		return new MVal('list', list, start, [this.x, this.y]);
	} else {
		throw Err.aboutText('unclosedList', start, [this.x, this.y]);
	}
};

Parser.prototype.quote = function quote () {
	var start = [this.x, this.y];
	var list = [];
	list.push(new MVal('symbol', 'quote', [this.x, this.y]));
	this.x++;
	list.push(this.parse());
	return new MVal('list', list, start, [this.x, this.y]);
};

Parser.prototype.hash = function hash () {
	this.x++;
	var start = this.x;
	while (this.x < this.text.length &&
			this.text[this.x] !== ' ' &&
			this.text[this.x] !== ')') {
		this.x++;
	}

	var thing = this.text.substring(start, this.x);

	if (thing === 't' || thing === 'T') {
		return new MVal('boolean', true, [start, this.y], [this.x, this.y]);

	} else if (thing === 'f' || thing === 'F') {
		return new MVal('boolean', false, [start, this.y], [this.x, this.y]);

	} else {
		throw Err.aboutText('unsupported', [start - 1, this.y],
			[this.x, this.y]);
	}
};

Parser.prototype.symbol = function symbol () {
	var start = this.x;
	while (this.x < this.text.length &&
			this.text[this.x] !== ' ' &&
			this.text[this.x] !== ')') {
		this.x++;
	}
	return new MVal('symbol', this.text.substring(start, this.x),
		[start, this.y], [this.x, this.y]);
};
