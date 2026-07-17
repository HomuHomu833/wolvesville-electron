// Builds the native addon. On macOS it builds for arm64 and x64 separately and
// lipo-merges them into a single universal discord_addon.node (the Discord SDK
// dylib we link against is already universal). Elsewhere it's a plain build.

import { execSync } from 'node:child_process';
import { platform, tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyFileSync, mkdirSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'); // native/discord
const release = join(root, 'build', 'Release');
const addon = join(release, 'discord_addon.node');

function gyp(extra = '') {
  execSync(`node-gyp rebuild ${extra}`.trim(), { stdio: 'inherit', cwd: root });
}

if (platform() === 'darwin') {
  const tmp = join(tmpdir(), 'discord-addon-arch');
  mkdirSync(tmp, { recursive: true });
  const arm = join(tmp, 'arm64.node');
  const x64 = join(tmp, 'x64.node');

  console.log('== Building addon for arm64 ==');
  gyp('--arch=arm64');
  copyFileSync(addon, arm); // node-gyp rebuild wipes build/, so stash outside it

  console.log('== Building addon for x64 ==');
  gyp('--arch=x64');
  copyFileSync(addon, x64);

  console.log('== Merging into a universal binary ==');
  execSync(`lipo -create "${arm}" "${x64}" -output "${addon}"`, { stdio: 'inherit' });
  execSync(`lipo -info "${addon}"`, { stdio: 'inherit' });
} else {
  gyp();
}
