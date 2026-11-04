'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { tenantApi, authApi } from '../api/corporate';
import type { Office, Tenant } from '../api/types';
import { CorporatePermission, CorporateRole, effectiveCorporateRole, roleHas } from './permissions';
import { clearSession, decodeToken, getStoredToken, getStoredUser, isPortalRole, SessionUser, TokenClaims } from './session';

export interface PortalSession {
  status: 'loading' | 'anonymous' | 'forbidden' | 'ready';
  user: SessionUser | null;
  claims: TokenClaims | null;
  tenantId: string | null;
  tenant: Tenant | null;
  /** Offices the user may see (the API already applies the office scope). */
  offices: Office[];
  /** null = all offices of the tenant */
  officeScope: string[] | null;
  corporateRole: CorporateRole | null;
  /** UserRole CORPORATE_ADMIN (some endpoints check the UserRole, not the corporate permission). */
  isCorporateAdmin: boolean;
  tenantError: unknown;
  can: (permission: CorporatePermission) => boolean;
  logout: () => Promise<void>;
  reloadTenant: () => Promise<void>;
}

const Ctx = createContext<PortalSession | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booted, setBooted] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [tenantError, setTenantError] = useState<unknown>(null);

  useEffect(() => {
    setToken(getStoredToken());
    setUser(getStoredUser());
    setBooted(true);
  }, []);

  const claims = useMemo(() => decodeToken(token), [token]);
  const tenantId = claims?.corporateTenantId ?? null;
  const portalRole = isPortalRole(claims?.role);
  const corporateRole = portalRole ? effectiveCorporateRole(claims?.role, claims?.corporateRole) : null;
  const officeScope = claims?.corporateOfficeIds && claims.corporateOfficeIds.length > 0 ? claims.corporateOfficeIds : null;

  const reloadTenant = useCallback(async () => {
    if (!tenantId || !portalRole) return;
    setTenantError(null);
    try {
      const [t, o] = await Promise.all([tenantApi.get(tenantId), tenantApi.offices(tenantId)]);
      setTenant(t);
      setOffices(o);
    } catch (err) {
      setTenantError(err);
    }
  }, [tenantId, portalRole]);

  useEffect(() => {
    void reloadTenant();
  }, [reloadTenant]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // the local session is cleared regardless; the token expires server side
    }
    clearSession();
    window.location.href = '/login';
  }, []);

  const status: PortalSession['status'] = !booted
    ? 'loading'
    : !token || !claims
      ? 'anonymous'
      : !portalRole || !tenantId
        ? 'forbidden'
        : 'ready';

  const value: PortalSession = {
    status,
    user,
    claims,
    tenantId,
    tenant,
    offices,
    officeScope,
    corporateRole,
    isCorporateAdmin: String(claims?.role ?? '').toUpperCase() === 'CORPORATE_ADMIN',
    tenantError,
    can: (p) => roleHas(corporateRole, p),
    logout,
    reloadTenant,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): PortalSession {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSession must be used inside SessionProvider');
  return v;
}

/** For pages: the tenant id is guaranteed once the shell renders a page (status 'ready'). */
export function useTenantId(): string {
  return useSession().tenantId ?? '';
}
