# 10 — If-Else (Falsy Condition)

When the condition variable is `0`, the `else` branch runs.

## Source

```toylang
let a = 0
if a
let b = 1
else
let b = 2
print b
```

## Expected Output

```
COPY 2
```

Since `a` is `0` (falsy), the `else` branch executes: `b = 2`. Printing `b` yields `COPY 2`.

## Covers

- `ifStmt` with `else` branch
- Truthiness: `0` takes the `else` branch
