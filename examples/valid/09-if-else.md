# 09 — If-Else

An `if` statement tests a variable's truthiness (`0` = false, non-zero = true) and executes the matching branch.

## Source

```toylang
let a = 5
if a
let b = 1
else
let b = 2
print b
```

## Expected Output

```
COPY 1
```

Since `a` is `5` (truthy), the `if` branch executes: `b = 1`. Printing `b` yields `COPY 1`.

## Covers

- `ifStmt` with `else` branch
- Truthiness: non-zero variable takes the `if` branch
- Single `letStmt` per branch (constraint C3)
