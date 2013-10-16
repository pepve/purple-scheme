(define (tail-recursive-sum acc . vals)
  (if (null? vals)
      acc
      (apply
        tail-recursive-sum
        (cons (binary-sum acc (car vals))
              (cdr vals)))))

(define (+ . vals)
  (apply tail-recursive-sum (cons 0 vals)))

(define (tail-recursive-subtract acc . vals)
  (if (null? vals)
      acc
      (apply
        tail-recursive-subtract
        (cons (binary-subtract acc (car vals))
              (cdr vals)))))

(define (- . vals)
  (if (null? vals)
      0
      (if (null? (cdr vals))
          (binary-subtract 0 (car vals))
          (apply tail-recursive-subtract vals))))

(define (tail-recursive-multiply acc . vals)
  (if (null? vals)
      acc
      (apply
        tail-recursive-multiply
        (cons (binary-multiply acc (car vals))
              (cdr vals)))))

(define (* . vals)
  (apply tail-recursive-multiply (cons 1 vals)))

(define (tail-recursive-divide acc . vals)
  (if (null? vals)
    acc
    (apply
      tail-recursive-divide
      (cons (binary-divide acc (car vals))
            (cdr vals)))))

(define (/ . vals)
  (if (null? vals)
    0
    (if (null? (cdr vals))
        (binary-divide 1 (car vals))
        (apply tail-recursive-subtract vals))))

(define call/cc call-with-current-continuation)

; vim: expandtab tabstop=2
