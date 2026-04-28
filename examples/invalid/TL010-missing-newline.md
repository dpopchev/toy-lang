# TL010 — Missing Newline

## Failing

```toylang
let a = 1 print a
```

**Diagnostic:** `TL010: Expected newline after statement.`

Two statements on the same line.

## Corrected

```toylang
let a = 1
print a
```

**Output:** `COPY 1`
