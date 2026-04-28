import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  InsertTextFormat,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  MarkupKind,
  Location,
  Range,
  CodeAction,
  CodeActionKind,
  TextEdit,
  WorkspaceEdit,
  SemanticTokensBuilder,
  SemanticTokensLegend,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { validate, ParseResult } from './parser';

// ── Semantic token legend ────────────────────────────────────────────────────
// Order MUST match the index used in SemanticTokensBuilder.push() calls.
const TOKEN_TYPES    = ['keyword', 'variable', 'number', 'operator'] as const;
const TOKEN_MODIFIERS = ['declaration', 'readonly'] as const;

const LEGEND: SemanticTokensLegend = {
  tokenTypes:    [...TOKEN_TYPES],
  tokenModifiers: [...TOKEN_MODIFIERS],
};

const TT = { keyword: 0, variable: 1, number: 2, operator: 3 } as const;
const TM = { declaration: 1, readonly: 2 } as const;   // bitmask

// ── Connection ───────────────────────────────────────────────────────────────
const connection = createConnection(ProposedFeatures.all);
const documents  = new TextDocuments<TextDocument>(TextDocument);

let hasConfigurationCapability        = false;
let hasDiagnosticRelatedInfoCapability = false;

// Cache the last ParseResult per document URI
const parseCache = new Map<string, ParseResult>();

// ── Initialise ───────────────────────────────────────────────────────────────
connection.onInitialize((params: InitializeParams): InitializeResult => {
  const caps = params.capabilities;
  hasConfigurationCapability =
    !!(caps.workspace?.configuration);
  hasDiagnosticRelatedInfoCapability =
    !!(caps.textDocument?.publishDiagnostics?.relatedInformation);

  return {
    capabilities: {
      textDocumentSync:  TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: true, triggerCharacters: [] },
      hoverProvider:      true,
      definitionProvider: true,
      codeActionProvider: { codeActionKinds: [CodeActionKind.QuickFix] },
      semanticTokensProvider: {
        legend: LEGEND,
        full:   true,
        range:  true,
      },
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type, undefined);
  }
});

// ── Settings ─────────────────────────────────────────────────────────────────
interface ToyLangSettings { maxNumberOfProblems: number; }
const defaultSettings: ToyLangSettings = { maxNumberOfProblems: 100 };
let globalSettings = defaultSettings;
const documentSettings = new Map<string, Thenable<ToyLangSettings>>();

function getDocumentSettings(resource: string): Thenable<ToyLangSettings> {
  if (!hasConfigurationCapability) return Promise.resolve(globalSettings);
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration(
      { scopeUri: resource, section: 'toylang' });
    documentSettings.set(resource, result);
  }
  return result;
}

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings =
      (change.settings.toylang as ToyLangSettings) ?? defaultSettings;
  }
  documents.all().forEach(d => validateDocument(d));
});

documents.onDidClose(e => {
  documentSettings.delete(e.document.uri);
  parseCache.delete(e.document.uri);
});

// ── Validation ────────────────────────────────────────────────────────────────
async function validateDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const text = textDocument.getText();
  const result = validate(text);

  // Cache for other handlers
  parseCache.set(textDocument.uri, result);

  const diagnostics: Diagnostic[] = result.diagnostics
    .slice(0, settings.maxNumberOfProblems)
    .map(d => ({
      severity: d.severity === 'error'
        ? DiagnosticSeverity.Error
        : DiagnosticSeverity.Warning,
      range: {
        start: { line: d.span.line, character: d.span.startChar },
        end:   { line: d.span.line, character: d.span.endChar },
      },
      message: d.message,
      source:  'toylang',
      code:    d.code,
    } as Diagnostic));

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.onDidChangeContent(change => validateDocument(change.document));

