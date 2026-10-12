import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';

await rm('dist-electron', { recursive: true, force: true });
await mkdir('dist-electron', { recursive: true });

await build({
  entryPoints: ['server.ts'],
  outfile: 'dist-electron/server.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  sourcemap: false,
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

console.log('Electron API server bundled to dist-electron/server.cjs');
