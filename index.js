/*
 * This is the primary file for API
 */

// Dependencies
const server = require('./lib/server');
const workers = require('./lib/workers');

// Container
const app = {};

// Init function
app.init = () => {
    server.init();
    workers.init();
};

// Execute the init function
app.init();

// Export the container
module.exports = app;
