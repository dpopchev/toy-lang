# TL011 — Else Without If

## Failing

```toylang
let a = 1
else
let b = 2
```

**Diagnostic:** `TL011: Unexpected 'else' without matching 'if'.`

The `else` has no preceding `if` statement.

## Corrected

```toylang
let a = 1
if a
let b = 2
else
let b = 0
```

**Output:** *(no print — `b` is bound to `2` since `a` is truthy)*
