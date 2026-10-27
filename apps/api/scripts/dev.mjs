// Dev runner: TypeScript in watch mode + Node's built-in --watch on the output.
// Avoids pulling in the Nest CLI / webpack toolchain for local development.
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';

const tsc = join('node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');

const initial = spawnSync(tsc, ['-p', 'tsconfig.build.json'], { stdio: 'inherit' });
if (initial.status !== 0) {
  console.warn('[dev] initial compile reported errors — starting watchers anyway');
}

const watcher = spawn(tsc, ['-p', 'tsconfig.build.json', '--watch', '--preserveWatchOutput'], {
  stdio: 'inherit',
});
// Watch only compiled output (ours and the workspace packages'). Watching the module graph
// also reacted to unrelated file activity elsewhere in the repo and restarted mid-request.
const watched = ['dist', '../../packages/shared/dist', '../../packages/brand/dist'];
const server = spawn(
  process.execPath,
  [...watched.map((path) => `--watch-path=${path}`), '--enable-source-maps', 'dist/main.js'],
  { stdio: 'inherit' },
);

const stop = () => {
  watcher.kill();
  server.kill();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
