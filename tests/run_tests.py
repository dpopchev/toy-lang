#!/usr/bin/env python3
"""
ToyLang test runner.

Usage:
    python3 tests/run_tests.py [--verbose]

Exits 0 if all tests pass, 1 otherwise.
"""

from __future__ import annotations
import argparse
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple, Optional

# ---------------------------------------------------------------------------
# Tiny ToyLang interpreter
# (mirrors 02-semantics.md precisely)
# ---------------------------------------------------------------------------

def _format_expr(digits: list[str], op: Optional[str]) -> str:
    """Format a parsed expression exactly as 02-semantics.md describes."""
    if len(digits) == 1:
        return '0' if digits[0] == '0' else f'COPY {digits[0]}'
    non_zero = [d for d in digits if d != '0']
    if not non_zero:
        return '0'
    sep = ' OR ' if op == '+' else ' AND '
    return sep.join(non_zero)


@dataclass
class Diagnostic:
    code: str
    message: str
    line: int   # 1-based


def run(source: str) -> Tuple[List[str], List[Diagnostic]]:
    """
    Interpret *source* and return (output_lines, diagnostics).
    Diagnostics are produced for the errors the LSP server would flag;
    execution stops at the first error.
    """
    lines   = source.split('\n')
    store: dict[str, tuple[list[str], Optional[str]]] = {}   # name -> (digits, op)
    output: list[str]        = []
    diags:  list[Diagnostic] = []

    def err(code: str, msg: str, lineno: int) -> None:
        diags.append(Diagnostic(code, msg, lineno))

    i = 0
    while i < len(lines):
        raw = lines[i].rstrip()
        lineno = i + 1
        i += 1

        if not raw.strip():
            continue

        tokens = raw.split()
        if not tokens:
            continue
        kw = tokens[0]

        # ---------------------------------------------------------------- let
        if kw == 'let':
            if len(tokens) < 4 or tokens[2] != '=':
                err('TL014', "Expected '=' after identifier in 'let' statement.", lineno)
                break
            name = tokens[1]
            if len(name) != 1 or not name.isalpha():
                err('TL009', f"Invalid identifier '{name}'.", lineno)
                break
            expr_tokens = tokens[3:]
            digits = [t for t in expr_tokens if re.fullmatch(r'[0-9]', t)]
            ops    = [t for t in expr_tokens if t in ('+', '*')]
            unique_ops = set(ops)
            if len(unique_ops) > 1:
                err('TL002', "Mixed operators in expression.", lineno)
                break
            op = ops[0] if ops else None
            store[name] = (digits, op)
            continue

        # --------------------------------------------------------------- print
        if kw == 'print':
            if len(tokens) < 2:
                err('TL009', "Expected an identifier after 'print'.", lineno)
                break
            name = tokens[1]
            if name not in store:
                err('TL001', f"Undefined variable '{name}'.", lineno)
                break
            digits, op = store[name]
            output.append(_format_expr(digits, op))
            continue

        # ------------------------------------------------------------------ if
        if kw == 'if':
            if len(tokens) < 2:
                err('TL001', "Expected a variable after 'if'.", lineno)
                break
            name = tokens[1]
            if name not in store:
                err('TL001', f"Undefined variable '{name}'.", lineno)
                break
            digits, _ = store[name]
            truthy = any(d != '0' for d in digits)

            # Read if-body
            if i >= len(lines):
                err('TL012', "Expected a 'let' statement after 'if' condition.", lineno)
                break
            if_body_raw = lines[i].rstrip(); i += 1
            if not if_body_raw.split() or if_body_raw.split()[0] != 'let':
                err('TL012', "Expected a 'let' statement after 'if' condition.", lineno)
                break

            # Peek for else
            else_body_raw: Optional[str] = None
            if i < len(lines) and lines[i].strip() == 'else':
                i += 1  # consume 'else'
                if i < len(lines):
                    else_body_raw = lines[i].rstrip(); i += 1

            branch = if_body_raw if truthy else else_body_raw
            if branch:
                # Parse and execute the branch let
                btokens = branch.split()
                if btokens[0] == 'let' and len(btokens) >= 4 and btokens[2] == '=':
                    bname  = btokens[1]
                    bexpr  = btokens[3:]
                    bdigits = [t for t in bexpr if re.fullmatch(r'[0-9]', t)]
                    bops    = [t for t in bexpr if t in ('+', '*')]
                    bop     = bops[0] if bops else None
                    store[bname] = (bdigits, bop)
            continue

        # ---------------------------------------------------------------- else (stray)
        if kw == 'else':
            err('TL011', "Unexpected 'else' without matching 'if'.", lineno)
            break

        err('TL007', f"Unknown statement '{kw}'.", lineno)
        break

    return output, diags


