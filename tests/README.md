# ToyLang Test Suite

This directory contains the automated test harness and all test fixtures.

## Layout

```
tests/
├── run_tests.py            ← test runner (requires Python 3.8+)
├── valid/                  ← programs that must run without errors
│   ├── 01-zero-value.tl
│   ├── 01-zero-value.expected
│   └── ...
├── invalid/                ← programs that must produce specific diagnostics
│   ├── TL001-undefined-variable.tl
│   ├── TL001-undefined-variable.diagnostics
│   └── ...
└── repair/                 ← broken programs for workshop exercises
    ├── 01-fix-mixed-ops.tl         ← broken file (contains the bug)
    ├── 01-fix-mixed-ops.hint       ← one-line hint for the student
    ├── 01-fix-mixed-ops.solution   ← corrected program
    └── ...
```

## Running the Tests

```bash
# From the repo root:
python3 tests/run_tests.py

# Or via make (from lsp/):
make test
```

## How the Runner Works

### Valid tests
For every `valid/*.tl` file the runner:
1. Calls the built-in ToyLang interpreter (pure Python, embedded in `run_tests.py`).
2. Compares actual output against `valid/*.expected` (trailing whitespace ignored, line-by-line).
3. Reports PASS / FAIL.

### Invalid tests
For every `invalid/*.tl` file the runner:
1. Runs the interpreter; it must produce at least one diagnostic.
2. Reads `invalid/*.diagnostics` — a newline-separated list of expected diagnostic codes
   (e.g. `TL002`).
3. Verifies every listed code appears in the actual diagnostics.
4. Reports PASS / FAIL.

### Repair exercises
Repair files are **not** run automatically. They are workshop material:
- Open `repair/NN-name.tl` in VS Code with the extension installed.
- Fix the error(s) until the squiggles disappear.
- Compare your solution to `repair/NN-name.solution`.
- The `.hint` file gives a one-sentence nudge without spoiling the fix.

## Adding a New Test

**Valid:**
```
echo 'let a = 1\nprint a' > tests/valid/13-my-case.tl
echo 'COPY 1'              > tests/valid/13-my-case.expected
```

**Invalid:**
```
echo 'print z'         > tests/invalid/TL001-my-case.tl
echo 'TL001'           > tests/invalid/TL001-my-case.diagnostics
```
