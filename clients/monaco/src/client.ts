/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { loadWASM } from 'onigasm'
import { Registry, IGrammarDefinition } from 'monaco-textmate'
import { wireTmGrammars } from 'monaco-editor-textmate'
import { listen } from '@codingame/monaco-jsonrpc';
import * as monaco from 'monaco-editor'
import {
    MonacoLanguageClient, MessageConnection, CloseAction, ErrorAction,
    MonacoServices, createConnection
} from '@codingame/monaco-languageclient';
import configuration from './marko.configuration.json'
const normalizeUrl = require('normalize-url');
const ReconnectingWebSocket = require('reconnecting-websocket');

( async () => {

    function createLanguageClient(connection: MessageConnection): MonacoLanguageClient {
        return new MonacoLanguageClient({
            name: "Monaco Language Client",
            clientOptions: {
                // use a language id as a document selector
                documentSelector: ['marko'],
                // disable the default error handler
                errorHandler: {
                    error: () => ErrorAction.Continue,
                    closed: () => CloseAction.DoNotRestart
                }
            },
            // create a language client connection from the JSON RPC connection on demand
            connectionProvider: {
                get: (errorHandler, closeHandler) => {
                    return Promise.resolve(createConnection(connection, errorHandler, closeHandler))
                }
            }
        });
    }

    function createUrl(path: string): string {
        const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
        return normalizeUrl(`${protocol}://localhost:3000/${path}`);
    }

    function createWebSocket(url: string): WebSocket {
        const socketOptions = {
            maxReconnectionDelay: 10000,
            minReconnectionDelay: 1000,
            reconnectionDelayGrowFactor: 1.3,
            connectionTimeout: 10000,
            maxRetries: Infinity,
            debug: false
        };
        return new ReconnectingWebSocket(url, [], socketOptions);
    }

    await loadWASM('/onigasm.wasm')
    
    // register Monaco languages
    monaco.languages.register({
        id: 'marko',
        extensions: ['.marko'],
        aliases: ['Marko', 'marko'],
        mimetypes: ['text/marko']
    });
    monaco.languages.setLanguageConfiguration( 'marko', configuration as any );

    // create Monaco editor
    const 
    value = `class {
        onCreate(){ this.state = { count: 0 } }
        increment(){ this.state.count++ }
    }

    <div>
        <h1>\${state.count}</h1>
        <button on-click('increment')>Count</button>
    </div>`,
    list: { [index: string]: any } = {
        'source.marko': {
            id: 'marko',
            extensions: ['.marko'],
            tmFileName: 'marko.tmLanguage',
            format: 'plist'
        },
        'source.css': {
            id: 'css',
            extensions: ['.css'],
            tmFileName: 'css.tmLanguage.json',
            format: 'json'
        },
        'source.css.less': {
            id: 'less',
            extensions: ['.less'],
            tmFileName: 'less.tmLanguage.json',
            format: 'json'
        },
        'source.css.scss': {
            id: 'scss',
            extensions: ['.scss'],
            tmFileName: 'scss.tmLanguage.json',
            format: 'json'
        },
        'source.sassdoc': {
            id: 'sassdoc',
            extensions: ['.sass'],
            tmFileName: 'sassdoc.tmLanguage.json',
            format: 'json'
        },
        'source.js': {
            id: 'javascript',
            extensions: ['.js'],
            tmFileName: 'javascript.tmLanguage.json',
            format: 'json'
        }
    }

    try {
        const registry = new Registry({
            getGrammarDefinition: async ( scopeName: string ): Promise<IGrammarDefinition> => {
                const grammar = list[ scopeName ]
                if( !grammar ) throw new Error(`Undefined ${scopeName} grammar`)
                
                return {
                    format: grammar.format,
                    content: await ( await fetch(`/${grammar.tmFileName}`) ).text() // Raw text: plist
                }
            }
        })

        const grammars = new Map()
        Object.entries( list ).map( ([ scopeName, { id, extensions } ]) => {
            grammars.set( id, scopeName )
            monaco.languages.register({ id, extensions })
        })
            
        const editor = monaco.editor.create(document.getElementById("container")!, {
            model: monaco.editor.createModel(value, 'marko', monaco.Uri.parse('inmemory://model.marko')),
            glyphMargin: true,
            lightbulb: {
                enabled: true
            }
        })

        await wireTmGrammars( monaco, registry, grammars, editor )
    }
    catch( error ){
        console.log( error )
    }

    // install Monaco language client services
    MonacoServices.install(monaco);

    // create the web socket
    const url = createUrl('/marko-lsp')
    const webSocket = createWebSocket(url);
    // listen when the web socket is opened
    listen({
        webSocket,
        onConnection: connection => {
            // create and start the language client
            const languageClient = createLanguageClient(connection);
            const disposable = languageClient.start();
            connection.onClose(() => disposable.dispose());
        }
    });
} )()
