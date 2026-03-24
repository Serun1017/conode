// esbuild.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/webview/ui/index.tsx'],
  bundle: true,
  outfile: 'out/webview.js',
  format: 'iife',
  minify: true,
  sourcemap: true,
  loader: { '.css': 'css' }, // [중요] CSS 로더가 포함되어야 합니다.
}).catch(() => process.exit(1));