// ── Completion ────────────────────────────────────────────────────────────────
// Snippet bodies use $1 / $0 tab-stop placeholders.
const KEYWORD_COMPLETIONS: CompletionItem[] = [
  {
    label: 'let',
    kind:  CompletionItemKind.Keyword,
    data:  'kw-let',
    detail: 'Variable definition',
    insertText: 'let ${1:a} = ${2:1}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: {
      kind:  MarkupKind.Markdown,
      value: 'Defines (or overwrites) a variable.\n\n```toylang\nlet a = 1 + 2\n```',
    },
  },
  {
    label: 'print',
    kind:  CompletionItemKind.Keyword,
    data:  'kw-print',
    detail: 'Print statement',
    insertText: 'print ${1:a}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: {
      kind:  MarkupKind.Markdown,
      value: 'Prints the evaluated result of a variable.\n\n```toylang\nprint a\n```',
    },
  },
  {
    label: 'if',
    kind:  CompletionItemKind.Keyword,
    data:  'kw-if',
    detail: 'if / else block',
    insertText:
      'if ${1:a}\nlet ${2:b} = ${3:1}\nelse\nlet ${2:b} = ${4:0}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: {
      kind:  MarkupKind.Markdown,
      value:
        'Single-level conditional.\n\n```toylang\nif a\nlet b = 1\nelse\nlet b = 0\n```',
    },
  },
  {
    label: 'if (no else)',
    kind:  CompletionItemKind.Keyword,
    data:  'kw-if-noelse',
    detail: 'if without else',
    insertText: 'if ${1:a}\nlet ${2:b} = ${3:1}',
    insertTextFormat: InsertTextFormat.Snippet,
    documentation: {
      kind:  MarkupKind.Markdown,
      value: '```toylang\nif a\nlet b = 1\n```',
    },
  },
  {
    label: 'else',
    kind:  CompletionItemKind.Keyword,
    data:  'kw-else',
    detail: 'else branch',
    insertText: 'else\nlet ${1:b} = ${2:0}',
    insertTextFormat: InsertTextFormat.Snippet,
  },
];

connection.onCompletion(
  (params: TextDocumentPositionParams): CompletionItem[] => {
    const doc = documents.get(params.textDocument.uri);
    const varItems: CompletionItem[] = [];

    if (doc) {
      const result = parseCache.get(params.textDocument.uri);
      const names = result
        ? [...result.definitions.keys()]
        : [...doc.getText().matchAll(/\blet\s+([a-zA-Z])\b/g)].map(m => m[1]);

      for (const name of [...new Set(names)]) {
        const inferred = result?.inferredValues.get(name);
        varItems.push({
          label:  name,
          kind:   CompletionItemKind.Variable,
          data:   `var-${name}`,
          detail: inferred ? `= ${inferred}` : 'Variable',
          documentation: inferred
            ? { kind: MarkupKind.Markdown, value: `**${name}** evaluates to \`${inferred}\`` }
            : undefined,
        });
      }
    }

    return [...KEYWORD_COMPLETIONS, ...varItems];
  }
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => item);

// ── Hover ─────────────────────────────────────────────────────────────────────
const KEYWORD_DOCS: Record<string, string> = {
  let:   '**`let`** — Variable definition\n\n**Syntax:** `let <id> = <expr>`\n\n'
       + 'Assigns a value to a single-letter variable. '
       + 'Re-assigning overwrites the previous value.\n\n'
       + '```toylang\nlet a = 1 + 3\n```',
  print: '**`print`** — Output statement\n\n**Syntax:** `print <id>`\n\n'
       + 'Evaluates the variable and writes its formatted value to output. '
       + 'The store is unchanged.',
  if:    '**`if`** — Single-level conditional\n\n'
       + '```\nif <id>\nlet <id> = <expr>\n[else\nlet <id> = <expr>]\n```\n\n'
       + '`0` is falsy; any non-zero digit is truthy. '
       + 'Branches may only contain a single `let` statement. '
       + 'Nesting is forbidden.',
  else:  '**`else`** — Optional else branch for an `if` statement.\n\n'
       + 'Must immediately follow the `if` body.',
};

