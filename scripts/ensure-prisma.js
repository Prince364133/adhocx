const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const clientPath = path.join(rootDir, 'node_modules', '.prisma', 'client', 'index.js');
const schemaPath = path.join(rootDir, 'apps', 'api', 'prisma', 'schema.prisma');
const clientSchemaPath = path.join(rootDir, 'node_modules', '.prisma', 'client', 'schema.prisma');

// Clean up any stale temp files from previous failed rename attempts on Windows
try {
  const clientDir = path.join(rootDir, 'node_modules', '.prisma', 'client');
  if (fs.existsSync(clientDir)) {
    const files = fs.readdirSync(clientDir);
    for (const f of files) {
      if (f.includes('.tmp')) {
        try { fs.unlinkSync(path.join(clientDir, f)); } catch (_) {}
      }
    }
  }
} catch (_) {}

let needsGenerate = false;
if (!fs.existsSync(clientPath) || !fs.existsSync(clientSchemaPath)) {
  needsGenerate = true;
} else {
  try {
    const srcMtime = fs.statSync(schemaPath).mtimeMs;
    const destMtime = fs.statSync(clientSchemaPath).mtimeMs;
    if (srcMtime > destMtime) {
      needsGenerate = true;
    }
  } catch {
    needsGenerate = true;
  }
}

if (needsGenerate) {
  console.log('🔄 Generating Prisma Client...');
  try {
    execSync('pnpm --filter @adhocx/api exec prisma generate', {
      cwd: rootDir,
      stdio: 'inherit',
    });
    console.log('✅ Prisma Client generated successfully.');
  } catch (err) {
    if (fs.existsSync(clientPath)) {
      console.warn('⚠️  Prisma generate encountered Windows file lock, but existing Prisma client is intact. Proceeding...');
    } else {
      console.error('❌ Prisma generate failed and no existing client was found:', err.message);
      process.exit(1);
    }
  }
} else {
  console.log('✅ Prisma Client is up to date.');
}
