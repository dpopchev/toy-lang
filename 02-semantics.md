# ToyLang Semantics

This document defines the operational semantics of ToyLang — how each statement transforms program state.

## State Model

A ToyLang program executes against a **store**: a mapping from identifiers to values.

```
Store  =  IDENTIFIER → Value
Value  =  0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
```

* The **initial store** is empty: `{}`.
* Statements are executed **top-to-bottom**, each producing a new store.
* Output is an **ordered list of strings** accumulated during execution.

We write `σ` for the current store and `out` for the output list.

---

## Statement Semantics

### `let` Statement

```
letStmt :  "let" IDENTIFIER "=" expr
```

**Effect:** Evaluate `expr` and bind the result to `IDENTIFIER` in the store.

```
σ, out  ──  let x = expr  ──▶  σ[x ↦ eval(expr)], out
```

* If `x` already exists in `σ`, its value is **overwritten**.
* `expr` is evaluated purely from its literal digits — it does not reference the store.

### `print` Statement

```
printStmt :  "print" IDENTIFIER
```

**Precondition:** `IDENTIFIER` must exist in `σ` (constraint C4 → [TL001](03-diagnostics.md#tl001--undefined-variable)).

**Effect:** Append the formatted value of `IDENTIFIER` to `out`. The store is unchanged.

```
σ, out  ──  print x  ──▶  σ, out ++ [format(σ(x))]
```

#### Formatting Rules

The value bound to a variable is the **full expression** assigned by the originating `let` statement, not a single digit. Formatting operates on that expression:

| Expression form | Condition | `format(...)` |
|----------------|-----------|---------------|
| `0` | bare zero | `"0"` |
| `d` (single non-zero digit) | bare copy | `"COPY d"` |
| `d₁ + d₂ + ... + dₙ` | OR expression | join non-zero digits with `" OR "`, or `"0"` if all are zero |
| `d₁ * d₂ * ... * dₙ` | AND expression | join non-zero digits with `" AND "`, or `"0"` if all are zero |

> **Zero-skipping:** In OR / AND expressions every `0` operand is dropped before joining. If no operands remain, the result is `"0"`.

### `if` Statement

```
ifStmt :  "if" IDENTIFIER NEWLINE letStmt NEWLINE [ "else" NEWLINE letStmt NEWLINE ]
```

**Precondition:** `IDENTIFIER` must exist in `σ` (constraint C4 → [TL001](03-diagnostics.md#tl001--undefined-variable)).

**Effect:** Test the **truthiness** of `σ(IDENTIFIER)`.

```
σ(x) ≠ 0   →   execute the if-branch letStmt
σ(x) = 0   →   execute the else-branch letStmt (if present); otherwise no-op
```

```
σ, out  ──  if x / letTrue / letFalse  ──▶
    if σ(x) ≠ 0 :  σ', out     where σ', out = eval(letTrue,  σ, out)
    if σ(x) = 0 :  σ', out     where σ', out = eval(letFalse, σ, out)   -- when else exists
    if σ(x) = 0 :  σ,  out     -- when no else branch
```

* Truthiness: `0` is **false**; any non-zero digit (`1`–`9`) is **true**.
* Each branch contains exactly one `let` statement (constraint C3 → [TL004](03-diagnostics.md#tl004--multiple-statements-in-branch)).
* `if` statements cannot be nested (constraint C2 → [TL003](03-diagnostics.md#tl003--nested-if)).

---

## Evaluation Summary

| Statement | Store change | Output change |
|-----------|-------------|---------------|
| `let x = expr` | `σ[x ↦ eval(expr)]` | — |
| `print x` | — | `out ++ [format(σ(x))]` |
| `if x` … | depends on branch taken | — |

---

## Worked Example

### Program

```toylang
let a = 1 + 0 + 3
let b = 0
if b
let c = 9
else
let c = 4
print a
print c
```

### Execution Trace

| Step | Statement | Store (`σ`) | Output (`out`) |
|------|----------|-------------|----------------|
| 0 | *(initial)* | `{}` | `[]` |
| 1 | `let a = 1 + 0 + 3` | `{ a: 1+0+3 }` | `[]` |
| 2 | `let b = 0` | `{ a: 1+0+3, b: 0 }` | `[]` |
| 3 | `if b` → `b = 0` (falsy) → else branch | | |
| 4 | `let c = 4` | `{ a: 1+0+3, b: 0, c: 4 }` | `[]` |
| 5 | `print a` → format `1+0+3` → skip zeros → `1 OR 3` | `{ a: 1+0+3, b: 0, c: 4 }` | `["1 OR 3"]` |
| 6 | `print c` → format `4` → bare non-zero → `COPY 4` | `{ a: 1+0+3, b: 0, c: 4 }` | `["1 OR 3", "COPY 4"]` |

### Final State

```
Store :  { a: 1+0+3,  b: 0,  c: 4 }
Output:  1 OR 3
         COPY 4
```

---

## Additional Examples

The [examples/valid/](examples/valid/) directory contains per-feature examples, each with source, expected output, and coverage notes:

| Example | Semantics covered |
|---------|------------------|
| [01-zero-value](examples/valid/01-zero-value.md) | `let` + `print` with bare `0` |
| [02-copy](examples/valid/02-copy.md) | `let` + `print` with bare non-zero digit |
| [03-or-expression](examples/valid/03-or-expression.md) | OR evaluation |
| [04-and-expression](examples/valid/04-and-expression.md) | AND evaluation |
| [05-or-with-zero-skipping](examples/valid/05-or-with-zero-skipping.md) | Zero-skipping in OR |
| [06-and-with-zero-skipping](examples/valid/06-and-with-zero-skipping.md) | Zero-skipping in AND |
| [07-all-zeros-or](examples/valid/07-all-zeros-or.md) | All-zero collapse (OR) |
| [08-all-zeros-and](examples/valid/08-all-zeros-and.md) | All-zero collapse (AND) |
| [09-if-else](examples/valid/09-if-else.md) | `if`/`else` truthy branch |
| [10-if-else-falsy](examples/valid/10-if-else-falsy.md) | `if`/`else` falsy branch |
| [11-if-no-else](examples/valid/11-if-no-else.md) | `if` without `else` |
| [12-multi-statement-program](examples/valid/12-multi-statement-program.md) | Full linear program |
