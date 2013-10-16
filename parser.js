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

Parser.prototype.parse = function parse () {
	this.whitespace();
	var lexemes = [];
	while (this.x < this.text.length) {
		lexemes.push(this.lexeme());
		this.whitespace();
	}
	return lexemes;
};

// somestring -> new MVal(symbol, somestring)
// 123 -> new MVal(number, 1234)
// () -> new MVal(list, [])
// (+ 1 2) -> new MVal(list, [new MVal(symbol, +), new MVal(number, 1),
//                            new MVal(number, 2)])
Parser.prototype.lexeme = function lexeme () {
	if (this.x >= this.text.length) {
		throw new Error('no lexeme');

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

	} else if (this.text[this.x] === ')') {
		throw Err.aboutText('unexpectedClosingBracket', [this.x, this.y],
			[this.x + 1, this.y]);

	} else {
		return this.symbol();
	}
};

Parser.prototype.number = function number () {
	var start = this.x;
	this.untilSeparator();
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
		list.push(this.lexeme());
		this.whitespace();
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
	list.push(this.lexeme());
	return new MVal('list', list, start, [this.x, this.y]);
};

Parser.prototype.hash = function hash () {
	this.x++;
	var start = this.x;
	this.untilSeparator();
	var thing = this.text.substring(start, this.x);

	if (thing === 't' || thing === 'T') {
		return new MVal('boolean', true, [start, this.y], [this.x, this.y]);

	} else if (thing === 'f' || thing === 'F') {
		return new MVal('boolean', false, [start, this.y], [this.x, this.y]);

	} else if (thing[0] === '!') {
		return new MVal('shebang', thing.substring(1), [start, this.y],
			[this.x, this.y]);

	} else {
		throw Err.aboutText('unsupported', [start - 1, this.y],
			[this.x, this.y]);
	}
};

Parser.prototype.symbol = function symbol () {
	var start = this.x;
	this.untilSeparator();
	return new MVal('symbol', this.text.substring(start, this.x),
		[start, this.y], [this.x, this.y]);
};

Parser.prototype.untilSeparator = function untilSeparator () {
	while (this.x < this.text.length &&
			!this.isWhitespace() &&
			this.text[this.x] !== ')') {
		this.x++;
	}
};

Parser.prototype.whitespace = function whitespace () {
	while (this.x < this.text.length && this.isWhitespace()) {
		this.x++;
	}
	if (this.text[this.x] === ';') {
		this.x++;
		while (this.x < this.text.length && this.text[this.x] !== '\r' &&
				this.text[this.x] !== '\n') {
			this.x++;
		}
		while (this.x < this.text.length && this.isWhitespace()) {
			this.x++;
		}
	}
};

Parser.prototype.isWhitespace = function isWhitespace () {
	return this.text[this.x] === ' ' ||
			this.text[this.x] === '\r' ||
			this.text[this.x] === '\n' ||
			this.text[this.x] === '\f';
};
