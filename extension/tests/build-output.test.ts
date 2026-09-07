// @vitest-environment node
import { access, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const output = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist/extension');

describe('extension build output', () => {
  it('contains every sideloading artifact and minimum permissions', async () => {
    for (const file of [
      'manifest.json', 'background.js', 'content.js', 'styles/docuveil.css',
      'icons/icon-16.png', 'icons/icon-32.png', 'icons/icon-48.png', 'icons/icon-128.png',
    ]) {
      await expect(access(resolve(output, file))).resolves.toBeUndefined();
    }
    const manifest = JSON.parse(await readFile(resolve(output, 'manifest.json'), 'utf8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions).toEqual(['https://chatgpt.com/*']);
  });
});
