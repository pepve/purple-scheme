'use strict'

const { MVal, Err } = require('./common')

class Parser {
  constructor (text, x = 0, y = 0) {
    this.text = text
    this.x = x
    this.y = y
  }

  parse () {
    this.whitespace()

    const lexemes = []
    while (this.x < this.text.length) {
      lexemes.push(this.lexeme())
      this.whitespace()
    }

    return lexemes
  }

  // somestring -> new MVal(symbol, somestring)
  // 123 -> new MVal(number, 1234)
  // () -> new MVal(list, [])
  // (+ 1 2) -> new MVal(list, [new MVal(symbol, +), new MVal(number, 1),
  //                            new MVal(number, 2)])
  lexeme () {
    if (this.x >= this.text.length) {
      throw new Error('no lexeme')
    } else if (this.text[this.x] >= '0' && this.text[this.x] <= '9') {
      return this.number()
    } else if (this.text[this.x] === '"') {
      return this.string()
    } else if (this.text[this.x] === '\'') {
      return this.quote()
    } else if (this.text[this.x] === '#') {
      return this.hash()
    } else if (this.text[this.x] === '(') {
      return this.list()
    } else if (this.text[this.x] === ')') {
      throw Err.aboutText('unexpectedClosingBracket', [this.x, this.y], [this.x + 1, this.y])
    } else {
      return this.symbol()
    }
  }

  number () {
    const start = this.x
    this.untilSeparator()
    const num = this.text.substring(start, this.x)

    if (isFinite(num)) {
      return new MVal('number', parseInt(num, 10), [start, this.y], [this.x, this.y])
    } else {
      throw Err.aboutText('badNumber', [start, this.y], [this.x, this.y])
    }
  }

  string () {
    this.x++
    const start = this.x

    while (this.x < this.text.length && this.text[this.x] !== '"') {
      this.x++
    }

    if (this.text[this.x] === '"') {
      const str = this.text.substring(start, this.x)
      this.x++
      return new MVal('string', str, [start - 1, this.y], [this.x, this.y])
    } else {
      throw Err.aboutText('unclosedString', [start - 1, this.y], [this.x, this.y])
    }
  }

  list () {
    const start = [this.x, this.y]
    const list = []
    this.x++

    while (this.x < this.text.length && this.text[this.x] !== ')') {
      list.push(this.lexeme())
      this.whitespace()
    }

    if (this.text[this.x] === ')') {
      this.x++
      return new MVal('list', list, start, [this.x, this.y])
    } else {
      throw Err.aboutText('unclosedList', start, [this.x, this.y])
    }
  }

  quote () {
    const start = [this.x, this.y]
    const list = []

    list.push(new MVal('symbol', 'quote', [this.x, this.y]))
    this.x++

    list.push(this.lexeme())

    return new MVal('list', list, start, [this.x, this.y])
  }

  hash () {
    this.x++
    const start = this.x
    this.untilSeparator()
    const thing = this.text.substring(start, this.x)

    if (thing === 't' || thing === 'T') {
      return new MVal('boolean', true, [start, this.y], [this.x, this.y])
    } else if (thing === 'f' || thing === 'F') {
      return new MVal('boolean', false, [start, this.y], [this.x, this.y])
    } else if (thing[0] === '!') {
      return new MVal('shebang', thing.substring(1), [start, this.y], [this.x, this.y])
    } else {
      throw Err.aboutText('unsupported', [start - 1, this.y], [this.x, this.y])
    }
  }

  symbol () {
    const start = this.x
    this.untilSeparator()
    return new MVal('symbol', this.text.substring(start, this.x), [start, this.y], [this.x, this.y])
  }

  untilSeparator () {
    while (this.x < this.text.length && !this.isWhitespace() && this.text[this.x] !== ')') {
      this.x++
    }
  }

  whitespace () {
    while (this.x < this.text.length && this.isWhitespace()) {
      this.x++
    }

    while (this.x < this.text.length && this.text[this.x] === ';') {
      this.x++

      while (this.x < this.text.length && this.text[this.x] !== '\r' && this.text[this.x] !== '\n') {
        this.x++
      }

      while (this.x < this.text.length && this.isWhitespace()) {
        this.x++
      }
    }
  }

  isWhitespace () {
    return this.text[this.x] === ' ' || this.text[this.x] === '\r' || this.text[this.x] === '\n' || this.text[this.x] === '\f'
  }
}

module.exports = { Parser }
