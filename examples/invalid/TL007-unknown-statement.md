# TL007 — Unknown Statement

## Failing

```toylang
let a = 5
return a
```

**Diagnostic:** `TL007: Unknown statement. Expected 'let', 'print', or 'if'.`

`return` is not a ToyLang keyword.

## Corrected

```toylang
let a = 5
print a
```

**Output:** `COPY 5`
