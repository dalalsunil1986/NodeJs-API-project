/*
 * Tasks helpers
*/


// Dependencies
const crypto = require('crypto');
const config = require('.././config')

// Container
const helpers = {};

// Hash function
helpers.hash = (str) => {
    if(typeof(str) === 'string' && str.length > 0){
        const hash =  crypto.createHmac('sha256', config.hashSecret).update(str).digest('hex');
        return hash;
    } else {
        return false;
    }
};

// Parse to object
helpers.parseToObject = (str) => {
    try{
        const obj = JSON.parse(str);
        return obj;
    } catch(e) {
        console.log('Error parsing the Json to object');
        return {};
    }
};


// Export the module
module.exports = helpers;