# ToyLang LSP Extension

A VS Code Language Server extension for [ToyLang](../00-overview.md) that provides:

- **Diagnostics** — real-time squiggles for all TL001–TL014 errors and TL101–TL102 warnings
- **Completion** — keywords (`let`, `print`, `if`, `else`) + variables already defined in the file
- **Hover** — inline documentation for every keyword
- **Syntax highlighting** — via a TextMate grammar (`.tl` files)

---

## Project Layout

```
lsp/
├── package.json            ← npm workspace root (compile both client + server)
├── .vscode/
│   ├── launch.json         ← "Launch Client" and "Attach to Server" debug configs
│   └── tasks.json          ← build task (Ctrl+Shift+B)
├── client/
│   ├── package.json        ← VS Code extension manifest
│   ├── tsconfig.json
│   ├── language-configuration.json
│   ├── syntaxes/
│   │   └── toylang.tmLanguage.json   ← syntax-highlight grammar
│   └── src/
│       └── extension.ts    ← starts the language server
└── server/
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── parser.ts       ← ToyLang tokeniser + validator (all TL codes)
        └── server.ts       ← LSP server (diagnostics, completion, hover)
```

---

## Quick Start

```bash
# 1. Install dependencies (run from lsp/)
cd lsp
npm install          # installs root dev-deps

cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. Compile
npm run compile      # builds client/out/ and server/out/

# 3. Open the lsp/ folder in VS Code
code .

# 4. Press F5  →  "Launch Client"
#    A new Extension Development Host window opens.
#    Create or open any *.tl file to activate ToyLang support.
```

---

## Debugging

| Goal | How |
|---|---|
| Debug the **client** | Set a breakpoint in `client/src/extension.ts`, press F5 |
| Debug the **server** | After launching the client, switch to the "Attach to Server" config and press F5 |
| Debug **both** | Use the compound "Client + Server" launch config |
| Trace LSP messages | Set `"toylang.trace.server": "verbose"` in Settings, check the **ToyLang Language Server** output channel |

---

## Diagnostics Implemented

| Code | Short name | Severity |
|---|---|---|
| TL001 | Undefined variable | error |
| TL002 | Mixed operators | error |
| TL003 | Nested if | error |
| TL004 | Multiple statements in branch | error |
| TL005 | Multi-digit number | error |
| TL006 | Parentheses not allowed | error |
| TL007 | Unknown statement | error |
| TL008 | Missing expression | error |
| TL009 | Invalid identifier | error |
| TL010 | Missing newline | error |
| TL011 | Else without if | error |
| TL012 | Missing if body | error |
| TL013 | Trailing operator | error |
| TL014 | Missing equals sign | error |
| TL101 | Uppercase identifier | warning |
| TL102 | Unused variable | warning |

---

## Extending the Server

The server is intentionally separated into two layers:

- **`parser.ts`** — pure TypeScript, no VS Code/LSP dependencies. You can unit-test it independently.
- **`server.ts`** — LSP wiring. Add new LSP capabilities here (e.g. `onDocumentSymbol`, `onDefinition`).

To add **Go-to-Definition** for variables:
1. Return `definitionProvider: true` in `onInitialize`.
2. Add `connection.onDefinition(...)` in `server.ts`.
3. In `parser.ts` expose the position where each variable was `let`-bound.