# ---------------------------------------------------------------------------
# Test runner
# ---------------------------------------------------------------------------

GREEN = '\033[32m'
RED   = '\033[31m'
YEL   = '\033[33m'
RST   = '\033[0m'


def run_valid_tests(valid_dir: Path, verbose: bool) -> Tuple[int, int]:
    passed = failed = 0
    tl_files = sorted(valid_dir.glob('*.tl'))
    if not tl_files:
        print(f"{YEL}  (no valid/*.tl files found){RST}")
        return 0, 0

    for tl in tl_files:
        expected_file = tl.with_suffix('.expected')
        if not expected_file.exists():
            print(f"{YEL}  SKIP {tl.name} (no .expected file){RST}")
            continue

        source   = tl.read_text()
        expected = [l.rstrip() for l in expected_file.read_text().splitlines() if l.strip()]
        output, diags = run(source)

        if diags:
            failed += 1
            print(f"{RED}  FAIL {tl.name}{RST}")
            print(f"       unexpected diagnostics: {[d.code for d in diags]}")
            continue

        actual = [l.rstrip() for l in output]
        if actual == expected:
            passed += 1
            if verbose:
                print(f"{GREEN}  PASS {tl.name}{RST}")
        else:
            failed += 1
            print(f"{RED}  FAIL {tl.name}{RST}")
            print(f"       expected: {expected}")
            print(f"       actual:   {actual}")

    return passed, failed


def run_invalid_tests(invalid_dir: Path, verbose: bool) -> Tuple[int, int]:
    passed = failed = 0
    tl_files = sorted(invalid_dir.glob('*.tl'))
    if not tl_files:
        print(f"{YEL}  (no invalid/*.tl files found){RST}")
        return 0, 0

    for tl in tl_files:
        diag_file = tl.with_suffix('.diagnostics')
        if not diag_file.exists():
            print(f"{YEL}  SKIP {tl.name} (no .diagnostics file){RST}")
            continue

        source          = tl.read_text()
        expected_codes  = {c.strip() for c in diag_file.read_text().splitlines() if c.strip()}
        _, diags        = run(source)
        actual_codes    = {d.code for d in diags}

        missing = expected_codes - actual_codes
        if not missing:
            passed += 1
            if verbose:
                print(f"{GREEN}  PASS {tl.name}{RST}")
        else:
            failed += 1
            print(f"{RED}  FAIL {tl.name}{RST}")
            print(f"       expected codes: {expected_codes}")
            print(f"       actual codes:   {actual_codes}")
            print(f"       missing:        {missing}")

    return passed, failed


def main() -> int:
    parser = argparse.ArgumentParser(description='ToyLang test runner')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Print PASS lines as well as FAILs')
    args = parser.parse_args()

    root = Path(__file__).parent

    print("\n=== Valid programs ===")
    vp, vf = run_valid_tests(root / 'valid', args.verbose)

    print("\n=== Invalid programs ===")
    ip, if_ = run_invalid_tests(root / 'invalid', args.verbose)

    total_p = vp + ip
    total_f = vf + if_
    total   = total_p + total_f

    color = GREEN if total_f == 0 else RED
    print(f"\n{color}Results: {total_p}/{total} passed{RST}")
    if total_f:
        print(f"{RED}  {total_f} test(s) FAILED{RST}")

    return 0 if total_f == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
