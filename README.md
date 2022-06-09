# NPM Distribution of Clowd.Squirrel

Cross Platform configuration based on [node-ffmpeg-installer](https://github.com/kribblo/node-ffmpeg-installer)

## Quickstart

```bash
npm install "@clowd/squirrel"
npx squirrel pack ...
```

## Supported Platforms are Architectures

Only win32-x64 is currently supported.

Noop packages are provided for darwin-arm64, darwin-x64, linux-arm64, and linux-x64 so @clowd/squirrel can be
installed on cross-platform electron projects without trigger an error. A noop script is provided in place of
Squirrel.exe.
