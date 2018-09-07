/*
 * this file contains the background workers tasks
 */

// Dependencies
const fs = require('fs');
const _data = require('./data');
const path = require('path');
const helpers = require('./helpers');
const http = require('http');
const https = require('https');
const url = require('url');

// Worker container
const worker = {};

// Gather all checks
worker.gatherAllChecks = () => {
    // list the checks
    _data.list('checks', (err, checks) => {
        if(!err && checks && checks.length > 0){
            checks.forEach((check) => {
                _data.read('checks',check,(err, originalCheck) => {
                    if(!err && originalCheck){
                        worker.validateCheck(originalCheck);
                    } else {
                        console.log('Error: Cannot read one of the checks');
                    }
                });
            });
        } else {
            console.log('Error: could not find any checks to process');
        }
    });
};

// Validate check data
worker.validateCheck = (originalCheck) => {
    originalCheck = typeof(originalCheck) === 'object' && originalCheck !== null ? originalCheck : {};
    originalCheck.checkID = typeof(originalCheck.checkID) === 'string' && originalCheck.checkID.length === 20 ? originalCheck.checkID : false;
    originalCheck.userPhone = typeof(originalCheck.userPhone) === 'string' &&  originalCheck.userPhone.length === 10 ?  originalCheck.userPhone : false;
    originalCheck.protocol =  typeof(originalCheck.protocol) === 'string' && ['http', 'https'].indexOf(originalCheck.protocol) > -1 ? originalCheck.protocol : false;
    originalCheck.url = typeof(originalCheck.url) === 'string' &&  originalCheck.url.length > 0 ?  originalCheck.url : false;
    originalCheck.method =  typeof(originalCheck.method) === 'string' && ['post', 'put', 'get', 'delete'].indexOf(originalCheck.method) > -1 ? originalCheck.method : false;
    originalCheck.successCode = typeof(originalCheck.successCode) === 'object' && originalCheck.successCode instanceof Array && originalCheck.successCode.length > 0 ?  originalCheck.successCode : false;
    originalCheck.timeout = typeof(originalCheck.timeout) === 'number' && originalCheck.timeout % 1 === 0 && 1 >= originalCheck.timeout <= 5 ? originalCheck.timeout : false;

    // Set the new keys
    originalCheck.state = typeof(originalCheck.state) === 'string' && ['up', 'down'].indexOf(originalCheck.state) > -1 ? originalCheck.state : 'down';
    originalCheck.lastCheck = typeof(originalCheck.lastCheck) === 'number' && originalCheck.lastCheck > 0 ? originalCheck.lastCheck : false;

    // validate the data
    if(originalCheck.checkID && originalCheck.userPhone && originalCheck.protocol && originalCheck.url && originalCheck.method && originalCheck.successCode && originalCheck.timeout){
        worker.performCheck(originalCheck)
    } else {
        console.log('Error : one check is not properly formatted')
    }
};

// Perform the check and send the outcome of the process to the next job
worker.performCheck = (originalCheck) => {
    // prepare initial outcome
    let checkOutcome = {
        'error' : false,
        'responseCode' : false
    };
    // Mark the outcome as not sent yet
    let outcomeSent = false;

    // Parse the hostname and the path out of the original check data
    const parsedUrl = url.parse(`${originalCheck.protocol}://${originalCheck.url}`, true);
    const hostName = parsedUrl.hostname;
    const path = parsedUrl.path;  // we are using path to get the queryString

    // Construct the request
    const requestDetails = {
        'protocol' : originalCheck.protocol+':',
        'hostname' : hostName,
        'method' : originalCheck.method.toUpperCase(),
        'path' : path,
        'timeout' : originalCheck.timeout * 1000
    };

    // Instantiate the request object
        // First check which protocol is in use
    const chosenModule = originalCheck.protocol === 'http' ? http : https;
    const req = chosenModule.request(requestDetails, (res) => {
        // check the status code
        const status = res.statusCode;

        // update the check outcome
        checkOutcome.responseCode = status;
        // check if the outcome has sent or not yet
        if(!outcomeSent){
            worker.processCheckOutcome(originalCheck, checkOutcome);
            outcomeSent = true;
        }
    });
    // Catch error to prevent the application from stopping
    req.on('error', (e) => {
        // Update the check out come
        checkOutcome.error = {
            'error' : true,
            'value' : e
        };
        if(!outcomeSent){
            worker.processCheckOutcome(originalCheck, checkOutcome);
            outcomeSent = true;
        }
    });

    // Throw the timeout error
    req.on('timeout', (e) => {
        checkOutcome = {
            'error' : true,
            'value' : 'timeout'
        };
        if(!outcomeSent){
            worker.processCheckOutcome(originalCheck, checkOutcome);
            outcomeSent = true;
        }
    });
    // End the request
    req.end();
};

// process the check outcome and update the check data as needed
worker.processCheckOutcome = (originalCheck, checkOutcome) => {
    // Decide if the check is up or down
    const state = !checkOutcome.error && checkOutcome.responseCode && originalCheck.successCode.indexOf(checkOutcome.responseCode) > -1 ? 'up' : 'down';
    // Decide if the state has been changed from being up before
    const alertWarranted = !!(originalCheck.lastCheck && originalCheck.state !== state)
    // Update the check data
    const newCheckData = originalCheck;
    newCheckData.state = state;
    newCheckData.lastCheck = Date.now();

    // Save the new data
    _data.update('checks', newCheckData.checkID, newCheckData, (err) => {
        if(!err){
            // send the new data to the next process
            if(alertWarranted){
                worker.alertStatusChange(newCheckData);
            } else {
                console.log('Check outcome has not changed no alert is needed');
            }
        } else {
            console.log('Error trying to save the updates to one of the checks');
        }
    });
};

// Alert user that the status has changed
worker.alertStatusChange = (newCheckData) => {
    // craft the message
    const msg = `Alert: Your check for ${newCheckData.method.toUpperCase()} ${newCheckData.protocol}://${newCheckData.url} is currently ${newCheckData.state}`;
    helpers.sendTwilioSms(newCheckData.userPhone, msg, (err) => {
        if(!err) {
            console.log('Success: user has been alerted via SMS');
        } else {
            console.log('Error: could not sent the SMS alert to the user.');
        }
    });
};

// Loop through checks every 1 second
worker.loop = () => {
    setInterval(() => {worker.gatherAllChecks()}, 1000 * 60)
};

// Worker start function
worker.init = () => {
    // First gather all the checks
    worker.gatherAllChecks();
    // Then loop through the checks every 1 second
    worker.loop();
};


// export
module.exports = worker;