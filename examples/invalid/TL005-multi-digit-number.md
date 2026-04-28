# TL005 — Multi-Digit Number

## Failing

```toylang
let a = 10
print a
```

**Diagnostic:** `TL005: Multi-digit numbers are not allowed. Use a single digit (0–9).`

`10` is two characters.

## Corrected

```toylang
let a = 1
print a
```

**Output:** `COPY 1`
