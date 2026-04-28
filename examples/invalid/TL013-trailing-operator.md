# TL013 — Trailing Operator

## Failing

```toylang
let a = 1 +
print a
```

**Diagnostic:** `TL013: Unexpected end of expression after operator '+'.`

The expression has a `+` with no right-hand operand.

## Corrected

```toylang
let a = 1 + 2
print a
```

**Output:** `1 OR 2`
