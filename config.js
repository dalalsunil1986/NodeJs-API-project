/*
 *  Create an export configuration variables
 *
 */

// Environment container
const environments =  {};

// Staging (default)
environments.stage = {
    'httpPort' : 3000,
    'httpsPort' : 3001,
    'name' : 'STAGE'
};

// Production
environments.prod = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'name' : 'PROD'
};

// Determine which Environment is being chosen
const currentEnv = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if the chosen Environment is a valid environment if not default to staging environment
const exportedEnv =  typeof(environments[currentEnv]) === 'object' ? environments[currentEnv] : environments.stage;

// Exporting the module
module.exports = exportedEnv;