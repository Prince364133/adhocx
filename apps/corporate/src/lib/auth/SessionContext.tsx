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
  acceptSession: (token: string, user: SessionUser) => void;
  reloadTenant: () => Promise<void>;
  switchOffice?: (officeId: string | null) => void;
}

const Ctx = createContext<PortalSession | null>(null);

export function SessionProvider({
  children,
  opsMode = false,
  opsSession,
}: {
  children: React.ReactNode;
  opsMode?: boolean;
  opsSession?: { token: string | null; user: SessionUser | null };
}) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booted, setBooted] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [offices, setOffices] = useState<Office[]>([]);
  const [tenantError, setTenantError] = useState<unknown>(null);
  const [selectedOfficeScope, setSelectedOfficeScope] = useState<string[] | null>(null);
  const [opsTenantId, setOpsTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = opsMode ? opsSession?.token ?? null : getStoredToken();
    const storedUser = opsMode ? opsSession?.user ?? null : getStoredUser();
    setToken(storedToken);
    setUser(storedUser);
    setBooted(true);
  }, [opsMode, opsSession?.token, opsSession?.user]);

  useEffect(() => {
    if (!opsMode) return;

    const syncOpsTenant = () => {
      try {
        setOpsTenantId(localStorage.getItem('adhocx_ops_selected_tenant'));
      } catch {
        setOpsTenantId(null);
      }
    };

    syncOpsTenant();
    window.addEventListener('adhocx:ops-tenant-changed', syncOpsTenant);
    return () => window.removeEventListener('adhocx:ops-tenant-changed', syncOpsTenant);
  }, [opsMode]);

  const claims = useMemo(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) return decoded;
    }
    return null;
  }, [token]);

  const tenantId = opsMode ? opsTenantId ?? claims?.corporateTenantId ?? null : claims?.corporateTenantId ?? null;
  const portalRole = claims?.role
    ? isPortalRole(claims.role) || (opsMode && ['ADMIN', 'OPS'].includes(claims.role.toUpperCase()))
    : false;
  const corporateRole =
    opsMode && claims?.role && ['ADMIN', 'OPS'].includes(claims.role.toUpperCase())
      ? 'CORP_SUPER_ADMIN'
      : effectiveCorporateRole(claims?.role, claims?.corporateRole);
  const officeScope = selectedOfficeScope || (claims?.corporateOfficeIds && claims.corporateOfficeIds.length > 0 ? claims.corporateOfficeIds : null);

  const acceptSession = useCallback((accessToken: string, sessionUser: SessionUser) => {
    setToken(accessToken);
    setUser(sessionUser);
  }, []);

  const reloadTenant = useCallback(async () => {
    if (!token || !tenantId) {
      setTenant(null);
      setOffices([]);
      return;
    }
    setTenantError(null);
    try {
      const [t, o] = await Promise.all([tenantApi.get(tenantId), tenantApi.offices(tenantId)]);
      setTenant(t);
      setOffices(o);
    } catch (err) {
      setTenantError(err);
      setTenant(null);
      setOffices([]);
    }
  }, [tenantId, token]);

  useEffect(() => {
    if (booted && tenantId && (claims?.corporateTenantId || opsMode)) {
      void reloadTenant();
    }
  }, [booted, claims?.corporateTenantId, opsMode, reloadTenant, tenantId]);

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
    isCorporateAdmin: corporateRole === 'CORP_SUPER_ADMIN',
    tenantError,
    can: (p) => roleHas(corporateRole, p),
    logout,
    acceptSession,
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
