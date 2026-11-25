#!/usr/bin/env node
/**
 * IndexNow Protocol Client for AdhocX
 *
 * IndexNow notifies Microsoft Bing, Yandex, Naver, and participating search engines
 * immediately when URLs are published or updated, bypassing crawl discovery delays.
 *
 * Key: a9f73c68e14b4a2b91d2ef07a9e5c4d1
 * Verification: https://www.adhocx.com/a9f73c68e14b4a2b91d2ef07a9e5c4d1.txt
 *
 * Usage:
 *   node scripts/indexnow.mjs --dry-run
 *   node scripts/indexnow.mjs --submit
 *   node scripts/indexnow.mjs --url https://www.adhocx.com/blogs/ets-software-guide-hyderabad --submit
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOST = 'www.adhocx.com';
const KEY = 'a9f73c68e14b4a2b91d2ef07a9e5c4d1';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

const args = process.argv.slice(2);
const isSubmit = args.includes('--submit');
const isDryRun = args.includes('--dry-run') || !isSubmit;
const urlArgIdx = args.indexOf('--url');
const singleUrl = urlArgIdx !== -1 && args[urlArgIdx + 1] ? args[urlArgIdx + 1] : null;

// Find sitemap
const candidateDirs = ['dist', '.vercel/output/static', 'apps/marketing/dist'];
const outDir = candidateDirs.find((d) => existsSync(join(d, 'sitemap.xml')));

let urlList = [];
if (singleUrl) {
  urlList = [singleUrl];
} else if (outDir) {
  const sitemapXml = readFileSync(join(outDir, 'sitemap.xml'), 'utf8');
  urlList = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
} else {
  console.warn('indexnow: sitemap.xml not found on disk. Run `astro build` first to submit all URLs.');
  urlList = [`https://${HOST}/`];
}

console.log(`\n============================================================`);
console.log(`  AdhocX IndexNow Submitter (Bing, Yandex, Naver)`);
console.log(`============================================================`);
console.log(`  Host:         ${HOST}`);
console.log(`  Key:          ${KEY}`);
console.log(`  Key Location: ${KEY_LOCATION}`);
console.log(`  Target URLs:  ${urlList.length} URL(s)`);
console.log(`  Endpoint:     ${ENDPOINT}\n`);

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList,
};

if (isDryRun) {
  console.log('[DRY-RUN MODE] Payload prepared for dispatch:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\nTo execute live submission, run: pnpm indexnow:submit (or pass --submit)');
} else {
  console.log(`Submitting ${urlList.length} URL(s) to IndexNow endpoint...`);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': 'AdhocX-IndexNow-Client/2.0',
      },
      body: JSON.stringify(payload),
    });

    if (res.status === 200) {
      console.log(`✅ Success: IndexNow accepted URLs (HTTP 200 OK)`);
    } else if (res.status === 202) {
      console.log(`✅ Accepted: IndexNow received URLs for processing (HTTP 202 Accepted)`);
    } else {
      const text = await res.text();
      console.warn(`⚠️ IndexNow responded with HTTP ${res.status}: ${text || res.statusText}`);
    }
  } catch (err) {
    console.error(`❌ Network error submitting to IndexNow: ${err.message}`);
    console.log('Notice: Offline development builds do not require live network access to IndexNow.');
  }
}
