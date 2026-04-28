# ToyLang Overview

`ToyLang` is a deliberately small language designed for hands-on workshops. It is **not** intended to be general-purpose language; but to simple enough for quick onboarding of new users wanting to develop parsing, diagnostics, static analysis and AI explanations for programming languages.

## Design Goals

* Minimal surface area: understand the language in minutes, not hours
* Spec-first development: the language spec is the source of truth
* Tooling-friendly: designed to be easy to build tools for

## Language Features

* variable definitions using `let`
* single-digit positive numerical literals (`0`–`9`)
* logical expressions: `+` means **OR**, `*` means **AND**
* a bare single positive literal is a **COPY** (value used as-is)
* a bare `0` is printed as `0`
* optional single `if`-statements with optional `else`
* `0` is evaluated to false and any non-zero value is evaluated to true
* no comparison operators
* `if` statement is without nesting
* `if` statement branches can only contain a single `let` statement
* `print` statements for rendering expression results
* newline-terminated statements
* expression can only have `+` or `*` — mixing both in a single expression is forbidden
* no support for parentheses in expressions

## Evaluation Semantics

ToyLang is a **logic language**, not an arithmetic language.
Evaluation replaces `+` with **OR** and `*` with **AND**, skipping any `0` operands.
Mixing `+` and `*` in a single expression is **forbidden**.

### Operations

**Zero** — a bare `0` prints `0`.

```toylang
let a = 0
print a          → 0
```

**COPY** — a bare non-zero digit prints `COPY d`.

```toylang
let a = 5
print a          → COPY 5
```

**OR** (`+`) — replace `+` with `OR`, skip `0`s.

```toylang
let a = 1 + 2
print a          → 1 OR 2

let a = 1 + 0 + 3
print a          → 1 OR 3

let a = 0 + 0
print a          → 0
```

**AND** (`*`) — replace `*` with `AND`, skip `0`s.

```toylang
let a = 1 * 2 * 3
print a          → 1 AND 2 AND 3

let a = 1 * 0 * 3
print a          → 1 AND 3

let a = 0 * 0
print a          → 0
```

### Rules

* **Truthiness:** `0` is false; any non-zero digit (`1`–`9`) is true.
* **No mixing:** an expression is either all `+` or all `*`, never both.
* **Expressions** use only `+` or `*` — no parentheses, no arithmetic.

## ToyLang is Not

To keep the language small, it does not support:

* strings
* functions
* loops
* nested conditionals
* multiple statements in `if`
* user-defined types
* I/O beyond `print`
* arithmetic — `+` is OR, `*` is AND, **not** addition/multiplication
* multi-digit numbers

Anything outside of the language `Features` **is not part of the language**.

### Control flow constraints

`ToyLang` only supports a single `if` statement, meaning

* `if`-statement cannot be nested
* `if`-statement cannot have more than one `let` in the branch
* `if`-statement cannot have more than one `else` branch

The execution is **strictly** linear from top to bottom.
