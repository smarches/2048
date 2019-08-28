const path = require('path');

module.exports = {
    entry: './src/2048.js',
    output: {
        filename: 'wp-utils.js',
        library: 'wpUtils', // if libraryTarget is 'var' then this is the name of the variable which everything gets assigned to and which is available in the global scope after 'filename' is loaded
        libraryTarget: 'var', // default is 'var'
        path: path.resolve(__dirname,'dist')
    },
    mode: 'production'
}