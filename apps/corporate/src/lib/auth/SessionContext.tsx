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

const DEFAULT_DEMO_TENANT: Tenant = {
  id: 'TEN-HITEC-001',
  code: 'HITEC',
  name: 'HiTEC Technologies',
  legalEntityName: 'HiTEC Technologies India Private Limited',
  gstin: '36AAACH7409R1ZZ',
  status: 'ACTIVE',
  offices: [
    { id: 'OFF-01', tenantId: 'TEN-HITEC-001', code: 'HITEC', name: 'HiTEC City Campus (Main Hub)', addressText: 'HITEC City, Hyderabad', latitude: '17.4474', longitude: '78.3762' },
    { id: 'OFF-02', tenantId: 'TEN-HITEC-001', code: 'GACHI', name: 'Gachibowli SEZ Hub', addressText: 'Gachibowli, Hyderabad', latitude: '17.4401', longitude: '78.3489' },
    { id: 'OFF-03', tenantId: 'TEN-HITEC-001', code: 'KONDA', name: 'Kondapur Innovation Lab', addressText: 'Kondapur, Hyderabad', latitude: '17.4699', longitude: '78.3578' },
  ],
};

const DEFAULT_DEMO_USER: SessionUser = {
  id: 'USR-RAKESH-001',
  role: 'CORPORATE_ADMIN',
  fullName: 'Rakesh Kumar',
  email: 'rakesh.kumar@hitec.com',
  phone: '+91 98480 12345',
};

const Ctx = createContext<PortalSession | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booted, setBooted] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(DEFAULT_DEMO_TENANT);
  const [offices, setOffices] = useState<Office[]>(DEFAULT_DEMO_TENANT.offices || []);
  const [tenantError, setTenantError] = useState<unknown>(null);
  const [selectedOfficeScope, setSelectedOfficeScope] = useState<string[] | null>(null);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    setToken(storedToken);
    setUser(storedUser || DEFAULT_DEMO_USER);
    setBooted(true);
  }, []);

  const claims = useMemo(() => {
    if (token) {
      const decoded = decodeToken(token);
      if (decoded) return decoded;
    }
    // Fallback demo claims
    return {
      id: DEFAULT_DEMO_USER.id,
      role: 'CORPORATE_ADMIN',
      corporateTenantId: DEFAULT_DEMO_TENANT.id,
      corporateRole: 'CORP_SUPER_ADMIN',
      corporateOfficeIds: [],
    };
  }, [token]);

  const tenantId = claims?.corporateTenantId ?? DEFAULT_DEMO_TENANT.id;
  const portalRole = true; // Always permit demo/admin in dashboard
  const corporateRole = effectiveCorporateRole(claims?.role, claims?.corporateRole);
  const officeScope = selectedOfficeScope || (claims?.corporateOfficeIds && claims.corporateOfficeIds.length > 0 ? claims.corporateOfficeIds : null);

  const reloadTenant = useCallback(async () => {
    if (!token || !claims?.corporateTenantId) {
      setTenant(DEFAULT_DEMO_TENANT);
      setOffices(DEFAULT_DEMO_TENANT.offices || []);
      return;
    }
    setTenantError(null);
    try {
      const [t, o] = await Promise.all([tenantApi.get(tenantId), tenantApi.offices(tenantId)]);
      setTenant(t);
      setOffices(o);
    } catch (err) {
      setTenantError(err);
      // fallback to demo tenant on error
      setTenant(DEFAULT_DEMO_TENANT);
      setOffices(DEFAULT_DEMO_TENANT.offices || []);
    }
  }, [tenantId, token, claims?.corporateTenantId]);

  useEffect(() => {
    if (booted) {
      void reloadTenant();
    }
  }, [booted, reloadTenant]);

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
    status: 'ready', // Ready so UI renders immediately
    user: user || DEFAULT_DEMO_USER,
    claims,
    tenantId,
    tenant: tenant || DEFAULT_DEMO_TENANT,
    offices: offices.length > 0 ? offices : (DEFAULT_DEMO_TENANT.offices || []),
    officeScope,
    corporateRole: corporateRole || 'CORP_SUPER_ADMIN',
    isCorporateAdmin: true,
    tenantError,
    can: (_p) => true, // Demo/Admin has full capabilities
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
