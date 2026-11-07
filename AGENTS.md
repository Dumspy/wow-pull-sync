# Agent notes

## Node and tooling

`node`, `npm` and `npx` are not on the default `PATH`. They come from the devenv shell, so run every command that needs them through it:

```sh
devenv shell -- npm run fmt
devenv shell -- npm run lint
devenv shell -- npm test
devenv shell -- node_modules/.bin/tsc --noEmit
```

For several commands at once, use `devenv shell -- bash -c '<cmd1>; <cmd2>'`.