connection.onHover(params => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const pos  = params.position;
  const line = doc.getText({
    start: { line: pos.line, character: 0 },
    end:   { line: pos.line, character: 200 },
  });

  // Extract the word under the cursor
  const before = line.slice(0, pos.character);
  const after  = line.slice(pos.character);
  const left   = /[a-zA-Z0-9_]*$/.exec(before)?.[0] ?? '';
  const right  = /^[a-zA-Z0-9_]*/.exec(after)?.[0]  ?? '';
  const word   = left + right;
  if (!word) return null;

  // Keyword hover
  if (KEYWORD_DOCS[word]) {
    return { contents: { kind: MarkupKind.Markdown, value: KEYWORD_DOCS[word] } };
  }

  // Variable hover — show inferred value
  const result = parseCache.get(params.textDocument.uri);
  if (result && word.length === 1 && /[a-zA-Z]/.test(word)) {
    const inferred = result.inferredValues.get(word);
    const defSpan  = result.definitions.get(word);
    if (inferred !== undefined) {
      const defNote = defSpan
        ? `  *(defined on line ${defSpan.line + 1})*`
        : '';
      return {
        contents: {
          kind:  MarkupKind.Markdown,
          value: `**\`${word}\`** evaluates to \`${inferred}\`${defNote}`,
        },
      };
    }
    if (defSpan) {
      return {
        contents: {
          kind:  MarkupKind.Markdown,
          value: `**\`${word}\`**  *(defined on line ${defSpan.line + 1})*`,
        },
      };
    }
  }

  return null;
});

// ── Go-to-Definition ─────────────────────────────────────────────────────────
connection.onDefinition(params => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const pos  = params.position;
  const line = doc.getText({
    start: { line: pos.line, character: 0 },
    end:   { line: pos.line, character: 200 },
  });

  const before = line.slice(0, pos.character);
  const after  = line.slice(pos.character);
  const word   = (/[a-zA-Z]*$/.exec(before)?.[0] ?? '') +
                 (/^[a-zA-Z]*/.exec(after)?.[0]  ?? '');

  if (!word || word.length !== 1) return null;

  const result = parseCache.get(params.textDocument.uri);
  const defSpan = result?.definitions.get(word);
  if (!defSpan) return null;

  return Location.create(params.textDocument.uri, {
    start: { line: defSpan.line, character: defSpan.startChar },
    end:   { line: defSpan.line, character: defSpan.endChar },
  });
});

// ── Code Actions ──────────────────────────────────────────────────────────────

/** Build a whole-line replacement TextEdit. */
function replaceLines(
  doc: TextDocument,
  startLine: number,
  endLine: number,
  newText: string
): TextEdit {
  return TextEdit.replace(
    Range.create(
      { line: startLine, character: 0 },
      { line: endLine,   character: doc.getText({
          start: { line: endLine, character: 0 },
          end:   { line: endLine, character: 500 },
        }).length },
    ),
    newText,
  );
}

