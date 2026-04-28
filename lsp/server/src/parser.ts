/**
 * ToyLang parser & validator.
 *
 * Produces a ParseResult containing:
 *  - diagnostics   flat list of ToyDiagnostic (maps 1-to-1 to LSP Diagnostic)
 *  - definitions   map from variable name → Span of the binding `let` token
 *  - uses          map from variable name → list of Spans where the var is referenced
 *  - inferredValues map from variable name → human-readable formatted value string
 *
 * Diagnostic codes mirror the spec in 03-diagnostics.md.
 */

export interface Span {
  line: number;   // 0-based
  startChar: number;
  endChar: number;
}

export interface ToyDiagnostic {
  code: string;       // e.g. "TL001"
  message: string;
  severity: 'error' | 'warning';
  span: Span;
}

export interface ParseResult {
  diagnostics:    ToyDiagnostic[];
  /** name → span of the identifier token in its defining `let` statement */
  definitions:    Map<string, Span>;
  /** name → every span where the variable is referenced (print / if) */
  uses:           Map<string, Span[]>;
  /** name → formatted output string as the evaluator would produce */
  inferredValues: Map<string, string>;
}

// ---------------------------------------------------------------------------
// Tokeniser
// ---------------------------------------------------------------------------

type TokenKind =
  | 'LET' | 'PRINT' | 'IF' | 'ELSE'
  | 'IDENT' | 'DIGIT'
  | 'PLUS' | 'STAR' | 'EQ'
  | 'LPAREN' | 'RPAREN'
  | 'UNKNOWN';

interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  col: number;
}

function tokeniseLine(line: string, lineIdx: number): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === ' ') { i++; continue; }

    const tok = (kind: TokenKind, value: string): Token =>
      ({ kind, value, line: lineIdx, col: i });

    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < line.length && /[0-9]/.test(line[j])) j++;
      tokens.push(tok(j - i > 1 ? 'UNKNOWN' : 'DIGIT', line.slice(i, j)));
      i = j;
    } else if (/[a-zA-Z]/.test(ch)) {
      let j = i;
      while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
      const word = line.slice(i, j);
      const kw: Record<string, TokenKind> = {
        let: 'LET', print: 'PRINT', if: 'IF', else: 'ELSE',
      };
      tokens.push(tok(kw[word] ?? 'IDENT', word));
      i = j;
    } else if (ch === '+') { tokens.push(tok('PLUS',  ch)); i++; }
    else if (ch === '*')   { tokens.push(tok('STAR',  ch)); i++; }
    else if (ch === '=')   { tokens.push(tok('EQ',    ch)); i++; }
    else if (ch === '(')   { tokens.push(tok('LPAREN',ch)); i++; }
    else if (ch === ')')   { tokens.push(tok('RPAREN',ch)); i++; }
    else                   { tokens.push(tok('UNKNOWN',ch)); i++; }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function span(t: Token, extra = 0): Span {
  return { line: t.line, startChar: t.col, endChar: t.col + t.value.length + extra };
}

function lineSpan(lineIdx: number, lineText: string): Span {
  return { line: lineIdx, startChar: 0, endChar: lineText.length };
}

// ---------------------------------------------------------------------------
// Expression formatter  (mirrors 02-semantics.md)
// ---------------------------------------------------------------------------

/**
 * Given the digit tokens of an expression, return the formatted value string
 * exactly as the ToyLang evaluator would print it.
 */
function formatExpr(digitTokens: Token[], op: 'PLUS' | 'STAR' | null): string {
  const digits = digitTokens.filter(t => t.kind === 'DIGIT').map(t => t.value);
  if (digits.length === 0) return '?';

  if (digits.length === 1) {
    return digits[0] === '0' ? '0' : `COPY ${digits[0]}`;
  }

  // OR / AND: skip zeros
  const nonZero = digits.filter(d => d !== '0');
  if (nonZero.length === 0) return '0';

  const separator = op === 'PLUS' ? ' OR ' : ' AND ';
  return nonZero.join(separator);
}

