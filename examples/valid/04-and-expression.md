# 04 — AND Expression

The `*` operator means logical AND. Operands are joined with `AND`, skipping `0`s.

## Source

```toylang
let a = 1 * 2 * 3
print a
```

## Expected Output

```
1 AND 2 AND 3
```

## Covers

- `letStmt` with multi-operand `*` expression
- `printStmt`
- AND evaluation: `*` becomes `AND`
