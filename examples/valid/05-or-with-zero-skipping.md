# 05 — OR with Zero Skipping

When `0` appears in an OR expression, it is skipped in the output.

## Source

```toylang
let a = 1 + 0 + 3
print a
```

## Expected Output

```
1 OR 3
```

## Covers

- `letStmt` with `+` expression containing `0`
- Zero-skipping in OR: `0` operands are dropped
