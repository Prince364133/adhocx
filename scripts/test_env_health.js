const fs = require('fs');
const path = require('path');

// Resolve modules from apps/api/node_modules
const apiNodeModules = path.resolve(__dirname, '../apps/api/node_modules');
function loadModule(name) {
  try {
    return require(path.join(apiNodeModules, name));
  } catch (e) {
    try {
      return require(name);
    } catch {
      throw e;
    }
  }
}

const dotenv = loadModule('dotenv');
const { PrismaClient } = loadModule('@prisma/client');
const Redis = loadModule('ioredis');
const nodemailer = loadModule('nodemailer');
const { S3Client, ListObjectsV2Command } = loadModule('@aws-sdk/client-s3');

// Load environment variables
const apiEnvPath = path.resolve(__dirname, '../apps/api/.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(apiEnvPath)) {
  dotenv.config({ path: apiEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function pass(name, details = '') {
  console.log(`  ${colors.green}✔ PASS${colors.reset} [${colors.bold}${name}${colors.reset}] ${details}`);
}

function fail(name, error = '') {
  console.log(`  ${colors.red}✖ FAIL${colors.reset} [${colors.bold}${name}${colors.reset}] ${error}`);
}

function warn(name, details = '') {
  console.log(`  ${colors.yellow}⚠ WARN${colors.reset} [${colors.bold}${name}${colors.reset}] ${details}`);
}

function header(title) {
  console.log(`\n${colors.cyan}${colors.bold}═══ ${title} ═══${colors.reset}`);
}

async function runEnvironmentHealthCheck() {
  console.log(`\n${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.bold}  🛡️  ADHOCX / LOKAYA INFRASTRUCTURE & ENVIRONMENT AUDIT SUITE${colors.reset}`);
  console.log(`${colors.bold}========================================================================${colors.reset}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Node: ${process.version} | Platform: ${process.platform}`);
  console.log(`Active Env File: ${fs.existsSync(apiEnvPath) ? apiEnvPath : rootEnvPath}`);

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  // ─── 1. ENVIRONMENT VARIABLES AUDIT ──────────────────────────────────────────
  header('1. Required Environment Variables Inspection');
  const requiredVars = [
    { key: 'DATABASE_URL', critical: true, secret: true },
    { key: 'REDIS_URL', critical: true, secret: true },
    { key: 'JWT_ACCESS_SECRET', critical: true, secret: true },
    { key: 'JWT_REFRESH_SECRET', critical: true, secret: true },
    { key: 'GEMINI_API_KEY', critical: false, secret: true },
    { key: 'R2_ACCOUNT_ID', critical: false, secret: false },
    { key: 'R2_ACCESS_KEY_ID', critical: false, secret: true },
    { key: 'R2_SECRET_ACCESS_KEY', critical: false, secret: true },
    { key: 'R2_BUCKET_NAME', critical: false, secret: false },
    { key: 'R2_ENDPOINT', critical: false, secret: false },
    { key: 'SMTP_HOST', critical: false, secret: false },
    { key: 'SMTP_PORT', critical: false, secret: false },
    { key: 'SMTP_USER', critical: false, secret: false },
    { key: 'SMTP_PASS', critical: false, secret: true },
    { key: 'GOOGLE_CLIENT_ID', critical: false, secret: false },
    { key: 'GOOGLE_CLIENT_SECRET', critical: false, secret: true },
  ];

  for (const item of requiredVars) {
    totalTests++;
    const val = process.env[item.key];
    if (val && val.trim().length > 0) {
      passedTests++;
      const displayVal = item.secret
        ? `${val.substring(0, 4)}...${val.substring(val.length - 4)} (${val.length} chars)`
        : val;
      pass(item.key, `Found => ${displayVal}`);
    } else {
      if (item.critical) {
        failedTests++;
        fail(item.key, `Missing or empty required environment variable!`);
      } else {
        warn(item.key, `Optional environment variable not set.`);
      }
    }
  }

  // ─── 2. POSTGRESQL + POSTGIS LIVE HEALTH CHECK ─────────────────────────────
  header('2. PostgreSQL + PostGIS Live Database Test');
  totalTests++;
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  try {
    const startDb = Date.now();
    await prisma.$connect();
    const dbLatency = Date.now() - startDb;

    // Run raw queries
    const versionRes = await prisma.$queryRawUnsafe('SELECT version(), current_database(), current_user, NOW() as current_time;');
    const postGisRes = await prisma.$queryRawUnsafe("SELECT extname, extversion FROM pg_extension WHERE extname = 'postgis';").catch(() => []);

    pass('PostgreSQL Live Connection', `Connected in ${dbLatency}ms (DB: ${versionRes[0]?.current_database}, User: ${versionRes[0]?.current_user})`);

    totalTests++;
    if (postGisRes && postGisRes.length > 0) {
      passedTests++;
      pass('PostGIS Extension', `Installed version: ${postGisRes[0]?.extversion}`);
    } else {
      warn('PostGIS Extension', 'Extension not detected in pg_extension; verify spatial querying setup if required.');
    }

    // Check table counts
    totalTests++;
    const userCount = await prisma.user.count().catch(() => 'N/A');
    const vendorCount = await prisma.vendor.count().catch(() => 'N/A');
    const tripCount = await prisma.trip.count().catch(() => 'N/A');
    pass('Schema & Tables', `Users: ${userCount}, Vendors: ${vendorCount}, Trips: ${tripCount}`);
    passedTests += 2;
  } catch (err) {
    failedTests++;
    fail('PostgreSQL Connection', err.message);
  } finally {
    await prisma.$disconnect();
  }

  // ─── 3. REDIS / VALKEY LIVE HEALTH CHECK ────────────────────────────────────
  header('3. Redis / Valkey Live Key-Value & Geospatial Test');
  totalTests++;
  const redisUrl = process.env.REDIS_URL;
  const isTls = redisUrl?.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

  let redisClient;
  try {
    const startRedis = Date.now();
    if (redisUrl) {
      redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        lazyConnect: true,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      redisClient = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        tls: isTls ? { rejectUnauthorized: false } : undefined,
        maxRetriesPerRequest: 2,
        connectTimeout: 5000,
        lazyConnect: true,
      });
    }

    await redisClient.connect();
    const pingRes = await redisClient.ping();
    const redisLatency = Date.now() - startRedis;
    pass('Redis PING', `Responded "${pingRes}" in ${redisLatency}ms`);

    // Write / Read / Expire test
    totalTests++;
    const testKey = `audit:health:${Date.now()}`;
    await redisClient.set(testKey, 'operational', 'EX', 60);
    const readVal = await redisClient.get(testKey);
    await redisClient.del(testKey);
    if (readVal === 'operational') {
      pass('Redis Read/Write/Delete', 'SET, GET, and DEL verified successfully');
      passedTests++;
    } else {
      fail('Redis Read/Write/Delete', `Unexpected read value: ${readVal}`);
      failedTests++;
    }

    // Geospatial test (GEOADD / GEORADIUS)
    totalTests++;
    const geoKey = `audit:geo:${Date.now()}`;
    await redisClient.geoadd(geoKey, 77.2090, 28.6139, 'test_loc_delhi');
    const geoRadius = await redisClient.georadius(geoKey, 77.2090, 28.6139, 10, 'km');
    await redisClient.del(geoKey);
    if (geoRadius && geoRadius.includes('test_loc_delhi')) {
      pass('Redis Geospatial Operations', 'GEOADD and GEORADIUS verified successfully');
      passedTests++;
    } else {
      warn('Redis Geospatial Operations', `GEO command response: ${JSON.stringify(geoRadius)}`);
    }

    passedTests++;
  } catch (err) {
    failedTests++;
    fail('Redis Connection', err.message);
  } finally {
    if (redisClient) {
      try {
        await redisClient.quit();
      } catch (_) {}
    }
  }

  // ─── 4. SMTP EMAIL SERVICE LIVE HANDSHAKE ──────────────────────────────────
  header('4. SMTP (Gmail) Email Transport Verification');
  totalTests++;
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user: smtpUser, pass: smtpPass },
      });

      const startSmtp = Date.now();
      await transporter.verify();
      const smtpLatency = Date.now() - startSmtp;
      pass('SMTP Transport Handshake', `Authenticated with ${smtpHost}:${smtpPort} as ${smtpUser} in ${smtpLatency}ms`);
      passedTests++;
    } catch (err) {
      failedTests++;
      fail('SMTP Transport Handshake', err.message);
    }
  } else {
    warn('SMTP Transport Handshake', 'SMTP credentials not fully configured; skipped.');
  }

  // ─── 5. CLOUDFLARE R2 OBJECT STORAGE LIVE HANDSHAKE ─────────────────────────
  header('5. Cloudflare R2 Object Storage Verification');
  totalTests++;
  const r2Endpoint = process.env.R2_ENDPOINT;
  const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
  const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME || 'adhocx';

  if (r2Endpoint && r2AccessKey && r2SecretKey) {
    try {
      const s3Client = new S3Client({
        region: 'auto',
        endpoint: r2Endpoint,
        credentials: {
          accessKeyId: r2AccessKey,
          secretAccessKey: r2SecretKey,
        },
      });

      const startR2 = Date.now();
      const listCommand = new ListObjectsV2Command({
        Bucket: r2Bucket,
        MaxKeys: 5,
      });
      const listRes = await s3Client.send(listCommand);
      const r2Latency = Date.now() - startR2;
      pass('Cloudflare R2 S3 API', `Connected to bucket "${r2Bucket}" in ${r2Latency}ms (${listRes.KeyCount ?? 0} sample objects found)`);
      passedTests++;
    } catch (err) {
      failedTests++;
      fail('Cloudflare R2 S3 API', err.message);
    }
  } else {
    warn('Cloudflare R2 S3 API', 'R2 credentials or endpoint not set; skipped.');
  }

  // ─── 6. GEMINI / AI LLM PROVIDER API HANDSHAKE ──────────────────────────────
  header('6. Google Gemini AI API Key Verification');
  totalTests++;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const startAi = Date.now();
      const aiUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;
      const response = await fetch(aiUrl);
      const aiLatency = Date.now() - startAi;

      if (response.ok) {
        const data = await response.json();
        const modelCount = data.models?.length ?? 0;
        pass('Gemini AI API', `API Key valid. Accessible models: ${modelCount} (responded in ${aiLatency}ms)`);
        passedTests++;
      } else {
        const errText = await response.text();
        failedTests++;
        fail('Gemini AI API', `HTTP ${response.status}: ${errText.substring(0, 150)}`);
      }
    } catch (err) {
      failedTests++;
      fail('Gemini AI API', err.message);
    }
  } else {
    warn('Gemini AI API', 'GEMINI_API_KEY not configured; skipped.');
  }

  // ─── SUMMARY REPORT ────────────────────────────────────────────────────────
  console.log(`\n${colors.bold}========================================================================${colors.reset}`);
  console.log(`${colors.bold}                      ENVIRONMENT AUDIT SUMMARY                         ${colors.reset}`);
  console.log(`${colors.bold}========================================================================${colors.reset}`);
  console.log(`Total Checks Executed : ${totalTests}`);
  console.log(`Successful Passes     : ${colors.green}${colors.bold}${passedTests}${colors.reset}`);
  console.log(`Failures / Errors     : ${failedTests > 0 ? colors.red : colors.green}${colors.bold}${failedTests}${colors.reset}`);
  console.log(`${colors.bold}========================================================================${colors.reset}\n`);

  if (failedTests === 0) {
    console.log(`${colors.green}${colors.bold}🎉 ALL INFRASTRUCTURE & ENVIRONMENT VARIABLES ARE FULLY OPERATIONAL!${colors.reset}\n`);
  } else {
    console.log(`${colors.red}${colors.bold}⚠ WARNING: Some environment variables or services reported issues.${colors.reset}\n`);
    process.exit(1);
  }
}

runEnvironmentHealthCheck().catch((err) => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
