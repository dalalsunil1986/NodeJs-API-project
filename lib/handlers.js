/*
 * this contains the request handlers
 */

// Dependencies
const _data = require('./data');
const helpers = require('./helpers');
const config = require('./config');

// Container
const handlers = {};

// Global Variable
const acceptableMethods = ['post', 'get', 'put', 'delete'];

// Users handler
handlers.users = (data, callback) =>{
    if(acceptableMethods.indexOf(data.method) > -1){
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
    let phone = typeof(data.queryString.phone) === 'string' && data.queryString.phone.trim().length === 10 ? data.queryString.phone.trim() : false;
    if(phone){

        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // verify the token
        handlers._token.verifyToken(token, phone, (validToken) => {
            if (validToken) {
                _data.read('users', phone, (err, userData) => {
                    if (!err && userData) {
                        _data.delete('users', phone, (err) => {
                            if (!err) {
                                const userChecks = typeof(userData.check) === 'object' && userData.check instanceof Array ? userData.check : false ;
                                if(userChecks.length > 0){
                                    userChecks.forEach( (element) => {
                                        _data.delete('checks', element, (err) => {
                                            if(!err){
                                                callback('User\'s check has been deleted');
                                            } else {
                                                callback(500, {'Error': 'could not delete this user\'s checks'});
                                            }
                                        });
                                    });
                                } else {
                                    callback('user has no checks to be associated with');
                                    callback(200);
                                }
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
    if(acceptableMethods.indexOf(data.method) > -1){
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
            if(tokenData.phone === phone && tokenData.expiration > Date.now()){
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false)
        }
    });
};

// Check service
handlers.check = (data,callback) => {
    if(acceptableMethods.indexOf(data.method) > -1){
        handlers._check[data.method](data, callback);
    } else {
        callback(405,{'Error' : 'Method not acceptable'});
    }
};

// Check sub containers
handlers._check = {};

// Check Post
// required data: protocol, url, method, successCode, timeout
handlers._check.post = (data, callback) => {
    const protocol = typeof(data.payload.protocol) === 'string' && ['http' , 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) === 'string' && acceptableMethods.indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCode = typeof(data.payload.successCode) === 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.successCode : false;
    const timeout = typeof(data.payload.timeout) === 'number' && data.payload.timeout % 1 === 0 && 1 <= data.payload.timeout <= 5 ? data.payload.timeout : false;

    if(protocol && url && method && successCode && timeout){
        // Check the Authorization of the token
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // lookup the user by token data
        _data.read('tokens', token, (err, tokenData) => {
            if(!err && tokenData){
                const userPhone = tokenData.phone;
                // lookup the user
                _data.read('users', userPhone, (err, userData) => {
                    if(!err && userData){
                        // user data will carry an array for the checks and we have to make sure it wont exceed the allowed times
                        let userCheck = typeof(userData.check) === 'object' && userData.check instanceof Array ? userData.check : [];
                        // Verify if the user can ask for a check
                        if(userCheck.length < config.maxChecks){
                            // Create the check object
                            const checkId =  helpers.randomString(20);
                            const checkObj = {
                                'checkID' : checkId,
                                'userPhone' : userPhone,
                                'protocol' : protocol,
                                'url' : url,
                                'method' : method,
                                'successCode' : successCode,
                                'timeout' : timeout
                            };
                            _data.create('checks', checkId, checkObj, (err) => {
                                if(!err){
                                    // count this check in user's data
                                    userData.check = userCheck;
                                    userData.check.push(checkId);
                                    // Update the user data
                                    _data.update('users', userPhone, userData, (err) => {
                                        if(!err){
                                            callback(200, checkObj);
                                        } callback(500,{'Error':'Could not update the user with the new check'});
                                    })
                                } else {
                                    callback(500, {'Error': 'Cannot store the check object'});
                                }
                            })
                        } else {
                            callback(400, {'Error' : `user already have the max number of checks ${config.maxChecks}`});
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, {'Error' : 'Inputs are  missing or invalid'});
    }

};

// Check Get
handlers._check.get = (data, callback) => {
        // Check the validity of the phone number
        const Id = typeof(data.queryString.Id) === 'string' && data.queryString.Id.trim().length === 20 ? data.queryString.Id.trim() : false;
        if(Id) {
            // lookup the check
            _data.read('checks', Id, (err, checkData) => {
                if(!err && checkData){
                    // Get the token from the headers
                    const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                    // verify the token
                    handlers._token.verifyToken(token, checkData.userPhone, (validToken) => {
                        if (validToken) {
                            callback(200, checkData);
                        } else {
                            callback(403,{'Error' : 'Missing the token in headers or invalid token'});
                        }
                    });
                } else {
                    callback(404);
                }
            });
        } else {
            callback(400, {'Error': 'Missing required field'});
        }
};

// Check Put
handlers._check.put = (data, callback) => {
    // Id field is required but the other fields are optional only one of them is required
   // Optional fields
    const Id = typeof(data.payload.Id) === 'string' && data.payload.Id.trim().length === 20 ? data.payload.Id.trim() : false;
    const protocol = typeof(data.payload.protocol) === 'string' && ['http' , 'https'].indexOf(data.payload.protocol) > -1 ? data.payload.protocol : false;
    const url = typeof(data.payload.url) === 'string' && data.payload.url.trim().length > 0 ? data.payload.url.trim() : false;
    const method = typeof(data.payload.method) === 'string' && acceptableMethods.indexOf(data.payload.method) > -1 ? data.payload.method : false;
    const successCode = typeof(data.payload.successCode) === 'object' && data.payload.successCode instanceof Array && data.payload.successCode.length > 0 ? data.payload.successCode : false;
    const timeout = typeof(data.payload.timeout) === 'number' && data.payload.timeout % 1 === 0 && 1 <= data.payload.timeout <= 5 ? data.payload.timeout : false;

    if(Id && (protocol || url || method || successCode || timeout)){
        // lookup the checkData by Id
        _data.read('checks' ,Id , (err, checkData) => {
            if(!err && checkData){
        // Get the token from the headers
        const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
        // verify the token
        handlers._token.verifyToken(token, checkData.userPhone, (validToken) => {
            if (validToken) {
                        if(protocol){
                            checkData.protocol = protocol;
                        } if(url){
                            checkData.url = url;
                        } if(method){
                            checkData.method = method;
                        } if(successCode) {
                            checkData.successCode = successCode;
                        } if(timeout) {
                            checkData.timeout = timeout;
                        }
                        // Store the new data
                        _data.update('checks', Id, checkData, (err) => {
                            if(!err){
                                callback(200);
                            } else {
                                console.log(err);
                                callback(500, {'Error' : 'updating the check data'});
                            }
                        });
                    } else {
                       callback(403,{'Error' : 'Missing the token in headers or invalid token'});
                    }
                });
            } else {
                console.log(err);
                callback(400, {'Error' : 'the check does not exist'});
            }
        });
    } else {
        callback(400, {'Error' : 'Missing required fields'});
    }
};

// Check Delete
handlers._check.delete = (data, callback) => {
// Id is the only required data
    // only an authenticated user can delete user files
    const Id = typeof(data.queryString.Id) === 'string' && data.queryString.Id.trim().length === 20 ? data.queryString.Id.trim() : false;
    if(Id){
        // lookup the check data
        _data.read('checks', Id, (err, checkData) => {
            if(!err && checkData){
                // Get the token from the headers
                const token = typeof(data.headers.token) === 'string' ? data.headers.token : false;
                // verify the token
                handlers._token.verifyToken(token, checkData.userPhone, (validToken) => {
                    if (validToken) {
                        // Delete the check data
                        _data.delete('checks', Id, (err) => {
                            if(!err){
                                _data.read('users', checkData.userPhone, (err, userData) => {
                                    if (!err && userData) {
                                        let userCheck = typeof(userData.check) === 'object' && userData.check instanceof Array ? userData.check : [];
                                        // Remove deleted check from the user data
                                        let checkPosition = userCheck.indexOf(Id);
                                        if(checkPosition > -1){
                                            userCheck.splice(checkPosition,1);
                                            userData.check = userCheck;
                                            // Create new user data without check field if check field is empty
                                                const newUserData = {
                                                "firstName": userData.firstName,
                                                "lastName": userData.lastName,
                                                "phone": userData.phone,
                                                "password": userData.password,
                                                "tosAgreement" : true
                                                };
                                            if(userCheck.length === 0){
                                                //update the user data without a check field
                                                _data.update('users', userData.phone, newUserData, (err) => {
                                                    if(!err){
                                                        callback(200);
                                                    } else {
                                                        callback(500, {'Error' : 'cannot update the user data'});
                                                    }
                                                });
                                            } else {
                                                // Update user data with the rest of it'scheck field
                                                _data.update('users', userData.phone, userData, (err) => {
                                                    if(!err){
                                                        callback(200);
                                                    } else {
                                                        callback(500, {'Error' : 'cannot update the user data'});
                                                    }
                                                });
                                            }
                                        } else {
                                            callback(500, {'Error' : 'could not find the check on user\'s data'});
                                        }
                                    } else {
                                        callback(500, {'Error': 'could not find the user who created the check'});
                                    }
                                });
                            } else {
                                callback(500, {'Error' : 'cannot delete the check data'});
                            }
                        });
                    } else {
                        callback(403, {'Error': 'Missing the token in headers or invalid token'})
                    }
                });
            } else {
                callback(400, {'Error' : 'check does not exist'});
            }
        });
    } else {
        callback(400, {'Error': 'Missing required field'});
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