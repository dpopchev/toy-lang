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
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  MarkupKind,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { validate } from './parser';

// ── Connection ───────────────────────────────────────────────────────────────
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments<TextDocument>(TextDocument);

let hasConfigurationCapability = false;
let hasDiagnosticRelatedInfoCapability = false;

// ── Initialise ───────────────────────────────────────────────────────────────
connection.onInitialize((params: InitializeParams): InitializeResult => {
  const caps = params.capabilities;
  hasConfigurationCapability = !!(caps.workspace?.configuration);
  hasDiagnosticRelatedInfoCapability = !!
    caps.textDocument?.publishDiagnostics?.relatedInformation;

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: { resolveProvider: true },
      hoverProvider: true,
    },
  };
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
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
    result = connection.workspace.getConfiguration({ scopeUri: resource, section: 'toylang' });
    documentSettings.set(resource, result);
  }
  return result;
}

connection.onDidChangeConfiguration(change => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = (change.settings.toylang as ToyLangSettings) ?? defaultSettings;
  }
  documents.all().forEach(d => validateDocument(d));
});

documents.onDidClose(e => documentSettings.delete(e.document.uri));

// ── Validation ────────────────────────────────────────────────────────────────
async function validateDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const text = textDocument.getText();
  const toyDiags = validate(text);

  const diagnostics: Diagnostic[] = toyDiags
    .slice(0, settings.maxNumberOfProblems)
    .map(d => {
      const diag: Diagnostic = {
        severity: d.severity === 'error'
          ? DiagnosticSeverity.Error
          : DiagnosticSeverity.Warning,
        range: {
          start: { line: d.span.line, character: d.span.startChar },
          end:   { line: d.span.line, character: d.span.endChar },
        },
        message: d.message,
        source: 'toylang',
        code: d.code,
      };
      return diag;
    });

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

documents.onDidChangeContent(change => validateDocument(change.document));

// ── Completion ────────────────────────────────────────────────────────────────
// Keywords and a simple variable-name collector
const KEYWORDS: CompletionItem[] = [
  { label: 'let',   kind: CompletionItemKind.Keyword, data: 'kw-let',
    detail: 'Variable definition', documentation: { kind: MarkupKind.Markdown,
      value: 'Defines a variable.\n\n```toylang\nlet a = 3\n```' } },
  { label: 'print', kind: CompletionItemKind.Keyword, data: 'kw-print',
    detail: 'Print statement',
    documentation: { kind: MarkupKind.Markdown, value: 'Prints a variable.\n\n```toylang\nprint a\n```' } },
  { label: 'if',    kind: CompletionItemKind.Keyword, data: 'kw-if',
    detail: 'Conditional',
    documentation: { kind: MarkupKind.Markdown, value: 'Single-level if statement.\n\n```toylang\nif a\nlet b = 1\nelse\nlet b = 0\n```' } },
  { label: 'else',  kind: CompletionItemKind.Keyword, data: 'kw-else',
    detail: 'Else branch' },
];

connection.onCompletion(
  (params: TextDocumentPositionParams): CompletionItem[] => {
    const doc = documents.get(params.textDocument.uri);
    const varItems: CompletionItem[] = [];

    if (doc) {
      const text = doc.getText();
      // Collect all single-letter identifiers already in the document
      const seen = new Set<string>();
      for (const m of text.matchAll(/\blet\s+([a-zA-Z])\b/g)) {
        const name = m[1];
        if (!seen.has(name)) {
          seen.add(name);
          varItems.push({
            label: name,
            kind: CompletionItemKind.Variable,
            data: `var-${name}`,
            detail: 'Variable',
          });
        }
      }
    }

    return [...KEYWORDS, ...varItems];
  }
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => item);

// ── Hover ─────────────────────────────────────────────────────────────────────
const KEYWORD_DOCS: Record<string, string> = {
  let:   'Defines a variable.\n\n**Syntax:** `let <id> = <expr>`\n\nIdentifiers are a single ASCII letter.',
  print: 'Prints the evaluated result of a variable.\n\n**Syntax:** `print <id>`',
  if:    'Single-level conditional.\n\n**Syntax:**\n```\nif <id>\nlet <id> = <expr>\n[else\nlet <id> = <expr>]\n```',
  else:  'Optional else branch for an `if` statement.',
};

connection.onHover(params => {
  const doc = documents.get(params.textDocument.uri);
  if (!doc) return null;

  const pos = params.position;
  const line = doc.getText({
    start: { line: pos.line, character: 0 },
    end:   { line: pos.line, character: 1000 },
  });

  const wordMatch = line
    .slice(0, pos.character + 1)
    .match(/[a-zA-Z]+$/);
  if (!wordMatch) return null;
  const word = wordMatch[0].slice(
    Math.max(0, wordMatch[0].length - (pos.character - (line.indexOf(wordMatch[0])))),
  );

  // Try full word from position
  const fullMatch = /[a-zA-Z]+/.exec(line.slice(pos.character - (wordMatch[0].length)));
  const hoverWord = fullMatch ? line.slice(
    pos.character - wordMatch[0].length + (fullMatch.index ?? 0),
    pos.character - wordMatch[0].length + (fullMatch.index ?? 0) + fullMatch[0].length,
  ) : word;

  if (KEYWORD_DOCS[hoverWord]) {
    return {
      contents: { kind: MarkupKind.Markdown, value: KEYWORD_DOCS[hoverWord] },
    };
  }
  return null;
});

// ── Lifecycle ────────────────────────────────────────────────────────────────
documents.listen(connection);
connection.listen();
