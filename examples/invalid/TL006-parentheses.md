# TL006 — Parentheses Not Allowed

## Failing

```toylang
let a = (1 + 2)
print a
```

**Diagnostic:** `TL006: Parentheses are not allowed in expressions.`

Grouping with `(` `)` is not part of ToyLang.

## Corrected

```toylang
let a = 1 + 2
print a
```

**Output:** `1 OR 2`
