/*
 * Tasks helpers
*/


// Dependencies
const crypto = require('crypto');
const config = require('./config');
const querystring = require('querystring');
const https = require('https');

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

// Send an SMS via Twilio
helpers.sendTwilioSms = (phone, msg, callback) => {
    // Validate parameters
    phone = typeof(phone) === 'string' && phone.trim().length === 10 ? phone.trim() : false;
    msg = typeof(msg) === 'string' && msg.trim().length <= 1600 ? msg.trim() : false;
    if(phone && msg ){
        // Configure the request payload for Twilio
        const payload = {
            'From' : config.twilio.fromPhone,
            'To' : `+1${phone}`,
            'Body' : msg
        };
        const stringPayload = querystring.stringify(payload);
        // Configure the request details
        // to place an outbound msg you need to craft a post request
        const requestDetail = {
            'protocol' : 'https:',
            'hostname' : 'api.twilio.com',
            'method' : 'POST',
            'path' : `/2010-04-01/Accounts/${config.twilio.SID}/Messages.json`,
            'auth' : `${config.twilio.SID}:${config.twilio.authToken}`,
            'headers' : {
                'Content-Type' : 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(stringPayload)
            }
        };
        // sending the request object
        const req = https.request(requestDetail, (res) => {
            const status = res.statusCode;
            if(status === 200 || status === 201){
                callback(false);
            } else {
                callback(`status code returned as : ${status}`);
            }
        });
        // Catch the error to avoid application being stopped
        req.on('error', (err) => {
            callback(err);
        });

        // Add the payload
        req.write(stringPayload);
        // End the request
        req.end();

    } else  {
        callback('Given parameters are not valid')
    }
};

// Export the module
module.exports = helpers;