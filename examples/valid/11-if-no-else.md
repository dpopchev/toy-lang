# 11 — If Without Else

An `if` statement without an `else` branch. The body executes only when the condition is truthy.

## Source

```toylang
let a = 3
if a
let b = 7
print b
```

## Expected Output

```
COPY 7
```

Since `a` is `3` (truthy), the body executes: `b = 7`. Printing `b` yields `COPY 7`.

## Covers

- `ifStmt` without `else`
- Optional else is omitted
