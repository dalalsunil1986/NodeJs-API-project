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
    'name' : 'STAGE',
    'hashSecret' : 'stageSecret',
    'maxChecks' : 5,
    'twilio' : {
        'SID' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone' : '+15005550006'
    }
};

// Production
environments.prod = {
    'httpPort' : 5000,
    'httpsPort' : 5001,
    'name' : 'PROD',
    'hashSecret' : 'prodSecret',
    'maxChecks' : 5,
    'twilio' : {
        'SID' : 'ACb32d411ad7fe886aac54c665d25e5c5d',
        'authToken' : '9455e3eb3109edc12e3d8c92768f7a67',
        'fromPhone' : '+15005550006'
    }
};

// Determine which Environment is being chosen
const currentEnv = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

// Check if the chosen Environment is a valid environment if not default to staging environment
const exportedEnv =  typeof(environments[currentEnv]) === 'object' ? environments[currentEnv] : environments.stage;

// Exporting the module
module.exports = exportedEnv;