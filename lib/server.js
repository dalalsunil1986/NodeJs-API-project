/*
 * This file turns on the server for API
 */

// Dependencies
const http = require('http');
const https = require('https');
const url = require('url');
const stringDecoder = require('string_decoder').StringDecoder;
const config = require('./config');
const fs = require('fs');
const handlers  = require('./handlers');
const helpers = require('./helpers');
const path = require('path');

// server container
const server = {};

// Create http server
server.httpServer = http.createServer( (req,res) => {
    server.unifiedServer(req,res);
});

// Create https server
server.security = {
    'key' : fs.readFileSync(path.join(__dirname,'/../certs/key.pem')),
    'cert' : fs.readFileSync(path.join(__dirname,'/../certs/cert.pem'))
};
server.httpsServer = https.createServer(server.security, (res,req) => {
    server.unifiedServer(req,res);
});

// Server logic for both http and https types
server.unifiedServer = (req,res) => {
    // Get and parse URL
    const parsedUrl = url.parse(req.url,true);

    // Get the path
    const path = parsedUrl.pathname;
    const trimmedPath = path.replace(/^\/+|\/+$/g,'');

    // Get the query string object
    const parsedQueryObj = parsedUrl.query;

    // Get the method
    const method = req.method.toLowerCase();

    // Get headers
    const header = req.headers;

    // Get data, if any
    const decoder = new stringDecoder('utf-8');
    let buffer = '';
    req.on('data', async (data) => {
        buffer += await decoder.write(data);
    });
    req.on('end', async() => {
        buffer += await decoder.end();

        // Chose a handler the request should go to
        const chosenHandler = typeof(server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;

        // construct the data object
        const data = await {
            'trimmedPath' : trimmedPath,
            'queryString' : parsedQueryObj,
            'method' : method,
            'headers' : header,
            'payload' : helpers.parseToObject(buffer)
        };

        // route the request to the handler
        chosenHandler(data, async(status,payload) => {
            status = await typeof(status) === 'number' ? status : 200;
            payload = await typeof(payload) === 'object' ? payload : {};
            let payloadString = await JSON.stringify(payload);

            // send the respond
            res.setHeader('Content-Type','application/json');
            res.writeHead(status);
            res.end(payloadString);


            // Log the response
            console.log(`Returning this response: ${status}, ${payloadString}`);
        });
    });
};

// Define a request router
server.router = {
    'ping' : handlers.ping,
    'users' : handlers.users,
    'token' : handlers.token,
    'check' : handlers.check
};

// Define the init function
server.init = () => {
    // Start http server
    server.httpServer.listen(config.httpPort, () => {
        console.log(`Server is now listening to the port ${config.httpPort} in ${config.name.toLowerCase()} mode.`);
    });

    // Start https server
    server.httpsServer.listen(config.httpsPort, () => {
        console.log(`Server is now listening to the port ${config.httpsPort} in ${config.name.toLowerCase()} mode.`);
    });
};

// export the module
module.exports = server;