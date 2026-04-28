# TL101 — Uppercase Identifier

## Triggering (warning)

```toylang
let A = 5
print A
```

**Diagnostic:** `TL101: Uppercase identifier 'A'. Prefer lowercase (a–z).`

The program is **valid** and produces output, but the convention is lowercase.

**Output (still valid):** `COPY 5`

## Corrected

```toylang
let a = 5
print a
```

**Output:** `COPY 5`
