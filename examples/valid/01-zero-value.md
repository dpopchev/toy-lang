# 01 — Zero Value

A bare `0` evaluates to the literal `0`.

## Source

```toylang
let a = 0
print a
```

## Expected Output

```
0
```

## Covers

- `letStmt` with single `DIGIT` expression (`0`)
- `printStmt`
- Zero semantics: a bare `0` prints `0`
