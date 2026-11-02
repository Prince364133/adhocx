/**
 * One-off backfill for migration 20261102000000_corporate_user_tenant_link.
 *
 * Fills the two new columns for rows created before the migration, so existing employees and
 * company admins pass the new corporate access checks:
 *   - corporate_employees.user_id   (which login belongs to which employee)
 *   - users.corporate_tenant_id     (which company a login belongs to)
 *
 * Matching rules (conservative: anything ambiguous is reported, never guessed):
 *   1. An unlinked employee is linked to a user only when exactly ONE user matches by email
 *      (case-insensitive) or phone (last 10 digits), that user is not linked to another employee,
 *      and the user has no company or the same company.
 *   2. A user linked to an employee gets that employee's company if it has none.
 *   3. CORPORATE_ADMIN / CORPORATE_MANAGER users with no company and no employee row cannot be
 *      inferred; they are listed for manual assignment.
 *
 * Dry run by default. Writing needs BOTH flags, and the host must match DATABASE_URL:
 *   node scripts/backfill-corporate-user-links.js
 *   node scripts/backfill-corporate-user-links.js --apply --confirm-host=<db host>
 *   add --json for a machine-readable report.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
};

const normEmail = (e) => (e ? String(e).trim().toLowerCase() : null);
const normPhone = (p) => {
  const digits = p ? String(p).replace(/\D/g, '') : '';
  return digits.length >= 10 ? digits.slice(-10) : null;
};

/** Pure planning step (exported for tests): returns what would change and what needs a human. */
function planBackfill({ employees, users }) {
  const byEmail = new Map();
  const byPhone = new Map();
  const push = (map, key, user) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(user);
  };
  for (const u of users) {
    push(byEmail, normEmail(u.email), u);
    push(byPhone, normPhone(u.phone), u);
  }

  const linkedUserIds = new Set(employees.filter((e) => e.userId).map((e) => e.userId));
  const claimed = new Map(); // userId -> employeeId claimed in this run
  const links = [];
  const ambiguous = [];
  const unmatched = [];
  const conflicts = [];

  for (const e of employees) {
    if (e.userId) continue;
    const candidates = new Map();
    for (const u of byEmail.get(normEmail(e.email)) || []) candidates.set(u.id, u);
    for (const u of byPhone.get(normPhone(e.phoneNumber)) || []) candidates.set(u.id, u);
    const list = [...candidates.values()];
    if (list.length === 0) {
      unmatched.push({ employeeId: e.id, tenantId: e.tenantId, email: e.email });
      continue;
    }
    if (list.length > 1) {
      ambiguous.push({ employeeId: e.id, tenantId: e.tenantId, userIds: list.map((u) => u.id) });
      continue;
    }
    const u = list[0];
    if (linkedUserIds.has(u.id) || claimed.has(u.id)) {
      conflicts.push({ employeeId: e.id, userId: u.id, reason: 'user already linked to another employee' });
      continue;
    }
    if (u.corporateTenantId && u.corporateTenantId !== e.tenantId) {
      conflicts.push({ employeeId: e.id, userId: u.id, reason: `user belongs to another company ${u.corporateTenantId}` });
      continue;
    }
    if (u.role === 'ADMIN' || u.role === 'DRIVER' || u.role === 'VENDOR') {
      conflicts.push({ employeeId: e.id, userId: u.id, reason: `user role ${u.role} is not a corporate role` });
      continue;
    }
    claimed.set(u.id, e.id);
    links.push({ employeeId: e.id, userId: u.id, tenantId: e.tenantId, setTenant: !u.corporateTenantId });
  }

  // Users already linked to an employee but missing the company.
  const tenantFixes = [];
  const userById = new Map(users.map((u) => [u.id, u]));
  for (const e of employees) {
    if (!e.userId) continue;
    const u = userById.get(e.userId);
    if (u && !u.corporateTenantId) tenantFixes.push({ userId: u.id, tenantId: e.tenantId });
  }

  const orphanCorporateUsers = users
    .filter(
      (u) =>
        (u.role === 'CORPORATE_ADMIN' || u.role === 'CORPORATE_MANAGER') &&
        !u.corporateTenantId &&
        !linkedUserIds.has(u.id) &&
        !claimed.has(u.id),
    )
    .map((u) => ({ userId: u.id, email: u.email, role: u.role }));

  return { links, tenantFixes, ambiguous, unmatched, conflicts, orphanCorporateUsers };
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const host = new URL(url).hostname;
  const apply = flag('apply');
  if (apply && opt('confirm-host') !== host) {
    throw new Error(`Refusing to write: pass --confirm-host=${host} to confirm the target database`);
  }

  const prisma = new PrismaClient();
  try {
    const employees = await prisma.corporateEmployee.findMany({
      select: { id: true, tenantId: true, email: true, phoneNumber: true, userId: true },
    });
    const users = await prisma.user.findMany({
      where: { role: { in: ['EMPLOYEE', 'CORPORATE_ADMIN', 'CORPORATE_MANAGER'] } },
      select: { id: true, email: true, phone: true, role: true, corporateTenantId: true },
    });
    const plan = planBackfill({ employees, users });

    const summary = {
      database: host,
      mode: apply ? 'APPLY' : 'DRY_RUN',
      employeesScanned: employees.length,
      usersScanned: users.length,
      employeeLinks: plan.links.length,
      tenantFixes: plan.tenantFixes.length + plan.links.filter((l) => l.setTenant).length,
      ambiguous: plan.ambiguous.length,
      unmatched: plan.unmatched.length,
      conflicts: plan.conflicts.length,
      corporateUsersNeedingManualTenant: plan.orphanCorporateUsers.length,
    };

    if (apply) {
      // Small batches, each in its own transaction, so one bad row never blocks the rest.
      for (const l of plan.links) {
        await prisma.$transaction([
          prisma.corporateEmployee.updateMany({ where: { id: l.employeeId, userId: null }, data: { userId: l.userId } }),
          ...(l.setTenant
            ? [prisma.user.updateMany({ where: { id: l.userId, corporateTenantId: null }, data: { corporateTenantId: l.tenantId } })]
            : []),
        ]);
      }
      for (const f of plan.tenantFixes) {
        await prisma.user.updateMany({ where: { id: f.userId, corporateTenantId: null }, data: { corporateTenantId: f.tenantId } });
      }
    }

    if (flag('json')) {
      console.log(JSON.stringify({ summary, ...plan }, null, 2));
    } else {
      console.table(summary);
      if (plan.ambiguous.length) console.log('Ambiguous (several users match, fix by hand):', plan.ambiguous.slice(0, 50));
      if (plan.conflicts.length) console.log('Conflicts (not linked):', plan.conflicts.slice(0, 50));
      if (plan.orphanCorporateUsers.length) {
        console.log('Corporate admins/managers with no company (set users.corporate_tenant_id by hand):', plan.orphanCorporateUsers);
      }
      if (!apply) console.log(`Dry run only. To write: --apply --confirm-host=${host}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { planBackfill, normEmail, normPhone };

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
