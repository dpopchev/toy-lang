# TL008 — Missing Expression

## Failing

```toylang
let a =
print a
```

**Diagnostic:** `TL008: Expected an expression after '='.`

The right-hand side of `let a =` is empty.

## Corrected

```toylang
let a = 1
print a
```

**Output:** `COPY 1`
