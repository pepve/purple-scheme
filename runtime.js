'use strict'

const { MVal, Err, Table, Op } = require('./common')

const builtinProcedures = [
  ['binary-sum', (a, b) => new MVal('number', a.value + b.value)],
  ['binary-subtract', (a, b) => new MVal('number', a.value - b.value)],
  ['binary-multiply', (a, b) => new MVal('number', a.value * b.value)],
  ['binary-divide', (a, b) => new MVal('number', a.value / b.value)],
  ['>', (a, b) => new MVal('boolean', a.value > b.value)],
  ['<', (a, b) => new MVal('boolean', a.value < b.value)],
  ['>=', (a, b) => new MVal('boolean', a.value >= b.value)],
  ['<=', (a, b) => new MVal('boolean', a.value <= b.value)],
  ['car', cons => cons.value[0]],
  ['cdr', cons => new MVal('list', cons.value.slice(1))],
  ['null?', cons => new MVal('boolean', !cons.value.length)],
  ['display', val => { console.log('' + val); val }],
  ['call-with-current-continuation', true],
  ['apply', true]
]

class Vm {
  constructor (base) {
    this.table = new Table()

    for (const [name, builtin] of builtinProcedures) {
      this.table.define(new MVal('symbol', name), new MVal('procedure', { name, builtin }))
    }

    base.forEach(expression => this.evaluate(expression))

    this.table = this.table.open()
    this.debug = false
  }

  printState () {
    const t = (function printTable (table) {
      if (table) {
        if (table.symbols.size > 4) {
          return printTable(table.parent) + '|' + table.symbols.size + '    '
        } else {
          return printTable(table.parent) + '|' + [...table.symbols.keys()] + '    '
        }
      } else {
        return ''
      }
    }(this.op.table))

    const s = (function printOp (op) {
      return op ? (printOp(op.next) + op + '\n;.      ') : ''
    }(this.op))

    console.log(';. TABL ' + t)
    console.log(';. RSLT ' + (this.result || ''))
    console.log(';. STCK ' + s)
  }

  evaluate (expression) {
    this.result = undefined
    this.op = undefined
    this.ops = new Op('expr', expression, this.table)

    while (this.ops) {
      this.op = this.ops
      this.ops = this.ops.next

      if (this.debug) {
        this.printState()
      }

      const opFunction = this['op' + this.op.act[0].toUpperCase() + this.op.act.substr(1)]

      if (typeof opFunction === 'function') {
        opFunction.call(this)
      } else {
        throw new Error('unknown op')
      }
    }

    return this.result
  }

  opAnd () {
    if (this.result.value) {
      if (this.op.arg.length) {
        this.result = undefined
        this.newOp('expr', this.op.arg.shift(), undefined, this.op)
      } else {
        this.result = new MVal('boolean', true)
      }
    }
  }

  opOr () {
    if (!this.result.value) {
      if (this.op.arg.length) {
        this.result = undefined
        this.newOp('expr', this.op.arg.shift(), undefined, this.op)
      } else {
        this.result = new MVal('boolean', false)
      }
    }
  }

  opPeek () {
    if (this.result.type === 'procedure') {
      this.newOp('call', { r: [], e: this.op.arg.value.slice(1) })
    } else if (this.result.type === 'syntax') {
      throw Err.aboutVal('notImplemented', this.result)
    } else {
      throw Err.aboutVal('notProcedureOrSyntax', this.result)
    }
  }

  opCall () {
    const [n, ...e] = this.op.arg.e
    const r = this.result ? [...this.op.arg.r, this.result] : this.op.arg.r.slice(0)
    this.op = new Op('call', { r, e }, this.op.table, this.op.next)
    this.result = undefined

    if (n) {
      this.newOp('expr', n, undefined, this.op)
    } else {
      const proc = this.op.arg.r.shift()

      if (proc.type !== 'procedure') {
        throw Err.aboutVal('notProcedure', proc)
      }

      if (proc.value.builtin === true && proc.value.name === 'call-with-current-continuation') {
        // exceptionally built in
        this.result = new MVal('procedure', { cont: this.ops })
        this.newOp('call', { r: [this.op.arg.r[0]], e: [] })
      } else if (proc.value.builtin === true && proc.value.name === 'apply') {
        // exceptionally built in
        this.newOp('call', { r: [this.op.arg.r[0], ...this.op.arg.r[1].value], e: [] })
      } else if (proc.value.builtin) {
        // built in
        this.result = proc.value.builtin(...this.op.arg.r)
      } else if ('cont' in proc.value) {
        // an escape procedure
        this.ops = proc.value.cont
        this.result = this.op.arg.r[0]
      } else {
        // user defined
        this.callUser(proc)
      }
    }
  }