connection.onCodeAction(params => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return [];

  const actions: CodeAction[] = [];

  for (const diag of params.context.diagnostics) {
    const code = diag.code as string;
    const line = diag.range.start.line;
    const lineText = doc.getText({
      start: { line, character: 0 },
      end:   { line, character: 500 },
    }).trimEnd();

    // ── TL002: Mixed operators → split into two let statements ───────────────
    if (code === 'TL002') {
      // e.g.  let a = 1 + 2 * 3   →  let a = 1 + 2\nlet a = a * 3
      // We split at the first operator-type change.
      const m = lineText.match(
        /^(\s*let\s+([a-zA-Z])\s*=\s*)([0-9](?:\s*\+\s*[0-9])+)(?:\s*\*\s*)([0-9].*)$/ );
      const m2 = lineText.match(
        /^(\s*let\s+([a-zA-Z])s*=\s*)([0-9](?:\s*\*\s*[0-9])+)(?:\s*\+\s*)([0-9].*)$/);
      const prefix = lineText.match(/^(\s*let\s+([a-zA-Z])\s*=\s*)/)?.[0] ?? 'let x = ';
      const varName = lineText.match(/let\s+([a-zA-Z])/)?.[1] ?? 'x';
      if (m || m2) {
        // Extract all digits, split on first operator boundary
        const digits = [...lineText.matchAll(/[0-9]/g)].map(x => x[0]);
        const hasPlusParts = lineText.includes('+');
        const hasStarParts = lineText.includes('*');
        if (hasPlusParts && hasStarParts) {
          const plusDigits = digits.slice(0, Math.ceil(digits.length / 2)).join(' + ');
          const starDigits = digits.slice(Math.ceil(digits.length / 2)).join(' * ');
          const fixed = `let ${varName} = ${plusDigits}\nlet ${varName} = ${starDigits}`;
          const edit: WorkspaceEdit = {
            changes: {
              [params.textDocument.uri]: [replaceLines(doc, line, line, fixed)],
            },
          };
          actions.push({
            title: 'Split into two `let` statements (fix TL002)',
            kind:  CodeActionKind.QuickFix,
            diagnostics: [diag],
            edit,
            isPreferred: true,
          });
        }
      }
    }

    // ── TL001: Undefined variable → insert a let before this line ────────────
    if (code === 'TL001') {
      const varMatch = diag.message.match(/Undefined variable '([a-zA-Z])'/);
      if (varMatch) {
        const varName = varMatch[1];
        const indent  = lineText.match(/^\s*/)?.[0] ?? '';
        const newText = `${indent}let ${varName} = 1\n` + lineText;
        const edit: WorkspaceEdit = {
          changes: {
            [params.textDocument.uri]: [replaceLines(doc, line, line, newText)],
          },
        };
        actions.push({
          title: `Add missing \`let ${varName} = 1\` (fix TL001)`,
          kind:  CodeActionKind.QuickFix,
          diagnostics: [diag],
          edit,
        });
      }
    }

    // ── TL101: Uppercase identifier → rename to lowercase ────────────────────
    if (code === 'TL101') {
      const varMatch = diag.message.match(/Uppercase identifier '([A-Z])'/);
      if (varMatch) {
        const upper = varMatch[1];
        const lower = upper.toLowerCase();
        // Replace all occurrences in the whole document
        const fullText = doc.getText();
        const newFullText = fullText.replace(
          new RegExp(`(?<=(?:let|print|if)\\s+)${upper}\\b`, 'g'), lower);
        actions.push({
          title: `Rename \`${upper}\` to \`${lower}\` (fix TL101)`,
          kind:  CodeActionKind.QuickFix,
          diagnostics: [diag],
          edit: {
            changes: {
              [params.textDocument.uri]: [TextEdit.replace(
                Range.create({ line: 0, character: 0 },
                  doc.positionAt(fullText.length)),
                newFullText,
              )],
            },
          },
          isPreferred: true,
        });
      }
    }

    // ── TL102: Unused variable → remove the let line ─────────────────────────
    if (code === 'TL102') {
      const edit: WorkspaceEdit = {
        changes: {
          [params.textDocument.uri]: [TextEdit.del(
            Range.create(
              { line, character: 0 },
              { line: line + 1, character: 0 },
            ),
          )],
        },
      };
      actions.push({
        title: 'Remove unused variable (fix TL102)',
        kind:  CodeActionKind.QuickFix,
        diagnostics: [diag],
        edit,
      });
    }

    // ── TL013: Trailing operator → remove the trailing op ────────────────────
    if (code === 'TL013') {
      const fixed = lineText.replace(/\s*[+*]\s*$/, '');
      if (fixed !== lineText) {
        actions.push({
          title: 'Remove trailing operator (fix TL013)',
          kind:  CodeActionKind.QuickFix,
          diagnostics: [diag],
          edit: {
            changes: {
              [params.textDocument.uri]: [replaceLines(doc, line, line, fixed)],
            },
          },
          isPreferred: true,
        });
      }
    }

    // ── TL014: Missing equals sign → insert = ────────────────────────────────
    if (code === 'TL014') {
      const fixed = lineText.replace(
        /^(\s*let\s+[a-zA-Z])\s+([0-9+*])/, '$1 = $2');
      if (fixed !== lineText) {
        actions.push({
          title: "Insert missing '=' (fix TL014)",
          kind:  CodeActionKind.QuickFix,
          diagnostics: [diag],
          edit: {
            changes: {
              [params.textDocument.uri]: [replaceLines(doc, line, line, fixed)],
            },
          },
          isPreferred: true,
        });
      }
    }

    // ── TL008: Missing expression → insert placeholder digit ────────────────
    if (code === 'TL008') {
      const fixed = lineText.endsWith('=')
        ? lineText + ' 1'
        : lineText + ' 1';
      actions.push({
        title: "Insert placeholder expression '1' (fix TL008)",
        kind:  CodeActionKind.QuickFix,
        diagnostics: [diag],
        edit: {
          changes: {
            [params.textDocument.uri]: [replaceLines(doc, line, line, fixed)],
          },
        },
        isPreferred: true,
      });
    }
  }

  return actions;
});

