# TL002 — Mixed Operators

## Failing

```toylang
let a = 1 + 2 * 3
print a
```

**Diagnostic:** `TL002: Mixed operators in expression. Use only '+' or only '*', not both.`

The expression mixes `+` and `*`.

## Corrected

```toylang
let a = 1 + 2 + 3
print a
```

**Output:** `1 OR 2 OR 3`
