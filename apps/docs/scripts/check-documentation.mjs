import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mermaid from 'mermaid';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const docsDir = path.resolve(scriptDir, '../docs');
const repoDir = path.resolve(scriptDir, '../../..');
const failures = [];
const warnings = [];
const markdownFiles = [];
const markdownContent = new Map();
let mermaidCount = 0;
let mermaidParsedCount = 0;
let mermaidUnvalidatedCount = 0;

const secretPatterns = [
  ['private-key', /-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/],
  ['AWS-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['GitHub-token', /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/],
  ['Google-API-key', /\bAIza[0-9A-Za-z_-]{35}\b/],
  ['Stripe-secret-key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}\b/],
  ['Slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

function isPublicDoc(filePath) {
  return path.extname(filePath).toLowerCase() === '.md' &&
    !filePath.split(path.sep).includes('internal');
}

function addFailure(message) {
  failures.push(message);
}

function parseMermaidIsolated(source) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(import.meta.url), '--parse-mermaid'],
    {
      cwd: path.resolve(scriptDir, '..'),
      input: source,
      encoding: 'utf8',
    },
  );
  if (result.error) {
    throw result.error;
  }
  if (result.status === 2) {
    return false;
  }
  if (result.status !== 0) {
    if (process.env.DOCS_CHECK_DEBUG === '1' && result.stderr) {
      console.error(result.stderr.trim());
    }
    throw new Error('Mermaid parser rejected the diagram');
  }
}

function getFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  return match ? match[1] : null;
}

