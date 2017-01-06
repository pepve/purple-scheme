'use strict'

const { Parser } = require('./parser')
const { Vm } = require('./runtime')

const base = (new Parser(require('fs').readFileSync('base.scm', 'utf8'))).parse()

const tests = [
  { text: '1234', val: { type: 'number', value: 1234 } },
  { text: '1234a', err: 'badNumber' },
  { text: 'a1234', err: 'undefinedSymbol' },
  { text: '(display "Hello world)', err: 'unclosedString' },
  { text: '(display', err: 'unclosedList' },
  { text: '(+ 4 5)', val: { type: 'number', value: 9 } },
  { text: '(- 5)', val: { type: 'number', value: -5 } },
  { text: '(- 5 2)', val: { type: 'number', value: 3 } },
  { text: '(/ 4)', val: { type: 'number', value: 0.25 } },
  { text: '(/ 4 2)', val: { type: 'number', value: 2 } },
  { text: '(+)', val: { type: 'number', value: 0 } },
  { text: '(-)', val: { type: 'number', value: 0 } },
  { text: '(*)', val: { type: 'number', value: 1 } },
  { text: '(* 2)', val: { type: 'number', value: 2 } },
  { text: '(* 2 3)', val: { type: 'number', value: 6 } },
  { text: '(define y 2)' },
  { text: 'y', val: { type: 'number', value: 2 } },
  { text: '(let ((x 5) (y 34)) z)', err: 'undefinedSymbol' },
  { text: 'y', val: { type: 'number', value: 2 } },
  { text: 'x', err: 'undefinedSymbol' },
  { text: '(+ (+ 2 3) 4)', val: { type: 'number', value: 9 } },
  { text: '(+ (+ 2 3) 4 (+ 5 6))', val: { type: 'number', value: 20 } },
  { text: '(+ (+ 2 3) 4 (+ 5 (+ 3 3)))', val: { type: 'number', value: 20 } },
  { text: '(+ (- 2 3) 4)', val: { type: 'number', value: 3 } },
  { text: '(if (- 5 5) 16 17)', val: { type: 'number', value: 17 } },
  { text: '(+ 1 (if (- 5 5) 16 17))', val: { type: 'number', value: 18 } },
  { text: '((lambda (x) (+ x 1)) 6)', val: { type: 'number', value: 7 } },
  { text: '(define f (lambda (x) (- 0 x)))' },
  { text: '(f 5)', val: { type: 'number', value: -5 } },
  { text: '(define g (lambda (x) (lambda (y) (+ x y))))' },
  { text: '((g 12) 13)', val: { type: 'number', value: 25 } },
  { text: '(define (h x) (- x))' },
  { text: '(h 13)', val: { type: 'number', value: -13 } },
  { text: 'y', val: { type: 'number', value: 2 } },
  { text: '(define y 2)', err: 'alreadyDefined' },
  { text: '(set! y 3)' },
  { text: 'y', val: { type: 'number', value: 3 } },
  { text: '(1 2 3)', err: 'notProcedureOrSyntax' },
  { text: '(define 123 456)', err: 'undefinable' },
  { text: '(let ((x 14)) x)', val: { type: 'number', value: 14 } },
  { text: '(let ((x 14)) 42 x)', val: { type: 'number', value: 14 } },
  { text: '(let ((x (+ 10 4)) (y (- 5 6))) (* x y))', val: { type: 'number', value: -14 } },
  { text: '""', val: { type: 'string', value: '' } },
  { text: '"test"', val: { type: 'string', value: 'test' } },
  { text: '(quote "test")', val: { type: 'string', value: 'test' } },
  { text: '(quote abc123)', val: { type: 'symbol', value: 'abc123' } },
  { text: '\'abc123', val: { type: 'symbol', value: 'abc123' } },
  { text: '(car (quote (1 2 3)))', val: { type: 'number', value: 1 } },
  { text: '(cdr \'(1 2 3))', vals: [{ type: 'number', value: 2 }, { type: 'number', value: 3 }] },
  { text: '(define fac (lambda (x) (if x (* x (fac (- x 1))) 1)))' },
  { text: '(fac 5)', val: { type: 'number', value: 120 } },
  { text: '(define tr (lambda (n) (if n (tr (- n 1)) "done")))' },
  { text: '(tr 10000)', val: { type: 'string', value: 'done' } },
  { text: '(define tr1 (lambda (n) (if n (tr2 (- n 1)) "done")))' },
  { text: '(define tr2 (lambda (n) (if n (tr1 (- n 1)) "done")))' },
  { text: '(tr1 100)', val: { type: 'string', value: 'done' } },
  { text: '(call/cc (lambda (cont) (cont 42)))', val: { type: 'number', value: 42 } },
  { text: '(call/cc (lambda (cont) foo))', err: 'undefinedSymbol' },
  { text: 'foo', err: 'undefinedSymbol' },
  { text: '(call/cc (lambda (cont) (* 21 2)))', val: { type: 'number', value: 42 } },
  { text: '(call/cc (lambda (cont) (* 2 (cont 21))))', val: { type: 'number', value: 21 } },
  { text: '(let ((x 23)) (set! x 42) x)', val: { type: 'number', value: 42 } },
  { text: '(+ (let () 1 2) 3)', val: { type: 'number', value: 5 } },
  { text: '(let ((x 5)) (let () (set! x 7)) x)', val: { type: 'number', value: 7 } },
  { text: '#t', val: { type: 'boolean', value: true } },
  { text: '(> 5 6)', val: { type: 'boolean', value: false } },
  { text: '(and (or))', val: { type: 'boolean', value: true } },
  { text: '(or (>= 42 42) not-reached)', val: { type: 'boolean', value: true } },
  { text: '(or #f 42 not-reached)', val: { type: 'number', value: 42 } },
  { text: '(and #f not-reached)', val: { type: 'boolean', value: false } },
  { text: '(and #f ((lambda () #f)) #f)', val: { type: 'boolean', value: false } },
  { text: '(define (fac2 x a) (if (<= x 1) a (fac2 (- x 1) (* x a))))' },
  { text: '(fac2 5 1)', val: { type: 'number', value: 120 } },
  { text: '(define *3 #f)' },
  { text: '(* 3 (call/cc (lambda (escape) (set! *3 escape) (escape 2))))', val: { type: 'number', value: 6 } },
  { text: '(*3 4)', val: { type: 'number', value: 12 } },
  { text: '(define (mkgen1) (let ((gen (let ((i 0)) (lambda (return) (set! i (+ i 1)) (return i))))) (lambda () (call/cc gen))))' },
  { text: '(define gen1 (mkgen1))' },
  { text: '(gen1)', val: { type: 'number', value: 1 } },
  { text: '(gen1)', val: { type: 'number', value: 2 } },
  { text: '(define (mkgen2) (let ((i 0)) (lambda () (set! i (+ i 1)) i)))' },
  { text: '(define gen2 (mkgen2))' },
  { text: '(gen2)', val: { type: 'number', value: 1 } },
  { text: '(gen2)', val: { type: 'number', value: 2 } },
  { text: '+', val: { type: 'procedure' } },
  { text: 'call/cc', val: { type: 'procedure' } },
  { text: '#!nodebug' },
  { text: '(define two 2) two', val: { type: 'number', value: 2 } },
  { text: '  ;comment\n5 ;comment\n', val: { type: 'number', value: 5 } },
  { text: ';(comment\n;  comment)\n' },
  { text: '(+ 4 5))', err: 'unexpectedClosingBracket' },
  { text: '' }
//  { text: '', val: { type: '', value:  } },
]

