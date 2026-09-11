import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** generator/.env 를 읽어 process.env 에 넣는다. 이미 있는 값은 덮지 않는다. */
export function loadEnv() {
  const file = resolve(dirname(fileURLToPath(import.meta.url)), '..', '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

export function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) throw new Error(`환경변수 누락: ${missing.join(' ')} — generator/.env 를 확인하라`);
}