// ── Semantic Tokens ───────────────────────────────────────────────────────────

/**
 * Walk every line of the document and emit semantic tokens for:
 *   - keywords  (let, print, if, else)
 *   - variables (single-letter identifiers)
 *   - numbers   (single digits)
 *   - operators (+, *, =)
 *
 * Variables that are definitions (i.e. the IDENT in `let X = ...`) get the
 * `declaration` modifier; variables that have an inferred value also get
 * `readonly` (because ToyLang values are expression-bound, not mutable in a
 * typical sense — this mirrors the spec's store model).
 */
function buildSemanticTokens(doc: TextDocument, uri: string) {
  const builder = new SemanticTokensBuilder();
  const result  = parseCache.get(uri);
  const text    = doc.getText();
  const lines   = text.split('\n');

  const KEYWORDS = new Set(['let', 'print', 'if', 'else']);

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    let i = 0;

    while (i < line.length) {
      const ch = line[i];

      if (ch === ' ') { i++; continue; }

      // Keyword or identifier
      if (/[a-zA-Z]/.test(ch)) {
        let j = i;
        while (j < line.length && /[a-zA-Z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);

        if (KEYWORDS.has(word)) {
          builder.push(li, i, word.length, TT.keyword, 0);
        } else if (word.length === 1) {
          // Determine modifier
          let mod = 0;
          if (result?.definitions.get(word)?.line === li) {
            mod |= TM.declaration;
          }
          if (result?.inferredValues.has(word)) {
            mod |= TM.readonly;
          }
          builder.push(li, i, 1, TT.variable, mod);
        }
        i = j;
        continue;
      }

      // Single digit
      if (/[0-9]/.test(ch)) {
        builder.push(li, i, 1, TT.number, 0);
        i++;
        continue;
      }

      // Operators
      if (ch === '+' || ch === '*' || ch === '=') {
        builder.push(li, i, 1, TT.operator, 0);
        i++;
        continue;
      }

      i++;
    }
  }

  return builder.build();
}

connection.languages.semanticTokens.on(params => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return { data: [] };
  return buildSemanticTokens(doc, params.textDocument.uri);
});

connection.languages.semanticTokens.onRange(params => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return { data: [] };
  // Build full and let VS Code slice; simpler than re-implementing range logic.
  return buildSemanticTokens(doc, params.textDocument.uri);
});

// ── Lifecycle ────────────────────────────────────────────────────────────────
documents.listen(connection);
connection.listen();
