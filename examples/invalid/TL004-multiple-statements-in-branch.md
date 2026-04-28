# TL004 — Multiple Statements in Branch

## Failing

```toylang
let a = 1
if a
let b = 2
let c = 3
```

**Diagnostic:** `TL004: An 'if' branch must contain exactly one 'let' statement.`

The `if` body has two `let` statements.

## Corrected

```toylang
let a = 1
if a
let b = 2
let c = 3
print b
```

**Output:** `COPY 2`

The second `let c = 3` is moved outside the `if` to become a top-level statement.
