# ToyLang Diagnostics

This document is the **diagnostic catalog** for ToyLang. Every error a parser, LSP, or AI agent can report is listed here with a stable code, human-readable message, detection rule, fix strategy, and paired examples (failing → corrected).

## Conventions

| Item | Format |
|------|--------|
| Code | `TLxxx` — three-digit, monotonically increasing |
| Severity | **error** (program cannot execute) or **warning** (suspicious but parseable) |
| Constraint | cross-reference to [01-grammar.md](01-grammar.md) constraint `C1`–`C6` where applicable |
| Examples | each entry links to a failing + corrected pair under [examples/invalid/](examples/invalid/) |

---

## TL001 — Undefined Variable

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C4 |
| Message | `Undefined variable '{name}'.` |

**Detection:** A `print` or `if` statement references an `IDENTIFIER` that has no prior `let` binding in the current store.

**Fix strategy:** Add a `let` statement for the variable before its first use — or correct the identifier if it is a typo.

**Example:** [TL001](examples/invalid/TL001-undefined-variable.md)

---

## TL002 — Mixed Operators

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C1 |
| Message | `Mixed operators in expression. Use only '+' or only '*', not both.` |

**Detection:** An `expr` contains both `+` and `*` tokens.

**Fix strategy:** Split into two separate `let` statements — one using only `+`, the other only `*`.

**Example:** [TL002](examples/invalid/TL002-mixed-operators.md)

---

## TL003 — Nested If

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C2 |
| Message | `Nested 'if' statements are not allowed.` |

**Detection:** An `if` body or `else` body contains another `if` statement instead of a `let` statement.

**Fix strategy:** Flatten the logic — use separate sequential `if` statements with an intermediate variable to capture the outer condition result.

**Example:** [TL003](examples/invalid/TL003-nested-if.md)

---

## TL004 — Multiple Statements in Branch

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C3 |
| Message | `An 'if' branch must contain exactly one 'let' statement.` |

**Detection:** An `if` or `else` body contains more than one statement, or a non-`let` statement (e.g. `print`).

**Fix strategy:** Move extra statements outside the `if` block. Each branch may contain only a single `let`.

**Example:** [TL004](examples/invalid/TL004-multiple-statements-in-branch.md)

---

## TL005 — Multi-Digit Number

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C5 |
| Message | `Multi-digit numbers are not allowed. Use a single digit (0–9).` |

**Detection:** A numeric literal in an `expr` spans more than one character (e.g. `10`, `42`).

**Fix strategy:** Replace with a single digit `0`–`9`.

**Example:** [TL005](examples/invalid/TL005-multi-digit-number.md)

---

## TL006 — Parentheses Not Allowed

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C6 |
| Message | `Parentheses are not allowed in expressions.` |

**Detection:** An `expr` contains `(` or `)`.

**Fix strategy:** Remove parentheses. Expressions are flat — no grouping is supported.

**Example:** [TL006](examples/invalid/TL006-parentheses.md)

---

## TL007 — Unknown Statement

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Unknown statement. Expected 'let', 'print', or 'if'.` |

**Detection:** A line does not begin with one of the three keywords (`let`, `print`, `if`, `else`).

**Fix strategy:** Replace with a valid statement. Only `let`, `print`, and `if`/`else` are recognized.

**Example:** [TL007](examples/invalid/TL007-unknown-statement.md)

---

## TL008 — Missing Expression

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Expected an expression after '='.` |

**Detection:** A `let` statement has no `expr` on the right-hand side of `=`.

**Fix strategy:** Provide a valid expression — a single digit or a sequence of digits joined by `+` or `*`.

**Example:** [TL008](examples/invalid/TL008-missing-expression.md)

---

