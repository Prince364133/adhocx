const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const lockfilePath = path.join(rootDir, 'pnpm-lock.yaml');
const installedLockfilePath = path.join(rootDir, 'node_modules', '.pnpm', 'lock.yaml');
const modulesYamlPath = path.join(rootDir, 'node_modules', '.modules.yaml');

/**
 * Normalizes line endings so Windows CRLF lockfiles compare cleanly against pnpm's stored LF copy.
 */
function readNormalized(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

/**
 * Returns the first declared dependency missing from node_modules, or null if all are present.
 */
function findMissingDependency() {
  const workspaceRoots = [
    rootDir,
    ...['apps', 'packages'].flatMap((group) => {
      const groupDir = path.join(rootDir, group);
      if (!fs.existsSync(groupDir)) return [];
      return fs
        .readdirSync(groupDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(groupDir, entry.name));
    }),
  ];

  for (const wsDir of workspaceRoots) {
    const pkgPath = path.join(wsDir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    for (const section of ['dependencies', 'devDependencies']) {
      for (const name of Object.keys(pkg[section] || {})) {
        const segments = name.split('/');
        const inWorkspace = fs.existsSync(path.join(wsDir, 'node_modules', ...segments));
        const inRoot = fs.existsSync(path.join(rootDir, 'node_modules', ...segments));
        if (!inWorkspace && !inRoot) {
          return `${pkg.name || path.relative(rootDir, wsDir) || 'root'}:${name}`;
        }
      }
    }
  }
  return null;
}

const repoLock = readNormalized(lockfilePath);
const installedLock = readNormalized(installedLockfilePath);
const hasModulesYaml = fs.existsSync(modulesYamlPath);
const missingDep = findMissingDependency();

if (!repoLock || !hasModulesYaml || repoLock !== installedLock || missingDep) {
  const reason = missingDep
    ? `missing dependency (${missingDep})`
    : 'node_modules is out of sync with pnpm-lock.yaml';
  console.log(`📦 ${reason}; running pnpm install --frozen-lockfile...`);
  execSync('pnpm install --frozen-lockfile --prefer-offline', {
    cwd: rootDir,
    stdio: 'inherit',
  });
}
