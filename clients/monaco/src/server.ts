
import path from 'path'
import express from 'express'

process.on('uncaughtException', function (err: any) {
    console.error('Uncaught Exception: ', err.toString());
    if (err.stack) {
        console.error(err.stack);
    }
});

// create the express application
const app = express();
// server the static content, i.e. index.html
app.use(express.static(__dirname));
app.use(express.static( path.resolve( __dirname, './../assets' ) ) );
// start the server
app.listen(4005);
