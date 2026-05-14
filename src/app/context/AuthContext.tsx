import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from '../../utils/api';
import type { ReceptionistDTO } from '../../utils/api';

const RECEPTION_SESSION_KEY = 'cbtea_reception_session';
const ADMIN_SESSION_KEY = 'cbtea_admin_session';

interface StoredSession {
  token: string;
  expiresAt: string;
}

interface AdminUser {
  username: string;
}

interface AuthContextType {
  isHydrating: boolean;
  isAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  currentUser: string | null;
  receptionist: ReceptionistDTO | null;
  admin: AdminUser | null;
  receptionistToken: string | null;
  adminToken: string | null;
  loginReceptionist: (username: string, password: string) => Promise<boolean>;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutReceptionist: () => Promise<void>;
  logoutAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function loadStoredSession(key: string): StoredSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.expiresAt) {
      return null;
    }

    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      sessionStorage.removeItem(key);
      return null;
    }

    return parsed;
  } catch {
    sessionStorage.removeItem(key);
    return null;
  }
}

function storeSession(key: string, session: StoredSession | null) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    sessionStorage.removeItem(key);
    return;
  }

  sessionStorage.setItem(key, JSON.stringify(session));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isHydrating, setIsHydrating] = useState(true);
  const [receptionist, setReceptionist] = useState<ReceptionistDTO | null>(null);
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [receptionistToken, setReceptionistToken] = useState<string | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function hydrateSessions() {
      const [storedReception, storedAdmin] = [
        loadStoredSession(RECEPTION_SESSION_KEY),
        loadStoredSession(ADMIN_SESSION_KEY),
      ];

      try {
        if (storedReception) {
          const session = await api.fetchSession(storedReception.token);
          if (mounted && session.role === 'receptionist') {
            setReceptionistToken(storedReception.token);
            setReceptionist({
              id: session.userId,
              name: session.name || session.username,
              username: session.username,
              unitIds: session.unitIds || [],
              createdAt: new Date().toISOString(),
            });
          }
        }
      } catch {
        storeSession(RECEPTION_SESSION_KEY, null);
      }

      try {
        if (storedAdmin) {
          const session = await api.fetchSession(storedAdmin.token);
          if (mounted && session.role === 'admin') {
            setAdminToken(storedAdmin.token);
            setAdmin({ username: session.username });
          }
        }
      } catch {
        storeSession(ADMIN_SESSION_KEY, null);
      }

      if (mounted) {
        setIsHydrating(false);
      }
    }

    hydrateSessions();
    return () => {
      mounted = false;
    };
  }, []);

  const loginReceptionist = useCallback(async (username: string, password: string) => {
    const response = await api.loginReceptionist(username, password);
    setReceptionist(response.receptionist);
    setReceptionistToken(response.token);
    storeSession(RECEPTION_SESSION_KEY, {
      token: response.token,
      expiresAt: response.expiresAt,
    });
    return true;
  }, []);

  const loginAdmin = useCallback(async (username: string, password: string) => {
    const response = await api.loginAdmin(username, password);
    setAdmin(response.admin);
    setAdminToken(response.token);
    storeSession(ADMIN_SESSION_KEY, {
      token: response.token,
      expiresAt: response.expiresAt,
    });
    return true;
  }, []);

  const logoutReceptionist = useCallback(async () => {
    if (receptionistToken) {
      try {
        await api.logoutSession(receptionistToken);
      } catch (error) {
        console.warn('Failed to close receptionist session on server:', error);
      }
    }

    setReceptionist(null);
    setReceptionistToken(null);
    storeSession(RECEPTION_SESSION_KEY, null);
  }, [receptionistToken]);

  const logoutAdmin = useCallback(async () => {
    if (adminToken) {
      try {
        await api.logoutSession(adminToken);
      } catch (error) {
        console.warn('Failed to close admin session on server:', error);
      }
    }

    setAdmin(null);
    setAdminToken(null);
    storeSession(ADMIN_SESSION_KEY, null);
  }, [adminToken]);

  return (
    <AuthContext.Provider
      value={{
        isHydrating,
        isAuthenticated: Boolean(receptionist && receptionistToken),
        isAdminAuthenticated: Boolean(admin && adminToken),
        currentUser: receptionist?.name || null,
        receptionist,
        admin,
        receptionistToken,
        adminToken,
        loginReceptionist,
        loginAdmin,
        logoutReceptionist,
        logoutAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
