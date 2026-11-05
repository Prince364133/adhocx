import { Prisma } from '@prisma/client';
import { getActiveTenantId } from '../common/context/tenant.context';

export const TENANT_SCOPED_MODELS = [
  'CorporateEmployee',
  'CorporateRoster',
  'CorporateRoute',
  'CorporateInvoice',
  'CorporateTransportRequest',
  'CorporateSosAlert',
  'CorporateTripFeedback',
  'CorporateSupportTicket',
  'CorporateOffice',
  'CorporateDriverEarning',
];

export const tenantIsolationExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (model && TENANT_SCOPED_MODELS.includes(model)) {
          const activeTenantId = getActiveTenantId();
          if (activeTenantId) {
            if (['findMany', 'findFirst', 'count', 'aggregate', 'updateMany', 'deleteMany'].includes(operation)) {
              const anyArgs = args as any;
              anyArgs.where = { ...(anyArgs.where || {}), tenantId: activeTenantId };
            }
          }
        }
        return query(args);
      },
    },
  },
});