  callUser (proc) {
    const values = this.op.arg.r
    const formals = proc.value.formals
    const table = proc.value.closed.open()

    for (let i = 0; i < formals.length; i++) {
      if (formals[i].value === '.') {
        table.define(formals[i + 1], new MVal('list', values.slice(i)))
        break
      } else {
        table.define(formals[i], values[i])
      }
    }

    for (let i = proc.value.body.length - 1; i >= 0; i--) {
      this.newOp('expr', proc.value.body[i], table)
    }
  }

  opDef () {
    this.op.table.define(this.op.arg, this.result)
    this.result = undefined
  }

  opAss () {
    this.op.table.assign(this.op.arg, this.result)
    this.result = undefined
  }

  opIf () {
    if (this.result.value) {
      this.newOp('expr', this.op.arg[0])
    } else {
      this.newOp('expr', this.op.arg[1])
    }
    this.result = undefined
  }

  opExpr () {
    // Expression to be evaluated
    const expr = this.op.arg

    if (expr.type === 'number' || expr.type === 'string' || expr.type === 'boolean') {
      this.result = expr
    } else if (expr.type === 'symbol') {
      const v = this.op.table.lookup(expr)

      if (v === undefined) {
        throw Err.aboutVal('undefinedSymbol', expr)
      } else {
        this.result = v
      }
    } else if (expr.type === 'list') {
      // Procedure calls and special forms

      if (expr.value[0].type === 'symbol') {
        // Special case the special forms
        const specialFormFunction = this['special-form-' + expr.value[0].value]

        if (typeof specialFormFunction === 'function') {
          specialFormFunction.call(this, expr)
        } else {
          this.newOp('peek', expr)
          this.newOp('expr', expr.value[0])
        }
      } else {
        this.newOp('peek', expr)
        this.newOp('expr', expr.value[0])
      }
    } else if (expr.type === 'shebang') {
      if (expr.value === 'debug') {
        this.debug = true
      } else if (expr.value === 'nodebug') {
        this.debug = false
      } else {
        throw Err.aboutVal('unsupported', expr)
      }
    } else {
      throw new Error('unknown type')
    }
  }

  ['special-form-define'] (expr) {
    if (expr.value[1].type === 'symbol') {
      if (this.op.table.defined(expr.value[1])) {
        throw Err.aboutVal('alreadyDefined', expr.value[1])
      } else {
        this.newOp('def', expr.value[1])
        this.newOp('expr', expr.value[2])
      }
    } else if (expr.value[1].type === 'list') {
      if (this.op.table.defined(expr.value[1].value[0])) {
        throw Err.aboutVal('alreadyDefined', expr.value[1].value[0])
      } else {
        this.newOp('def', expr.value[1].value[0])
        const closed = this.op.table
        const formals = expr.value[1].value.slice(1)
        const body = expr.value.slice(2)
        this.result = new MVal('procedure', { closed, formals, body }, expr.begin)
      }
    } else {
      throw Err.aboutVal('undefinable', expr.value[1])
    }
  }

  ['special-form-set!'] (expr) {
    if (expr.value[1].type === 'symbol') {
      if (this.op.table.lookup(expr.value[1]) === undefined) {
        throw Err.aboutVal('undefinedSymbol', expr.value[1])
      } else {
        this.newOp('ass', expr.value[1])
        this.newOp('expr', expr.value[2])
      }
    } else {
      throw Err.aboutVal('undefinable', expr.value[1])
    }
  }

  ['special-form-lambda'] (expr) {
    const closed = this.op.table
    const formals = expr.value[1].value
    const body = expr.value.slice(2)
    this.result = new MVal('procedure', { closed, formals, body }, expr.begin)
  }

  ['special-form-let'] (expr) {
    this.newOp('call', { r: [], e: expr.value[1].value.map(a => a.value).map(v => v[1]) })
    this.newOp('expr', new MVal('list', [
      new MVal('symbol', 'lambda'),
      new MVal('list', expr.value[1].value.map(a => a.value).map(v => v[0])),
      ...expr.value.slice(2)]))
  }

  ['special-form-quote'] (expr) {
    this.result = new MVal(expr.value[1].type, expr.value[1].value, expr.begin, expr.end)
  }

  ['special-form-if'] (expr) {
    this.newOp('if', [expr.value[2], expr.value[3]])
    this.newOp('expr', expr.value[1])
  }

  ['special-form-and'] (expr) {
    if (expr.value.length > 1) {
      this.newOp('and', expr.value.slice(2))
      this.newOp('expr', expr.value[1])
    } else {
      this.result = new MVal('boolean', true)
    }
  }

  ['special-form-or'] (expr) {
    if (expr.value.length > 1) {
      this.newOp('or', expr.value.slice(2))
      this.newOp('expr', expr.value[1])
    } else {
      this.result = new MVal('boolean', true)
    }
  }

  ['special-form-syntax-rules'] (expr) {
    this.result = new MVal('syntax', { literals: expr.value[1].value, rules: expr.value.slice(2) })
  }

  newOp (act, arg, table = this.op.table, next = this.ops) {
    this.ops = new Op(act, arg, table, next)
  }
}

module.exports = { Vm }
