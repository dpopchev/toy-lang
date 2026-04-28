# 02 — Copy

A bare non-zero digit evaluates to `COPY d`.

## Source

```toylang
let a = 5
print a
```

## Expected Output

```
COPY 5
```

## Covers

- `letStmt` with single non-zero `DIGIT` expression
- `printStmt`
- COPY semantics: bare non-zero digit prints `COPY d`
