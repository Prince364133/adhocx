// eslint-disable-next-line @typescript-eslint/no-var-requires
const { planBackfill, normPhone } = require('../scripts/backfill-corporate-user-links.js');

/** Matching rules of the one-off corporate user <-> employee / tenant backfill (pure planning step). */
describe('corporate user backfill planning', () => {
  const emp = (id: string, extra: Record<string, any> = {}) => ({
    id,
    tenantId: 't1',
    email: `${id}@acme.com`,
    phoneNumber: '+91 90000 0000' + id.slice(-1),
    userId: null,
    ...extra,
  });
  const user = (id: string, extra: Record<string, any> = {}) => ({
    id,
    email: null,
    phone: null,
    role: 'EMPLOYEE',
    corporateTenantId: null,
    ...extra,
  });

  it('links by email case-insensitively and sets the company', () => {
    const plan = planBackfill({ employees: [emp('e1')], users: [user('u1', { email: 'E1@ACME.com' })] });
    expect(plan.links).toEqual([{ employeeId: 'e1', userId: 'u1', tenantId: 't1', setTenant: true }]);
  });

  it('links by phone on the last 10 digits regardless of formatting', () => {
    expect(normPhone('+91 90000-00001')).toBe('9000000001');
    const plan = planBackfill({ employees: [emp('e1', { email: 'x@y.z' })], users: [user('u1', { phone: '9000000001' })] });
    expect(plan.links).toHaveLength(1);
  });

  it('email and phone pointing at the same user is one match, not ambiguous', () => {
    const plan = planBackfill({
      employees: [emp('e1')],
      users: [user('u1', { email: 'e1@acme.com', phone: '+919000000001' })],
    });
    expect(plan.links).toHaveLength(1);
    expect(plan.ambiguous).toHaveLength(0);
  });

  it('two different users matching is reported as ambiguous and not linked', () => {
    const plan = planBackfill({
      employees: [emp('e1')],
      users: [user('u1', { email: 'e1@acme.com' }), user('u2', { phone: '9000000001' })],
    });
    expect(plan.links).toHaveLength(0);
    expect(plan.ambiguous[0]).toMatchObject({ employeeId: 'e1', userIds: ['u1', 'u2'] });
  });

  it('never links a user that already belongs to another employee or company, or to a non-corporate role', () => {
    const plan = planBackfill({
      employees: [
        emp('e1'),
        emp('e2'),
        emp('e3'),
        emp('e9', { userId: 'u1', email: 'other@acme.com', phoneNumber: '1' }),
      ],
      users: [
        user('u1', { email: 'e1@acme.com' }),
        user('u2', { email: 'e2@acme.com', corporateTenantId: 't2' }),
        user('u3', { email: 'e3@acme.com', role: 'DRIVER' }),
      ],
    });
    expect(plan.links).toHaveLength(0);
    expect(plan.conflicts.map((c: any) => c.employeeId).sort()).toEqual(['e1', 'e2', 'e3']);
  });

  it('one user matching two employees is linked to the first only', () => {
    const plan = planBackfill({
      employees: [emp('e1', { email: 'shared@acme.com' }), emp('e2', { email: 'shared@acme.com', phoneNumber: '2' })],
      users: [user('u1', { email: 'shared@acme.com' })],
    });
    expect(plan.links.map((l: any) => l.employeeId)).toEqual(['e1']);
    expect(plan.conflicts[0]).toMatchObject({ employeeId: 'e2' });
  });

  it('fills the company for users already linked to an employee', () => {
    const plan = planBackfill({
      employees: [emp('e1', { userId: 'u1' })],
      users: [user('u1')],
    });
    expect(plan.tenantFixes).toEqual([{ userId: 'u1', tenantId: 't1' }]);
  });

  it('lists company admins it cannot place instead of guessing', () => {
    const plan = planBackfill({ employees: [], users: [user('a1', { role: 'CORPORATE_ADMIN', email: 'hr@acme.com' })] });
    expect(plan.orphanCorporateUsers).toEqual([{ userId: 'a1', email: 'hr@acme.com', role: 'CORPORATE_ADMIN' }]);
  });

  it('employees with no matching login are reported as unmatched', () => {
    const plan = planBackfill({ employees: [emp('e1')], users: [] });
    expect(plan.unmatched).toEqual([{ employeeId: 'e1', tenantId: 't1', email: 'e1@acme.com' }]);
  });
});
