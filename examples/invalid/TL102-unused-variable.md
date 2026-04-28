# TL102 — Variable Defined but Never Used

## Triggering (warning)

```toylang
let a = 5
let b = 3
print a
```

**Diagnostic:** `TL102: Variable 'b' is defined but never used.`

`b` is bound but never referenced by `print` or `if`. The program is **valid** and produces output.

**Output (still valid):** `COPY 5`

## Corrected

```toylang
let a = 5
print a
```

**Output:** `COPY 5`