function runTests () {
  const vm = new Vm(base)

  const success = tests.every(test => {
    let result, err

    try {
      const parsed = (new Parser(test.text)).parse()
      result = parsed.map(val => vm.evaluate(val)).slice(-1)[0]
    } catch (e) {
      err = e
    }

    if (err) {
      if (test.err && test.err === err.code) {
        return true
      } else {
        console.log(test)
        console.log(err.stack || err)
      }
    } else {
      if (test.val && result.type === test.val.type &&
          (result.value === test.val.value || test.val.value === undefined)) {
        return true
      } else if (test.vals && result.type === 'list' &&
          test.vals.every((v, i) => result.value[i].type === v.type &&
            result.value[i].value === v.value)) {
        return true
      } else if (!test.val && !test.vals && result === undefined) {
        return true
      } else {
        console.log(test)
        console.log(result)
      }
    }
  })

  if (success) {
    console.log(tests.length + ' tests passed')
  }
}

function runRepl () {
  const vm = new Vm(base)

  process.stdin.resume()
  let y = 0
  const lines = []

  stdinLines(line => {
    try {
      lines.push(line)
      const parsed = (new Parser(line, 0, y++)).parse()

      parsed.forEach(val => {
        const result = vm.evaluate(val)

        if (result !== undefined) {
          console.log(';' + result)
        }
      })
    } catch (e) {
      if (e.err) {
        console.log(e.print(lines))
      } else {
        throw e
      }
    }
  })
}

function stdinLines (cb) {
  let rest = ''

  process.stdin.on('data', data => {
    let start = 0

    for (let end = 0; end < data.length; end++) {
      if (data[end] === 10) {
        const substr = data.toString('utf8', start, end - (data[end - 1] === 13))

        if (rest.length) {
          cb(rest + substr)
          rest = ''
        } else {
          cb(substr)
        }

        start = end + 1
      }
    }

    rest = data.toString('utf8', start)
  })

  process.stdin.on('end', () => {
    if (rest.length) {
      cb(rest)
      rest = ''
    }
  })

  process.stdin.resume()
}

runTests()
runRepl()
