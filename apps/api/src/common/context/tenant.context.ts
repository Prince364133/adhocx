import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
  userId?: string;
  role?: string;
}

export const tenantStorage = new AsyncLocalStorage<TenantStore>();

export function getActiveTenantId(): string | undefined {
  return tenantStorage.getStore()?.tenantId;
}

export function getActiveTenantStore(): TenantStore | undefined {
  return tenantStorage.getStore();
}

export function runWithTenantContext<T>(store: TenantStore, callback: () => T): T {
  return tenantStorage.run(store, callback);
}