// ---------------------------------------------------------------------------
// Parser / Validator
// ---------------------------------------------------------------------------

export function validate(source: string): ParseResult {
  const diags: ToyDiagnostic[] = [];
  const definitions = new Map<string, Span>();
  const uses        = new Map<string, Span[]>();
  const inferredValues = new Map<string, string>();

  const lines = source.split('\n');

  const push = (
    code: string,
    message: string,
    severity: 'error' | 'warning',
    s: Span
  ): void => { diags.push({ code, message, severity, span: s }); };

  const addUse = (name: string, s: Span): void => {
    if (!uses.has(name)) uses.set(name, []);
    uses.get(name)!.push(s);
  };

  // Symbol table: variable name → line where it was defined
  const defined = new Map<string, number>();

  let insideIf        = false;
  let ifBranchCount   = 0;
  let ifBodyExpected  = false;
  let elseBodyExpected = false;

  for (let li = 0; li < lines.length; li++) {
    const raw     = lines[li];
    const trimmed = raw.trimEnd();
    if (trimmed === '') continue;

    const tokens = tokeniseLine(trimmed, li);
    if (tokens.length === 0) continue;

    const first = tokens[0];

    // ------------------------------------------------------------------ ELSE
    if (first.kind === 'ELSE') {
      if (!insideIf) {
        push('TL011', "Unexpected 'else' without matching 'if'.", 'error', span(first));
      } else {
        elseBodyExpected = true;
        ifBranchCount    = 0;
      }
      continue;
    }

    // -------------------------------------------------------- IF-body expected
    if (ifBodyExpected || elseBodyExpected) {
      if (first.kind !== 'LET') {
        push('TL012', "Expected a 'let' statement after 'if' condition.", 'error',
          lineSpan(li, trimmed));
      } else {
        ifBranchCount++;
        if (ifBranchCount > 1) {
          push('TL004', "An 'if' branch must contain exactly one 'let' statement.",
            'error', lineSpan(li, trimmed));
        }
      }
      ifBodyExpected = false;
      if (elseBodyExpected) {
        elseBodyExpected = false;
        insideIf = false;
      }
      // fall through to parse the let statement
    }

    // ---------------------------------------------------------------------- IF
    if (first.kind === 'IF') {
      if (insideIf) {
        push('TL003', "Nested 'if' statements are not allowed.", 'error', span(first));
        continue;
      }
      if (tokens.length < 2 || tokens[1].kind !== 'IDENT') {
        push('TL001', "Expected a variable after 'if'.", 'error', span(first));
      } else {
        const varTok = tokens[1];
        if (!defined.has(varTok.value)) {
          push('TL001', `Undefined variable '${varTok.value}'.`, 'error', span(varTok));
        } else {
          addUse(varTok.value, span(varTok));
        }
        if (varTok.value.length > 1) {
          push('TL009',
            `Invalid identifier '${varTok.value}'. Identifiers must be a single ASCII letter (a–z, A–Z).`,
            'error', span(varTok));
        } else if (/[A-Z]/.test(varTok.value)) {
          push('TL101', `Uppercase identifier '${varTok.value}'. Prefer lowercase (a–z).`,
            'warning', span(varTok));
        }
      }
      if (tokens.length > 2) {
        push('TL010', "Expected newline after statement.", 'error', span(tokens[2]));
      }
      insideIf       = true;
      ifBodyExpected = true;
      ifBranchCount  = 0;
      continue;
    }

    // Close if-block when we hit a top-level non-else statement
    if (insideIf && !elseBodyExpected && !ifBodyExpected) {
      insideIf = false;
    }

    // ------------------------------------------------------------------- PRINT
    if (first.kind === 'PRINT') {
      if (tokens.length < 2 || tokens[1].kind !== 'IDENT') {
        push('TL009', "Expected an identifier after 'print'.", 'error', span(first));
      } else {
        const varTok = tokens[1];
        if (varTok.value.length > 1) {
          push('TL009',
            `Invalid identifier '${varTok.value}'. Identifiers must be a single ASCII letter (a–z, A–Z).`,
            'error', span(varTok));
        } else {
          if (!defined.has(varTok.value)) {
            push('TL001', `Undefined variable '${varTok.value}'.`, 'error', span(varTok));
          } else {
            addUse(varTok.value, span(varTok));
          }
          if (/[A-Z]/.test(varTok.value)) {
            push('TL101', `Uppercase identifier '${varTok.value}'. Prefer lowercase (a–z).`,
              'warning', span(varTok));
          }
        }
        if (tokens.length > 2) {
          push('TL010', "Expected newline after statement.", 'error', span(tokens[2]));
        }
      }
      continue;
    }

    // --------------------------------------------------------------------- LET
    if (first.kind === 'LET') {
      let idx = 1;

      if (idx >= tokens.length || tokens[idx].kind !== 'IDENT') {
        push('TL009', "Expected an identifier after 'let'.", 'error', span(first));
        continue;
      }
      const identTok = tokens[idx];
      if (identTok.value.length > 1) {
        push('TL009',
          `Invalid identifier '${identTok.value}'. Identifiers must be a single ASCII letter (a–z, A–Z).`,
          'error', span(identTok));
      } else if (/[A-Z]/.test(identTok.value)) {
        push('TL101', `Uppercase identifier '${identTok.value}'. Prefer lowercase (a–z).`,
          'warning', span(identTok));
      }
      idx++;

      if (idx >= tokens.length || tokens[idx].kind !== 'EQ') {
        push('TL014', "Expected '=' after identifier in 'let' statement.", 'error',
          span(identTok));
        continue;
      }
      idx++;

      if (idx >= tokens.length) {
        push('TL008', "Expected an expression after '='.", 'error', span(tokens[idx - 1]));
        continue;
      }

      const exprTokens = tokens.slice(idx);

      for (const t of exprTokens) {
        if (t.kind === 'LPAREN' || t.kind === 'RPAREN') {
          push('TL006', 'Parentheses are not allowed in expressions.', 'error', span(t));
        }
      }
      for (const t of exprTokens) {
        if (t.kind === 'UNKNOWN' && /^[0-9]{2,}$/.test(t.value)) {
          push('TL005', 'Multi-digit numbers are not allowed. Use a single digit (0–9).', 'error', span(t));
        }
      }

      const hasPlus = exprTokens.some(t => t.kind === 'PLUS');
      const hasStar = exprTokens.some(t => t.kind === 'STAR');
      if (hasPlus && hasStar) {
        push('TL002', "Mixed operators in expression. Use only '+' or only '*', not both.",
          'error', lineSpan(li, trimmed));
      }

      const lastExpr = exprTokens[exprTokens.length - 1];
      if (lastExpr.kind === 'PLUS' || lastExpr.kind === 'STAR') {
        push('TL013',
          `Unexpected end of expression after operator '${lastExpr.value}'.`,
          'error', span(lastExpr));
      }

      // Register definition and infer value
      if (identTok.value.length === 1) {
        const defSpan: Span = span(identTok);
        defined.set(identTok.value, li);
        definitions.set(identTok.value, defSpan);

        // Only infer when expression is valid (no mixed ops, no trailing op)
        if (!hasPlus || !hasStar) {
          const op: 'PLUS' | 'STAR' | null =
            hasPlus ? 'PLUS' : hasStar ? 'STAR' : null;
          const formatted = formatExpr(exprTokens, op);
          inferredValues.set(identTok.value, formatted);
        }
      }
      continue;
    }

    // ----------------------------------------------------------- UNKNOWN START
    push('TL007', "Unknown statement. Expected 'let', 'print', or 'if'.", 'error',
      lineSpan(li, trimmed));
  }

  // ---------------------------------------------------------------- TL102: unused variables
  for (const [name, defLine] of defined.entries()) {
    if (!uses.has(name)) {
      push('TL102', `Variable '${name}' is defined but never used.`,
        'warning', { line: defLine, startChar: 0, endChar: lines[defLine]?.length ?? 0 });
    }
  }

  return { diagnostics: diags, definitions, uses, inferredValues };
}
