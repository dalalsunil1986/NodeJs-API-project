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
    const phone = typeof(data.queryString.phone) === 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone.trim() : false;
    if(phone) {
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // verify the token
        handlers._token.verifyToken(token, phone, (validToken) => {
            if (validToken) {
                // Lookup the user
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        // remove the password
                        delete data.password;
                        callback(200, data);
                    } else {
                        console.log(err);
                        callback(404, {'Error': 'User not found'});
                    }
                });
            } else {
                callback(403,{'Error' : 'Missing the token in headers or invalid token'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
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
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // verify the token
        handlers._token.verifyToken(token, phone, (validToken) => {
            if (validToken) {
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
                    callback(403,{'Error' : 'Missing the token in headers or invalid token'})
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
    if(phone) {

        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // verify the token
        handlers._token.verifyToken(token, phone, (validToken) => {
            if (validToken) {
                _data.read('users', phone, (err, data) => {
                    if (!err && data) {
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                callback(200);
                            } else {
                                console.log(err);
                                callback(500, {'Error': 'could not delete this user'});
                            }
                        });
                    }
            else {
                callback(404, {'Error': 'User does not exist'});
            } }); } else {
                callback(403, {'Error': 'Missing the token in headers or invalid token'})
            } }); } else {
                callback(400, {'Error': 'Missing required field'});
            }
};

// Token handlers
handlers.token = (data, callback) => {
    let acceptableMethod = ['post', 'get', 'put', 'delete'];
    if(acceptableMethod.indexOf(data.method) > -1){
        handlers._token[data.method](data, callback);
    } else {
        callback(405);
    }
};

// token sub container
handlers._token = {};

// Token post
// required field is phone and password
handlers._token.post = (data, callback) => {
    let phone = typeof(data.payload.phone) === 'string' && data.payload.phone.trim().length === 10 ? data.payload.phone.trim() : false;
    let password = typeof(data.payload.password) === 'string' && data.payload.password.trim().length > 0 ? data.payload.password.trim() : false;
    if(phone && password){
        // lookup the user who maths this phone
        _data.read('users', phone, (err, userData) => {
            if(!err && userData){
                //Hash provided password and validate it
                let hashPassword = helpers.hash(password);
                if(hashPassword === userData.password){
                    // If password is valid create a new token with an  expiration date of one hour
                    const tokenId = helpers.randomString(20);
                    const expiration = Date.now() + 60 * 60 * 1000;
                    const tokenObj = {
                        'tokenID' : tokenId,
                        'expiration' : expiration,
                        'phone' : phone
                    };
                    // store the token
                    _data.create('tokens', tokenId, tokenObj, (err) => {
                        if(!err){
                            callback(200, tokenObj);
                        } else {
                            console.log(err);
                            callback(500, {'Error' : 'Error storing the token'});
                        }
                    });

                } else {
                    callback(400, {'Error' : 'Invalid Password'});
                }
            } else {
                callback(400, {'Error' : 'User does not exist'});
            }
        })
    } else {
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Token get
handlers._token.get = (data, callback) => {
    let ID = typeof(data.queryString.ID) === 'string' && data.queryString.ID.trim().length === 20 ? data.queryString.ID.trim() : false;
    if(ID){
        _data.read('tokens', ID, (err, tokenData) => {
            if(!err && tokenData){
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required field'});
    }
};

// Token put
handlers._token.put = (data, callback) => {
    console.log(typeof(data.payload.ID) , data.payload.ID.trim().length, typeof(data.payload.extend), data.payload.extend);
    let ID = typeof(data.payload.ID) === 'string' && data.payload.ID.trim().length === 20 ? data.payload.ID.trim() : false;
    let extend = typeof(data.payload.extend) === 'boolean' && data.payload.extend === true ? 'true' : false;
    if(ID && extend){
        _data.read('tokens', ID, (err, tokenData) => {
            if(!err && tokenData){
                if(tokenData.expiration > Date.now()){
                    tokenData.expiration = Date.now() + 60 * 60 * 1000;
                    _data.update('tokens', ID, tokenData, (err) => {
                        if(!err){
                            callback(200, tokenData);
                        } else {
                            callback(500, {'Error' : 'can not update the token'});
                        }
                    });
                } else {
                    callback(400, {'Error': 'token is already expired'});
                }
            } else {
                callback(400, {'Error': 'token does not exist'});
            }
    })
    } else {
        callback(400, {'Error' : 'required fields are missing or invalid'});
    }
};

// Token delete
handlers._token.delete = (data, callback) => {
    // Check the authorization
    const ID = typeof(data.queryString.ID) === 'string' && data.queryString.ID.trim().length === 20 ? data.queryString.ID.trim() : false;
    if(ID){
        _data.read('tokens', ID, (err, tokenData) => {
            if(!err && tokenData) {
                _data.delete('tokens', ID, (err) => {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, {'Error': 'cannot delete the token'})
                    }
                });
            } else {
                callback(404, {'Error': 'token does not exist'})
            }
            });
    } else {
        callback(400, {'Error' : 'required fields are missing'});
    }
};

// Verify that user has valid token
handlers._token.verifyToken = (id, phone, callback) => {
    // lookup the token
    _data.read('tokens', id, (err, tokenData) => {
        if(!err && tokenData){
            if(tokenData.phone == phone && tokenData.expiration > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false)
        }
    });
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