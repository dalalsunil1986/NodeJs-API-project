/*
 * this a sample file to show how to CRUD data in this application
 */

// Dependencies
const _data = require('./data.js');

// Write
_data.create('test', 'File', { 'hey' : 'there' }, (err) => {
    console.log(`Error: ${err}`);
});

// Read
_data.read('test','File', (err, data) =>{
    console.log(`Error: ${err}, Data: ${data}`);
});

// Update
_data.update('test','File', { 'new' : 'data' } , (err) => {
    console.log('Error: ',err);
});

// Delete
_data.delete('test','File', (err) => {
    console.log(`Error: ${err}`);
});