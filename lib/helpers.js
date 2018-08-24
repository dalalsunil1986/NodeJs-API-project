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

// Generate random string
helpers.randomString = (length) => {
    if(typeof(length) === 'number' && length > 0) {
        const possibleChars = 'qawsedrftgyhujikolpmbnvcxz09876543210';
        let str = '';
        for(let i=0; i<length; i++){
            let randomChar = possibleChars.charAt(Math.floor(Math.random() * possibleChars.length));
            str += randomChar;
        }
        return str;
    } else {
        return false;
    }
};


// Export the module
module.exports = helpers;