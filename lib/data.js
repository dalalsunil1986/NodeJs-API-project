/*
 * Library of storing and editing data
 */

// Dependencies
const fs =  require('fs');
const path = require('path');
const helper =  require('./helpers');

// container
const lib = {};

// create base directory
lib.baseDir = path.join(__dirname, '/../.data/');

// Write data
lib.create = (dir,file,data,callback) => {
    // Open the file
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'wx', (err, fileDescription) => {
        if(!err && fileDescription){
            // Write data to the file
            const stringData = JSON.stringify(data);
            fs.writeFile(fileDescription, stringData, (err) => {
                if(!err){
                    // Close the file
                    fs.close(fileDescription, (err) => {
                        if(!err){
                            callback(false);
                        } else {
                            callback('Error closing the file.')
                        }
                    });
                } else {
                    callback('Error writing to the file.')
                }
            });
        } else {
            callback('Error creating the file, it may already exist.')
        }
    });
};

// Read data from the file
lib.read = (dir, file, callback) => {
  fs.readFile(lib.baseDir+dir+'/'+file+'.json', 'utf8', (err, data) => {
      if(!err && data){
          const pasedData = helper.parseToObject(data);
          callback(false, pasedData);
      } else {
          callback(err, data);
      }
  });
};

// Update a file
lib.update = (dir, file, data, callback) => {
    // open the file
    fs.open(lib.baseDir+dir+'/'+file+'.json', 'r+', (err, fileDiscriptor) => {
        if (!err && fileDiscriptor) {
            // change data to string
            const stringData = JSON.stringify(data);
            // Truncate the data
            fs.truncate(fileDiscriptor, (err) => {
                if(!err) {
                    // writing new data
                    fs.writeFile(fileDiscriptor, stringData, (err) => {
                        if(!err){
                            // Closing the file
                            fs.close(fileDiscriptor, (err) => {
                                if(!err) {
                                    callback(false);
                                } else {
                                    callback('Error closing the file.');
                                }
                            });
                        } else {
                            callback('Error adding new data.');
                        }
                    });
                } else {
                    callback('Error truncating existed data.');
                }
            });
        } else {
            callback('Error opening the file, it may not exist');
        }
    });
};

// Delete a file
lib.delete = (dir, file, callback) => {
    fs.unlink(lib.baseDir+dir+'/'+file+'.json', (err) => {
        if(!err) {
            callback(false);
        } else {
            callback('Error deleting the file');
        }
    });
};

// Export the module
module.exports = lib;