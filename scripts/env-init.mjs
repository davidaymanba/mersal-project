// Creates apps/api/.env and apps/web/.env.local from .env.example (never overwrites).
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const example = readFileSync('.env.example', 'utf8');
const secret = () => randomBytes(32).toString('base64url');

const api = example
  .replace('JWT_ACCESS_SECRET=change-me-access', `JWT_ACCESS_SECRET=${secret()}`)
  .replace('JWT_REFRESH_SECRET=change-me-refresh', `JWT_REFRESH_SECRET=${secret()}`)
  .split('\n')
  .filter((line) => !line.startsWith('NEXT_PUBLIC_'))
  .join('\n');

const web = example
  .split('\n')
  .filter((line) => line.startsWith('NEXT_PUBLIC_'))
  .join('\n');

for (const [target, content] of [
  ['apps/api/.env', api],
  ['apps/web/.env.local', `${web}\n`],
]) {
  if (existsSync(target)) {
    console.log(`kept    ${target}`);
  } else {
    writeFileSync(target, content);
    console.log(`created ${target}`);
  }
}
