// Fetches the Discord Social SDK (headers + platform libraries) at build time so
// the proprietary binaries never live in the git tree. Idempotent: skips if the
// SDK is already present.

import { existsSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'); // native/discord

if (existsSync(join(root, 'include', 'discordpp.h'))) {
  console.log('Discord SDK already present — skipping download.');
  process.exit(0);
}

const REPO = process.env.DISCORD_SDK_REPO || 'HomuHomu833/wolvesville-electron';
const TAG = process.env.DISCORD_SDK_TAG || 'discord-sdk-1.9.17379';
const ASSET = process.env.DISCORD_SDK_ASSET || 'discord-social-sdk-libs.tar.gz';
const URL = process.env.DISCORD_SDK_URL || '';

function run(cmd, args) {
  console.log('>', cmd, args.join(' '));
  execFileSync(cmd, args, { stdio: 'inherit', cwd: root });
}

try {
  if (URL) {
    run('curl', ['-fSL', '-o', ASSET, URL]);
  } else {
    run('gh', ['release', 'download', TAG, '--repo', REPO, '--pattern', ASSET, '--output', ASSET, '--clobber']);
  }
  run('tar', ['-xzf', ASSET]);
  rmSync(join(root, ASSET), { force: true });
  console.log('Discord SDK ready.');
} catch (e) {
  console.error('\nFailed to fetch the Discord Social SDK.');
  console.error('Provide it via one of:');
  console.error(`  - a GitHub release asset "${ASSET}" on ${REPO} tagged "${TAG}", or`);
  console.error('  - set DISCORD_SDK_URL to a direct download URL for that asset.');
  process.exit(1);
}
