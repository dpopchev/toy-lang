import * as path from 'path';
import { workspace, ExtensionContext } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  const serverModule = context.asAbsolutePath(
    path.join('..', 'server', 'out', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      // --inspect=6009 lets VS Code attach a debugger to the server process
      options: { execArgv: ['--nolazy', '--inspect=6009'] },
    },
  };

  const clientOptions: LanguageClientOptions = {
    // Activate only for .tl files
    documentSelector: [{ scheme: 'file', language: 'toylang' }],
    synchronize: {
      // Watch for changes to workspace settings
      fileEvents: workspace.createFileSystemWatcher('**/.toylangrc'),
    },
  };

  client = new LanguageClient(
    'toylang',
    'ToyLang Language Server',
    serverOptions,
    clientOptions
  );

  await client.start();
}

export async function deactivate(): Promise<void> {
  await client?.dispose();
  client = undefined;
}
