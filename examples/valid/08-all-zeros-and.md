# 08 — All Zeros (AND)

When every operand in an AND expression is `0`, the result collapses to `0`.

## Source

```toylang
let a = 0 * 0
print a
```

## Expected Output

```
0
```

## Covers

- `letStmt` with `*` expression where all operands are `0`
- All-zero collapse: if nothing survives zero-skipping, print `0`
