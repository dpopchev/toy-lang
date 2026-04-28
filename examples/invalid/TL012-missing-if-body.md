# TL012 — Missing If Body

## Failing

```toylang
let a = 1
if a
print a
```

**Diagnostic:** `TL012: Expected a 'let' statement after 'if' condition.`

The `if` body is a `print` instead of a `let`.

## Corrected

```toylang
let a = 1
if a
let b = 9
print b
```

**Output:** `COPY 9`
