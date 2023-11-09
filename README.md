# 2048

It's a simple game wherein you smash together tiles. 

Each time tiles are smushed together, their values combine. Eventually, you can create a tile with value 2048. Then...well, then nothing special happens.

## NPM versioning

Check installed version:

```bash
npm list <package>
```

check available version:

```bash
npm view <package>[@latest]
```

## Building

Uses Webpack 5:

```bash
# check webpack version:
npx webpack-cli --version

npm run build
```

check in on dependecies:

```bash
npm audit fix
```

### Sass

To run separately, may use:

```bash
npm install -g sass
```

then, ex., `sass src/styles.sass dist/styles.css`

## Running

Run in browser with the files in `dist` folder (just open `2048.html`), or in the Node.js repl via `src/startup.js`.