async function checkReviewDates(filePath, content, today) {
  const relativePath = toPosix(path.relative(docsDir, filePath));
  const frontmatter = getFrontmatter(content);
  const reviewed = frontmatter?.match(/^last_reviewed:\s*["']?(\d{4}-\d{2}-\d{2})["']?\s*$/m);
  if (!reviewed) {
    warnings.push(relativePath);
    return;
  }

  const reviewedAt = Date.parse(`${reviewed[1]}T00:00:00Z`);
  if (!Number.isFinite(reviewedAt) || new Date(reviewedAt).toISOString().slice(0, 10) !== reviewed[1]) {
    addFailure(`${relativePath}: invalid last_reviewed date`);
    return;
  }
  if (reviewedAt > today) {
    addFailure(`${relativePath}: last_reviewed is in the future`);
    return;
  }

  const ageDays = Math.floor((today - reviewedAt) / 86_400_000);
  if (ageDays > 90) {
    addFailure(`${relativePath}: review date ${reviewed[1]} is ${ageDays} days old (limit: 90)`);
  }
}

async function checkMermaid(filePath, content) {
  const relativePath = toPosix(path.relative(docsDir, filePath));
  const lines = content.split(/\r?\n/);
  let inDiagram = false;
  let diagramLines = [];
  let diagramNumber = 0;

  for (const line of lines) {
    if (!inDiagram && /^```mermaid\s*$/i.test(line)) {
      inDiagram = true;
      diagramLines = [];
      continue;
    }
    if (inDiagram && /^```\s*$/.test(line)) {
      inDiagram = false;
      diagramNumber += 1;
      mermaidCount += 1;
      try {
        const parsed = parseMermaidIsolated(diagramLines.join('\n'));
        if (parsed) {
          mermaidParsedCount += 1;
        } else {
          mermaidUnvalidatedCount += 1;
        }
      } catch (error) {
        addFailure(`${relativePath}: Mermaid diagram ${diagramNumber} does not parse`);
        if (process.env.DOCS_CHECK_DEBUG === '1') {
          console.error(`${relativePath} diagram ${diagramNumber}: ${error.message}`);
        }
      }
      continue;
    }
    if (inDiagram) {
      diagramLines.push(line);
    }
  }

  if (inDiagram) {
    addFailure(`${relativePath}: Mermaid code fence is not closed`);
  }
}

async function checkSecrets(filePath, content) {
  const relativePath = toPosix(path.relative(docsDir, filePath));
  const lines = content.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    for (const [name, pattern] of secretPatterns) {
      if (pattern.test(lines[index])) {
        addFailure(`${relativePath}:${index + 1}: possible ${name} in public documentation`);
      }
    }
  }
}

async function readMarkdownTree(directory) {
  const files = (await walk(directory)).filter(isPublicDoc);
  const texts = [];
  for (const filePath of files) {
    const content = await fs.readFile(filePath, 'utf8');
    markdownFiles.push(filePath);
    markdownContent.set(filePath, content);
    texts.push(content);
    await checkReviewDates(filePath, content, Date.now());
    await checkMermaid(filePath, content);
    await checkSecrets(filePath, content);
  }
  return { files, text: texts.join('\n') };
}

async function checkSourcePathCoverage(label, sourceDirectory, sourceFilter, docsDirectory) {
  const sourceFiles = (await walk(sourceDirectory)).filter(sourceFilter);
  const docsFiles = (await walk(docsDirectory)).filter(isPublicDoc);
  const text = docsFiles.map((filePath) => markdownContent.get(filePath) ?? '').join('\n');
  const missing = sourceFiles
    .map((filePath) => toPosix(path.relative(repoDir, filePath)))
    .filter((sourcePath) => !text.includes(sourcePath));
  if (missing.length > 0) {
    for (const sourcePath of missing) {
      addFailure(`${label}: no documentation source reference for ${sourcePath}`);
    }
  }
  console.log(`${label}: ${sourceFiles.length - missing.length}/${sourceFiles.length} source paths referenced`);
}

function checkNamedCoverage(label, names, documentText) {
  const missing = names.filter((name) => !documentText.includes(`\`${name}\``));
  if (missing.length > 0) {
    for (const name of missing) {
      addFailure(`${label}: ${name} is missing from its inventory`);
    }
  }
  console.log(`${label}: ${names.length - missing.length}/${names.length} names referenced`);
}

async function main() {
  await readMarkdownTree(docsDir);
  const appRouteDocs = [
    ['Admin', 'apps/admin'],
    ['Ops', 'apps/ops'],
    ['Corporate', 'apps/corporate'],
  ];

  for (const [label, app] of appRouteDocs) {
    await checkSourcePathCoverage(
      `${label} page routes`,
      path.join(repoDir, app, 'src', 'app'),
      (filePath) => path.basename(filePath) === 'page.tsx',
      path.join(docsDir, app),
    );
  }

  await checkSourcePathCoverage(
    'API controller files',
    path.join(repoDir, 'apps', 'api', 'src'),
    (filePath) => filePath.endsWith('.controller.ts'),
    path.join(docsDir, 'apps', 'api', 'reference'),
  );
  await checkSourcePathCoverage(
    'Marketing route files',
    path.join(repoDir, 'apps', 'marketing', 'src', 'pages'),
    (filePath) => /\.(?:astro|ts|tsx)$/.test(filePath),
    path.join(docsDir, 'apps', 'marketing'),
  );

  const prismaPath = path.join(repoDir, 'apps', 'api', 'prisma', 'schema.prisma');
  const schema = await fs.readFile(prismaPath, 'utf8');
  const modelNames = [...schema.matchAll(/^\s*model\s+([A-Za-z_]\w*)\s*\{/gm)]
    .map((match) => match[1]);
  const modelInventory = await fs.readFile(
    path.join(docsDir, 'apps', 'api', 'data', 'model-inventory.md'),
    'utf8',
  );
  checkNamedCoverage('Prisma models', modelNames, modelInventory);

  for (const app of ['mobile', 'employee_app']) {
    const routePath = path.join(repoDir, 'apps', app, 'lib', 'routes', 'app_routes.dart');
    const routes = await fs.readFile(routePath, 'utf8');
    const routeNames = [...routes.matchAll(/static\s+const\s+String\s+([A-Za-z_]\w*)\s*=/g)]
      .map((match) => match[1]);
    const routeDocDir = path.join(docsDir, app === 'mobile' ? 'apps/mobile' : 'apps/employee-app');
    const routeDocs = (await walk(routeDocDir))
      .filter(isPublicDoc)
      .map((filePath) => markdownContent.get(filePath) ?? '');
    checkNamedCoverage(`${app} route constants`, routeNames, routeDocs.join('\n'));
  }

  console.log(`Public Markdown pages: ${markdownFiles.length}`);
  console.log(
    `Mermaid diagrams checked: ${mermaidCount}; parsed: ${mermaidParsedCount}; parser-unavailable: ${mermaidUnvalidatedCount}`,
  );
  console.log(`Pages without last_reviewed metadata: ${warnings.length} (warning only; add metadata when revising)`);

  if (failures.length > 0) {
    console.error(`Documentation checks failed (${failures.length}):`);
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }
  console.log('Documentation governance and source-coverage checks passed.');
}

if (process.argv[2] === '--parse-mermaid') {
  try {
    let source = '';
    for await (const chunk of process.stdin) {
      source += chunk;
    }
    await mermaid.parse(source);
  } catch (error) {
    if (process.env.DOCS_CHECK_DEBUG === '1' && error instanceof Error) {
      console.error(error.message);
    }
    process.exitCode = error instanceof Error && error.message.includes('DOMPurify') ? 2 : 1;
  }
} else {
  await main();
}
