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
  offices: Office[];
  officeScope: string[] | null;
  corporateRole: CorporateRole | null;
  isCorporateAdmin: boolean;
  tenantError: unknown;
  can: (permission: CorporatePermission) => boolean;
  logout: () => Promise<void>;
  reloadTenant: () => Promise<void>;
  switchOffice?: (officeId: string | null) => void;
}

const Ctx = createContext<PortalSession | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booted, setBooted] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [tenantError, setTenantError] = useState<unknown>(null);
  const [selectedOfficeScope, setSelectedOfficeScope] = useState<string[] | null>(null);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    setToken(storedToken);
    setUser(storedUser);
    setBooted(true);
  }, []);

  const claims = useMemo(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) return decoded;
    }
    return null;
  }, [token]);

  const tenantId = claims?.corporateTenantId ?? null;
  const portalRole = claims?.role ? isPortalRole(claims.role) : false;
  const corporateRole = effectiveCorporateRole(claims?.role, claims?.corporateRole);
  const officeScope = selectedOfficeScope || (claims?.corporateOfficeIds && claims.corporateOfficeIds.length > 0 ? claims.corporateOfficeIds : null);

  const reloadTenant = useCallback(async () => {
    if (!token || !claims?.corporateTenantId) {
      setTenant(null);
      setOffices([]);
      return;
    }
    setTenantError(null);
    try {
      const [t, o] = await Promise.all([tenantApi.get(claims.corporateTenantId), tenantApi.offices(claims.corporateTenantId)]);
      setTenant(t);
      setOffices(o);
    } catch (err) {
      setTenantError(err);
      setTenant(null);
      setOffices([]);
    }
  }, [claims?.corporateTenantId, token]);

  useEffect(() => {
    if (booted && claims?.corporateTenantId) {
      void reloadTenant();
    }
  }, [booted, claims?.corporateTenantId, reloadTenant]);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // ignore
    }
    clearSession();
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, [token]);

  const switchOffice = useCallback((officeId: string | null) => {
    setSelectedOfficeScope(officeId ? [officeId] : null);
  }, []);

  const value: PortalSession = {
    status: !booted ? 'loading' : !token || !user ? 'anonymous' : !portalRole ? 'forbidden' : 'ready',
    user,
    claims,
    tenantId,
    tenant,
    offices,
    officeScope,
    corporateRole: corporateRole || null,
    isCorporateAdmin: corporateRole === 'CORP_SUPER_ADMIN' || corporateRole === 'CORP_ADMIN',
    tenantError,
    can: (p) => roleHas(corporateRole, p),
    logout,
    reloadTenant,
    switchOffice,
  };
    logout,
    reloadTenant,
    switchOffice,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): PortalSession {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSession must be used within SessionProvider');
  return c;
}
