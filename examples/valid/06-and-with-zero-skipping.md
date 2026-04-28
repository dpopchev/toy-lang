# 06 — AND with Zero Skipping

When `0` appears in an AND expression, it is skipped in the output.

## Source

```toylang
let a = 1 * 0 * 3
print a
```

## Expected Output

```
1 AND 3
```

## Covers

- `letStmt` with `*` expression containing `0`
- Zero-skipping in AND: `0` operands are dropped
