'use strict'

class MVal {
  constructor (type, value, begin, end, file) {
    this.type = type
    this.value = value

    if (begin) {
      this.begin = begin
    } else {
      this.begin = []
    }

    if (end) {
      this.end = end
    } else if (begin) {
      this.end = [begin[0] + 1, begin[1]]
    } else {
      this.end = []
    }

    this.file = file
  }

  toString () {
    if (this.type === 'number') {
      return '' + this.value
    } else if (this.type === 'boolean') {
      return `#${this.value ? 't' : 'f'}`
    } else if (this.type === 'string') {
      return `"${this.value}"`
    } else if (this.type === 'symbol') {
      return this.value
    } else if (this.type === 'nil') {
      return '<nil>'
    } else if (this.type === 'procedure') {
      if (this.value.builtin) {
        return `<builtin ${this.value.name}>`
      } else if ('cont' in this.value) {
        return '<escape>'
      } else if (this.value.name) {
        return `<procedure ${this.value.name}>`
      } else {
        return '<procedure>'
      }
    } else if (this.type === 'syntax') {
      if (this.value.builtin) {
        return `<builtin-syntax ${this.value.name}>`
      } else if (this.value.name) {
        return `<syntax ${this.value.name}>`
      } else {
        return '<syntax>'
      }
    } else if (this.type === 'list') {
      return `(${this.value.join(' ')})`
    } else if (this.type === 'shebang') {
      return ''
    } else {
      throw new Error('unknown MVal type')
    }
  }
}

class Err {
  constructor () {
    this.err = true
  }

  static aboutText (code, begin, end) {
    const err = new Err()
    err.code = code
    err.begin = begin
    err.end = end
    return err
  }

  static aboutVal (code, val) {
    const err = new Err()
    err.code = code
    err.val = val
    return err
  }

  msg () {
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
      notImplemented: 'Not implemented here'
    }[this.code]
  }

  print (lines) {
    if (this.val && this.val.begin.length) {
      const text = lines[this.val.begin[1]]

      const before = text.substring(0, this.val.begin[0])
      const highlight = text.substring(this.val.begin[0], this.val.end[0])
      const after = text.substring(this.val.end[0])

      return `;! ${before}\x1b[7m${highlight}\x1b[m${after}\n;! ${this.msg()}`
    } else if (this.val) {
      return `;! ${this.val}\n;! ${this.msg()}`
    } else if (this.end) {
      const text = lines[this.begin[1]]

      const before = text.substring(0, this.begin[0])
      const highlight = text.substring(this.begin[0], this.end[0])
      const after = text.substring(this.end[0])

      return `;! ${before}\x1b[7m${highlight}\x1b[m${after}\n;! ${this.msg()}`
    } else if (this.begin) {
      const text = lines[this.begin[1]]

      const before = text.substring(0, this.begin[0])
      const highlight = text.substring(this.begin[0])

      return `;! ${before}\x1b[7m${highlight}\x1b[m\n;! ${this.msg()}`
    } else {
      throw new Error('corrupt Err instance')
    }
  }
}

class Table {
  constructor () {
    this.symbols = new Map()
  }

  lookup (symbol) {
    if (this.symbols.has(symbol.value)) {
      return this.symbols.get(symbol.value)
    } else if (this.parent) {
      return this.parent.lookup(symbol)
    } else {
      return undefined
    }
  }

  defined (symbol) {
    return this.symbols.has(symbol.value)
  }

  define (symbol, val) {
    this.symbols.set(symbol.value, val)
  }

  assign (symbol, val) {
    if (this.symbols.has(symbol.value)) {
      this.symbols.set(symbol.value, val)
    } else if (this.parent) {
      this.parent.assign(symbol, val)
    }
  }

  open () {
    const table = new Table()
    table.parent = this
    return table
  }
}

class Op {
  constructor (act, arg, table, next) {
    this.act = act
    this.arg = arg
    this.table = table
    this.next = next
  }

  toString () {
    if (this.act === 'expr') {
      return '' + this.arg
    } else if (this.act === 'def') {
      return `def ${this.arg}`
    } else if (this.act === 'ass') {
      return `ass ${this.arg}`
    } else if (this.act === 'call') {
      return `call ${[...this.arg.r, '...', ...this.arg.e].join(' ')}`
    } else if (this.act === 'peek') {
      return `peek ${this.arg}`
    } else if (this.act === 'and') {
      return `and ${this.arg.join(' ')}`
    } else if (this.act === 'or') {
      return `or ${this.arg.join(' ')}`
    } else if (this.act === 'if') {
      return `if ... then ${this.arg[0]} else ${this.arg[1]}`
    } else {
      throw new Error('Unknown op')
    }
  }
}

module.exports = { MVal, Err, Table, Op }
