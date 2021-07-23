import path from 'path';

export default {
    entry: './src/canvas.ts',
    resolve: {
        extensions: [".ts", ".js"],
        // this did not appear to work
        alias: {
            NodeModules: path.resolve('./node_modules/'),
        },
        modules: ['node_modules']
    },
    // despite being in MODULE this pertains to 'loaders'
    module: {
        rules: [
            { test: /\.ts$/, use: 'ts-loader' }
        ],
    },
    output: {
        filename: 'wp-utils.js',
        library: {
            name: 'wpUtils', 
            type: 'var' // type 'module' is still experimental, open ticket for 5 years...https://github.com/webpack/webpack/issues/2933
        },
        path: path.resolve('./dist')
    },
    mode: 'development'
}
