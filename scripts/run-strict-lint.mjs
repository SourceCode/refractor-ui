import { spawnSync } from 'node:child_process';

const res = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'eslint', '.', '--max-warnings=0'],
  {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      REFRACTOR_STRICT_LINT: '1',
      CI: 'true',
    },
  }
);

process.exit(res.status ?? 1);
