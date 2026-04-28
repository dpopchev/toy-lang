# TL001 — Undefined Variable

## Failing

```toylang
print a
```

**Diagnostic:** `TL001: Undefined variable 'a'.`

`a` has no prior `let` binding.

## Corrected

```toylang
let a = 5
print a
```

**Output:** `COPY 5`
