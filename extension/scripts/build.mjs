import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const extensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(extensionRoot, '../dist/extension');

await rm(output, { recursive: true, force: true });
await mkdir(resolve(output, 'styles'), { recursive: true });
await mkdir(resolve(output, 'icons'), { recursive: true });

await build({
  entryPoints: {
    background: resolve(extensionRoot, 'src/background/index.ts'),
    content: resolve(extensionRoot, 'src/content/index.ts'),
  },
  bundle: true,
  entryNames: '[name]',
  format: 'iife',
  outdir: output,
  platform: 'browser',
  target: ['chrome120'],
  minify: true,
  sourcemap: false,
});

await cp(resolve(extensionRoot, 'manifest.json'), resolve(output, 'manifest.json'));
await cp(resolve(extensionRoot, 'styles/docuveil.css'), resolve(output, 'styles/docuveil.css'));

const iconSource = resolve(extensionRoot, 'assets/favicon.svg');
await Promise.all([16, 32, 48, 128].map((size) =>
  sharp(iconSource)
    .resize(size, size)
    .png()
    .toFile(resolve(output, `icons/icon-${size}.png`)),
));
