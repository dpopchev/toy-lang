# TL003 — Nested If

## Failing

```toylang
let a = 1
let b = 2
if a
if b
let c = 3
```

**Diagnostic:** `TL003: Nested 'if' statements are not allowed.`

An `if` body contains another `if` instead of a `let`.

## Corrected

```toylang
let a = 1
let b = 2
if a
let c = 3
```

**Output:** *(no print — `c` is bound to `3`)*
