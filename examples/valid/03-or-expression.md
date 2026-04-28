# 03 — OR Expression

The `+` operator means logical OR. Operands are joined with `OR`, skipping `0`s.

## Source

```toylang
let a = 1 + 2 + 3
print a
```

## Expected Output

```
1 OR 2 OR 3
```

## Covers

- `letStmt` with multi-operand `+` expression
- `printStmt`
- OR evaluation: `+` becomes `OR`
