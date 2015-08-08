(define (tail-recursive-sum acc vals)
  (if (null? vals)
      acc
      (tail-recursive-sum
        (binary-sum acc (car vals))
        (cdr vals))))

(define (+ . vals)
  (tail-recursive-sum 0 vals))

(define (tail-recursive-subtract acc vals)
  (if (null? vals)
      acc
      (tail-recursive-subtract
        (binary-subtract acc (car vals))
        (cdr vals))))

(define (- . vals)
  (if (null? vals)
      0 ;should raise an error, but I don't have them yet
      (if (null? (cdr vals))
          (binary-subtract 0 (car vals))
          (tail-recursive-subtract (car vals) (cdr vals)))))

(define (tail-recursive-multiply acc vals)
  (if (null? vals)
      acc
      (tail-recursive-multiply
        (binary-multiply acc (car vals))
        (cdr vals))))

(define (* . vals)
  (tail-recursive-multiply 1 vals))

(define (tail-recursive-divide acc vals)
  (if (null? vals)
    acc
    (tail-recursive-divide
      (binary-divide acc (car vals))
      (cdr vals))))

(define (/ . vals)
  (if (null? vals)
    0 ;should raise an error, but I don't have them yet
    (if (null? (cdr vals))
        (binary-divide 1 (car vals))
        (tail-recursive-divide (car vals) (cdr vals)))))

(define call/cc call-with-current-continuation)

; vim: expandtab tabstop=2
