import path from 'path';

export default {
    entry: './src/2048.js',
    output: {
        filename: 'wp-utils.js',
        library: {
            name: 'wpUtils', 
            type: 'var' // type 'module' is still experimental?
        },
        path: path.resolve('./dist')
    },
    mode: 'production'
}
