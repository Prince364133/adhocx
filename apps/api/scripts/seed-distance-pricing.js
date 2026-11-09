/**
 * One-time load of starting distance pricing plans into an empty database.
 *
 * Rates are data, not code: they come from prisma/seed-data/distance-pricing-initial.json (or the
 * file passed with --file=). A plan is created only for a vehicle category that has NO pricing
 * plan at all, so re-running never overwrites prices an admin has set. After this, prices are
 * changed only in Admin > Pricing Management (draft -> publish), which keeps versions and audit.
 *
 *   node scripts/seed-distance-pricing.js --confirm-host=<database host> [--file=path.json] [--dry-run]
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { requireConfirmedDatabase } = require('./_db-guard');

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

/** Same rules the API enforces (contiguous from 0, no gaps/overlaps, integer paise, payout <= charge). */
function validateSlabs(category, slabs) {
  if (!Array.isArray(slabs) || slabs.length === 0) throw new Error(`${category}: at least one slab is required`);
  const sorted = [...slabs].sort((a, b) => a.minDistanceMExclusive - b.minDistanceMExclusive);
  if (sorted[0].minDistanceMExclusive !== 0) throw new Error(`${category}: the first slab must start at 0 m`);
  sorted.forEach((s, i) => {
    const n = i + 1;
    for (const k of ['minDistanceMExclusive', 'maxDistanceMInclusive', 'vendorPricePaise', 'driverPayoutPaise']) {
      if (!Number.isInteger(s[k])) throw new Error(`${category} slab #${n}: ${k} must be an integer`);
    }
    if (s.maxDistanceMInclusive <= s.minDistanceMExclusive) throw new Error(`${category} slab #${n}: end must be after start`);
    if (s.vendorPricePaise <= 0 || s.driverPayoutPaise <= 0) throw new Error(`${category} slab #${n}: amounts must be positive`);
    if (s.driverPayoutPaise > s.vendorPricePaise) throw new Error(`${category} slab #${n}: payout exceeds vendor charge`);
    if (i > 0 && s.minDistanceMExclusive !== sorted[i - 1].maxDistanceMInclusive) {
      throw new Error(`${category} slabs #${i} and #${n} must meet exactly (no gap or overlap)`);
    }
  });
  return sorted;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) requireConfirmedDatabase({ destructive: false });

  const file = path.resolve(arg('file') || path.join(__dirname, '..', 'prisma', 'seed-data', 'distance-pricing-initial.json'));
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const plans = (data.plans || []).map((p) => ({
    vehicleCategory: String(p.vehicleCategory || '').trim().toUpperCase(),
    name: p.name,
    slabs: validateSlabs(p.vehicleCategory, p.slabs),
  }));
  console.log(`Loaded ${plans.length} plan(s) from ${file}`);
  if (dryRun) {
    plans.forEach((p) => console.log(`  ${p.vehicleCategory}: ${p.slabs.length} slabs (valid)`));
    console.log('Dry run: nothing written.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    for (const p of plans) {
      const existing = await prisma.pricingPlan.count({ where: { vehicleCategory: p.vehicleCategory } });
      if (existing > 0) {
        console.log(`  ${p.vehicleCategory}: already has ${existing} plan(s); skipped (prices are managed in the admin panel).`);
        continue;
      }
      const plan = await prisma.$transaction(async (tx) => {
        const now = new Date();
        const created = await tx.pricingPlan.create({
          data: {
            vehicleCategory: p.vehicleCategory,
            version: '1',
            name: p.name || `${p.vehicleCategory} distance plan v1`,
            status: 'ACTIVE',
            effectiveFrom: now,
            createdBy: 'SEED_SCRIPT',
            publishedBy: 'SEED_SCRIPT',
            publishedAt: now,
            slabs: {
              create: p.slabs.map((s, idx) => ({
                minDistanceMExclusive: s.minDistanceMExclusive,
                maxDistanceMInclusive: s.maxDistanceMInclusive,
                vendorPricePaise: s.vendorPricePaise,
                driverPayoutPaise: s.driverPayoutPaise,
                active: true,
                sortOrder: idx,
              })),
            },
          },
        });
        await tx.pricingAudit.create({
          data: {
            actorId: 'SYSTEM',
            actorName: 'Seed script',
            action: 'SEED_INITIAL_PLAN',
            entityId: created.id,
            newValueJson: { vehicleCategory: p.vehicleCategory, version: '1', slabs: p.slabs, source: path.basename(file) },
            reason: 'Initial rates loaded from seed data file',
          },
        });
        return created;
      });
      console.log(`  ${p.vehicleCategory}: created ACTIVE plan ${plan.id} with ${p.slabs.length} slabs.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
