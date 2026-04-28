# ToyLang Grammar

This document defines the formal grammar of ToyLang using EBNF notation.

## Lexical Grammar

```ebnf
DIGIT       = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" ;
IDENTIFIER  = "a" | "b" | "c" | ... | "z"
            | "A" | "B" | "C" | ... | "Z" ;          (* single letter *)
OPERATOR    = "+" | "*" ;
WHITESPACE  = " " { " " } ;                           (* one or more spaces *)
NEWLINE     = "\n" ;
```

> **Note:** Identifiers are single ASCII letters. Multi-character names are not supported.
> All statements are newline-terminated.

## Syntactic Grammar

```ebnf
program     = { statement NEWLINE } ;

statement   = letStmt
            | printStmt
            | ifStmt ;

letStmt     = "let" WHITESPACE IDENTIFIER WHITESPACE "=" WHITESPACE expr ;

printStmt   = "print" WHITESPACE IDENTIFIER ;

ifStmt      = "if" WHITESPACE IDENTIFIER NEWLINE
              letStmt NEWLINE
              [ "else" NEWLINE
                letStmt NEWLINE ] ;

expr        = DIGIT
            | DIGIT ( WHITESPACE "+" WHITESPACE DIGIT )+       (* OR  expression *)
            | DIGIT ( WHITESPACE "*" WHITESPACE DIGIT )+ ;     (* AND expression *)
```

## Constraints (not expressible in EBNF)

The following rules are part of the language but cannot be captured by a context-free grammar alone. They must be enforced during semantic analysis.

| # | Constraint | Diagnostic | Rationale |
|---|-----------|-----------|----------|
| C1 | An expression must use **only** `+` or **only** `*` — never both. | → [TL002](03-diagnostics.md#tl002--mixed-operators) | Keeps evaluation unambiguous without precedence rules. |
| C2 | `if` statements **cannot** be nested. | → [TL003](03-diagnostics.md#tl003--nested-if) | Flat control flow only. |
| C3 | Each branch of an `if` / `else` contains **exactly one** `let` statement. | → [TL004](03-diagnostics.md#tl004--multiple-statements-in-branch) | No compound blocks. |
| C4 | A variable must be defined (`let`) before it is used in `print` or `if`. | → [TL001](03-diagnostics.md#tl001--undefined-variable) | No implicit declarations. |
| C5 | Digits are single characters `0`–`9`. Multi-digit numbers are invalid. | → [TL005](03-diagnostics.md#tl005--multi-digit-number) | Keeps the lexer trivial. |
| C6 | Parentheses are **not** allowed in expressions. | → [TL006](03-diagnostics.md#tl006--parentheses-not-allowed) | No grouping; expressions are flat. |

## Grammar at a Glance

```toylang
program     →  ( stmt NEWLINE )*
stmt        →  letStmt  |  printStmt  |  ifStmt
letStmt     →  "let" IDENTIFIER "=" expr
printStmt   →  "print" IDENTIFIER
ifStmt      →  "if" IDENTIFIER NEWLINE letStmt NEWLINE ( "else" NEWLINE letStmt NEWLINE )?
expr        →  DIGIT ( ("+" DIGIT)+ | ("*" DIGIT)+ )?
DIGIT       →  [0-9]
IDENTIFIER  →  [a-zA-Z]
```
