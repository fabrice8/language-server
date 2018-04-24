/* --------------------------------------------------------------------------------------------
* Copyright (c) Microsoft Corporation. All rights reserved.
* Licensed under the MIT License. See License.txt in the project root for license information.

Modifications Copyright 2018 eBay Inc.
Author/Developer: Diego Berrocal

Use of this source code is governed by an MIT-style
license that can be found in the LICENSE file or at
https://opensource.org/licenses/MIT.
* ------------------------------------------------------------------------------------------ */
import * as path from 'path';

import { workspace, ExtensionContext } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient';

export function activate(context: ExtensionContext) {

  // The server is implemented in node
  let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));
  // The debug options for the server
  let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  let serverOptions: ServerOptions = {
    run : { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
  }

  // Options to control the language client
  let clientOptions: LanguageClientOptions = {
    // Register the server for marko text documents
    documentSelector: [{scheme: 'file', language: 'marko'}],
    synchronize: {
      // Synchronize the setting section 'languageServerExample' to the server
      configurationSection: 'marko',
      // Notify the server about file changes to '.clientrc files contain in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
    }
  }

  // Create the language client and start the client.
  let disposable = new LanguageClient('marko', 'Marko Language Server', serverOptions, clientOptions).start();

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);
}
