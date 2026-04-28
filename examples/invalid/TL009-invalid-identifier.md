# TL009 — Invalid Identifier

## Failing

```toylang
let x1 = 5
print x1
```

**Diagnostic:** `TL009: Invalid identifier 'x1'. Identifiers must be a single ASCII letter (a–z, A–Z).`

`x1` is two characters.

## Corrected

```toylang
let x = 5
print x
```

**Output:** `COPY 5`
