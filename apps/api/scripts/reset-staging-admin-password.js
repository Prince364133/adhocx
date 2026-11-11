'use strict';

const crypto = require('crypto');
const path = require('path');
const readline = require('readline');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

const STAGING_DATABASE = 'adhocx_staging';
const STAGING_USER = 'adhocx_dev';
const STAGING_PORT = '15432';
const PASSWORD_ITERATIONS = 210_000;
const MIN_PASSWORD_LENGTH = 16;

function assertStagingDatabaseTarget(databaseUrl, nodeEnv = '') {
  let url;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL is missing or invalid.');
  }

  const database = decodeURIComponent(url.pathname.slice(1));
  if (
    nodeEnv === 'production' ||
    url.protocol !== 'postgresql:' ||
    url.hostname !== '127.0.0.1' ||
    url.port !== STAGING_PORT ||
    database !== STAGING_DATABASE ||
    decodeURIComponent(url.username) !== STAGING_USER
  ) {
    throw new Error('Refusing to reset a password unless DATABASE_URL targets the local AdhocX staging database.');
  }

  return { host: url.hostname, port: url.port, database };
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, PASSWORD_ITERATIONS, 64, 'sha512').toString('hex');
  return `${salt}:${hash}:${PASSWORD_ITERATIONS}`;
}

function askLine(question) {
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => prompt.question(question, (answer) => {
    prompt.close();
    resolve(answer);
  }));
}

function askSecret(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so the password can be entered without echo.');
  }

  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk) => {
      for (const char of chunk.toString('utf8')) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Password reset cancelled.'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          process.stdout.write('\n');
          resolve(value);
          return;
        }
        if (char === '\u007f' || char === '\b') {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (char >= ' ') {
          value += char;
          process.stdout.write('*');
        }
      }
    };
    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    };

    process.stdout.write(question);
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', onData);
  });
}

async function main() {
  dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });
  const target = assertStagingDatabaseTarget(process.env.DATABASE_URL, process.env.NODE_ENV);
  const confirmation = process.argv.find((arg) => arg.startsWith('--confirm-staging='));
  if (confirmation?.slice('--confirm-staging='.length) !== STAGING_DATABASE) {
    throw new Error(`Pass --confirm-staging=${STAGING_DATABASE} to target this local database.`);
  }

  console.log(`Target: ${target.database} on ${target.host}:${target.port}. Only an existing active ADMIN password will be changed.`);
  const email = (await askLine('Existing admin email: ')).trim();
  if (!email || !email.includes('@')) throw new Error('Enter the email of the existing admin account.');

  const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });
  try {
    const admin = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    if (!admin) throw new Error('No active ADMIN account matches that email in the local staging database; no changes were made.');

    const confirmationText = await askLine('Type RESET STAGING ADMIN PASSWORD to continue: ');
    if (confirmationText !== 'RESET STAGING ADMIN PASSWORD') {
      throw new Error('Confirmation did not match; no changes were made.');
    }

    const password = await askSecret(`New password (${MIN_PASSWORD_LENGTH}+ characters; input hidden): `);
    if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    const repeatedPassword = await askSecret('Re-enter new password: ');
    if (password !== repeatedPassword) throw new Error('Passwords do not match; no changes were made.');

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: hashPassword(password) },
    });
    console.log('Staging admin password updated. The account role, status, MFA settings, and other data were not changed.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Staging admin password reset failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { assertStagingDatabaseTarget, hashPassword, MIN_PASSWORD_LENGTH };
