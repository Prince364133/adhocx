import fs from 'fs';
import path from 'path';

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/u;
const ignoredPaths = ['node_modules', '.git', '.astro', 'dist', '.gemini', '.next', '_astro'];

const fileMap = {};

function walk(dir) {
  let list;
  try {
    list = fs.readdirSync(dir, { withFileTypes: true });
  } catch(e) { return; }

  for (const item of list) {
    if (ignoredPaths.some(p => item.name === p)) continue;
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      walk(fullPath);
    } else if (item.isFile()) {
      if (/\.(astro|html|jsx|tsx|vue|svelte|css|js|ts)$/i.test(item.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const lines = content.split('\n');
          lines.forEach((line, idx) => {
            const matches = line.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA70}-\u{1FAFF}]/ug);
            if (matches && matches.length > 0) {
              if (!fileMap[fullPath]) fileMap[fullPath] = [];
              fileMap[fullPath].push({ line: idx + 1, emojis: matches, text: line.trim() });
            }
          });
        } catch(e) {}
      }
    }
  }
}

walk('.');

console.log('--- EMOJI OCCURRENCES BY FILE ---');
for (const [file, items] of Object.entries(fileMap)) {
  console.log(`\n=== ${file} (${items.length} lines) ===`);
  items.forEach(it => {
    console.log(`  Line ${it.line} [${it.emojis.join(' ')}]: ${it.text.slice(0, 120)}`);
  });
}

