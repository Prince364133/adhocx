const path = require('node:path');
const { spawn } = require('node:child_process');
const { loadEnvConfig } = require('@next/env');

const command = process.argv[2];
const appRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(__dirname, '../../..');

if (command === 'dev') {
  process.env.NODE_ENV = 'development';
} else if (command === 'build' || command === 'start') {
  process.env.NODE_ENV = 'production';
}

loadEnvConfig(repoRoot, process.env.NODE_ENV === 'development');

process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_BROWSER_API_KEY || '';

const nextCli = require.resolve('next/dist/bin/next');
const child = spawn(process.execPath, [nextCli, ...process.argv.slice(2)], {
  cwd: appRoot,
  env: process.env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error('Failed to start Next.js:', error);
  process.exitCode = 1;
});

child.on('exit', (code, signal) => {
  process.exitCode = code ?? (signal ? 1 : 0);
});