## TL009 — Invalid Identifier

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Invalid identifier '{name}'. Identifiers must be a single ASCII letter (a–z, A–Z).` |

**Detection:** An identifier is more than one character, starts with a digit, or contains non-letter characters.

**Fix strategy:** Use a single letter `a`–`z` or `A`–`Z`.

**Example:** [TL009](examples/invalid/TL009-invalid-identifier.md)

---

## TL010 — Missing Newline

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Expected newline after statement.` |

**Detection:** Two statements appear on the same line (e.g. `let a = 1 print a`).

**Fix strategy:** Place each statement on its own line.

**Example:** [TL010](examples/invalid/TL010-missing-newline.md)

---

## TL011 — Else Without If

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Unexpected 'else' without matching 'if'.` |

**Detection:** An `else` keyword appears at the top level, not preceded by an `if` statement.

**Fix strategy:** Add the missing `if` statement before `else`, or remove the stray `else`.

**Example:** [TL011](examples/invalid/TL011-else-without-if.md)

---

## TL012 — Missing If Body

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | C3 |
| Message | `Expected a 'let' statement after 'if' condition.` |

**Detection:** An `if` line is followed by a non-`let` statement (e.g. `print`, another `if`, or EOF).

**Fix strategy:** Add a `let` statement as the `if` body.

**Example:** [TL012](examples/invalid/TL012-missing-if-body.md)

---

## TL013 — Trailing Operator

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Unexpected end of expression after operator '{op}'.` |

**Detection:** An expression ends with `+` or `*` and no right-hand operand (e.g. `let a = 1 +`).

**Fix strategy:** Add a digit after the operator, or remove the trailing operator.

**Example:** [TL013](examples/invalid/TL013-trailing-operator.md)

---

## TL014 — Missing Equals Sign

| Field | Value |
|-------|-------|
| Severity | error |
| Constraint | — |
| Message | `Expected '=' after identifier in 'let' statement.` |

**Detection:** A `let` statement has an identifier but no `=` before the expression (e.g. `let a 5`).

**Fix strategy:** Insert `=` between the identifier and the expression.

**Example:** [TL014](examples/invalid/TL014-missing-equals.md)

---

## Warnings

### TL101 — Uppercase Identifier

| Field | Value |
|-------|-------|
| Severity | warning |
| Constraint | — |
| Message | `Uppercase identifier '{name}'. Prefer lowercase (a–z).` |

**Detection:** An `IDENTIFIER` is an uppercase letter (`A`–`Z`). The program is valid, but the convention is lowercase.

**Fix strategy:** Rename the variable to its lowercase equivalent.

**Example:** [TL101](examples/invalid/TL101-uppercase-identifier.md)

---

### TL102 — Variable Defined but Never Used

| Field | Value |
|-------|-------|
| Severity | warning |
| Constraint | — |
| Message | `Variable '{name}' is defined but never used.` |

**Detection:** A `let` statement binds an `IDENTIFIER` that is never referenced by a subsequent `print` or `if` statement.

**Fix strategy:** Remove the unused `let` statement, or add a `print` / `if` that uses the variable.

**Example:** [TL102](examples/invalid/TL102-unused-variable.md)

---

## Diagnostic Summary

| Code | Message (short) | Severity | Constraint |
|------|----------------|----------|------------|
| TL001 | Undefined variable | error | C4 |
| TL002 | Mixed operators | error | C1 |
| TL003 | Nested if | error | C2 |
| TL004 | Multiple statements in branch | error | C3 |
| TL005 | Multi-digit number | error | C5 |
| TL006 | Parentheses not allowed | error | C6 |
| TL007 | Unknown statement | error | — |
| TL008 | Missing expression | error | — |
| TL009 | Invalid identifier | error | — |
| TL010 | Missing newline | error | — |
| TL011 | Else without if | error | — |
| TL012 | Missing if body | error | C3 |
| TL013 | Trailing operator | error | — |
| TL014 | Missing equals sign | error | — |
| TL101 | Uppercase identifier | warning | — |
| TL102 | Unused variable | warning | — |
