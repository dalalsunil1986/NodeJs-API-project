/*
 * this contains the request handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');

// Container
const handlers = {};

// Users handler
handlers.users = (data, callback) =>{
    const AcceptableMethods = ['post', 'get', 'put', 'delete'];
    if(AcceptableMethods.indexOf(data.method) > -1){
        handlers._users[data.method](data, callback);
    } else {
        callback(405,{'Error' : 'Method Not Acceptable'});
    }
};

// _users sub container
handlers._users = {};

// Users Post
handlers._users .post = (data, callback) => {
    // check required fields
    let firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    let tosAgreement = typeof(data.payload.tosAgreement) === 'boolean' && data.payload.tosAgreement === true ? 'true' : false;

    if(firstName && lastName && phone && password && tosAgreement){
        // check if the user does not already exist
        _data.read('users', phone, (err, data) => {
            if(err){
                // Hash the password
                let hashPass = helpers.hash(password);
                if(hashPass){
                    // create the user object
                    const userObj = {
                    'firstName' : firstName,
                    'lastName' : lastName,
                    'phone' : phone,
                    'password' : hashPass,
                    tosAgreement : true
                    };
                    // Store the object
                    _data.create('users', phone, userObj, (err) => {
                        if(!err) {
                        callback(200);
                        } else {
                            console.log(err);
                            callback(500, {'Error' : 'could not create the user'});
                        }
                });
                } else {
                    callback(500, {'Error' : 'hashing the password'});
                }
            } else {
                callback(500, {'Error': 'user already exist'});
            }
        });
    } else {
        callback(500, {'Error' : 'Missing required field'});
    }
 };

// Users get
handlers._users.get = (data, callback) => {
    // Check the validity of the phone number
    let phone = typeof(data.queryString.phone) === 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone.trim() : false;
    if(phone){
        _data.read('users', phone, (err, data) => {
            if(!err && data) {
                // remove the password
                delete data.password;
                callback(200, data);
            } else {
                console.log(err);
                callback(404, {'Error' : 'User not found'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Users put
handlers._users.put = (data, callback) => {
    // phone field is required but the other fields are optional only one of them is required
    let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    let firstName = typeof(data.payload.firstName) === 'string' && data.payload.firstName.trim().length > 0 ? data.payload.firstName.trim() : false;
    let lastName = typeof(data.payload.lastName) === 'string' && data.payload.lastName.trim().length > 0 ? data.payload.lastName.trim() : false;
    let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;

    if(phone && (firstName || lastName || password)){
        // lookup the user by phone
        _data.read('users',phone, (err, userData) => {
            if(!err && userData){
                if(firstName){
                    userData.firstName = firstName;
                } if(lastName){
                    userData.lastName = lastName;
                } if(password){
                    userData.password = helpers.hash(password);
                }
                // Store the new data
                _data.update('users', phone, userData, (err) => {
                    if(!err){
                        callback(200);
                    } else {
                        console.log(err);
                        callback(500, {'Error' : 'updating the user data'});
                    }
                });
            } else {
                console.log(err);
                callback(400, {'Error' : 'user does not exist'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required fields'});
    }
};

// Users delete
handlers._users.delete = (data, callback) => {
    // only an authenticated user can delete user files
    let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    if(phone){
        _data.read('users', phone, (err, data) => {
            if(!err && data){
              _data.delete('users', phone, (err) => {
                  if(!err){
                      callback(200);
                  } else {
                      console.log(err);
                      callback(500, {'Error' : 'could not delete this user'});
                  }
              });
            } else {
                callback(404, {'Error' : 'User does not exist'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Not found
handlers.notFound = (data, callback) => {
    callback(404);
};

// Ping handler
handlers.ping = (data, callback) => {
    callback(200, {'status' : 'up'});
};

// module Export
module.exports = handlers;