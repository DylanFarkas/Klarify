#!/usr/bin/env node
/**
 * Launcher para `klarify` global (npm install -g / npm link).
 * Ejecuta el binario TypeScript con tsx (dependencia del paquete).
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(pkgRoot, 'src', 'bin.ts');
const tsxCli = require.resolve('tsx/cli');

const tsconfig = join(pkgRoot, 'tsconfig.json');
const result = spawnSync(process.execPath, [tsxCli, '--tsconfig', tsconfig, entry, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: process.env,
  windowsHide: true,
});

process.exit(result.status ?? 1);
