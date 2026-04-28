# TL014 — Missing Equals Sign

## Failing

```toylang
let a 5
print a
```

**Diagnostic:** `TL014: Expected '=' after identifier in 'let' statement.`

The `=` is missing between the identifier and the expression.

## Corrected

```toylang
let a = 5
print a
```

**Output:** `COPY 5`
