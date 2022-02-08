
/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import ws from 'ws'
import url from 'url'
import path from 'path'
import express from 'express'
import type { Socket } from 'net'
import type { IncomingMessage } from 'http'
import rpcServer from '@codingame/monaco-jsonrpc/lib/server'
import * as rpc from '@codingame/monaco-jsonrpc'
import * as lsp from 'vscode-languageserver'
import { start } from './server'

function launch( socket: rpc.IWebSocket ){
	const 
	reader = new rpc.WebSocketMessageReader( socket ),
	writer = new rpc.WebSocketMessageWriter( socket ),
	asExternalProccess = process.argv.findIndex( value => value === '--external' ) !== -1

	// Start the language server inside the current process
	if( !asExternalProccess ){
		start( reader, writer )
		return
	}

	// Start the language server as an external process
	const 
	extJsonServerPath = path.resolve( __dirname, 'external.process.js' ),
	socketConnection = rpcServer.createConnection( reader, writer, () => socket.dispose() ),
	serverConnection = rpcServer.createServerProcess( 'JSON', 'node', [ extJsonServerPath ] )

	rpcServer.forward( socketConnection, serverConnection, message => {

		if( rpc.isRequestMessage( message ) )
			if( message.method === lsp.InitializeRequest.type.method ){
				const initializeParams = message.params as lsp.InitializeParams
				initializeParams.processId = process.pid
			}
		
		return message
	})
}

process.on( 'uncaughtException', ( error: any ) => {
	console.error( 'Uncaught Exception: ', error.toString() )
	if( error.stack ) console.error( error.stack )
})

const app = express()
app.use( express.static( __dirname ) )

// start the server
const
server = app.listen( 3000 ),
// create the web socket
wss = new ws.Server({ noServer: true, perMessageDeflate: false })

server.on( 'upgrade', ( request: IncomingMessage, socket: Socket, head: Buffer ) => {
	const pathname = request.url ? url.parse( request.url ).pathname : undefined

	if( pathname === '/marko-lsp' )
		wss.handleUpgrade( request, socket, head, webSocket => {
			const socket: rpc.IWebSocket = {
				send: content => webSocket.send( content, error => { if( error ) console.log( error ) } ),
				onMessage: cb => webSocket.on( 'message', cb ),
				onError: cb => webSocket.on( 'error', cb ),
				onClose: cb => webSocket.on( 'close', cb ),
				dispose: () => webSocket.close()
			}

			// Launch the server when the web socket is opened
			webSocket.readyState === webSocket.OPEN ?
											launch( socket )
											: webSocket.on('open', () => launch( socket ) )
		})
})