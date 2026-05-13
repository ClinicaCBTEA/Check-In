import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../../utils/api';

export interface Receptionist {
  id: string;
  name: string;
  username: string;
  password: string;
  createdAt: Date;
}

interface AdminCredentials {
  username: string;
  password: string;
}

interface UserManagementContextType {
  receptionists: Receptionist[];
  adminCredentials: AdminCredentials;
  addReceptionist: (name: string, username: string, password: string) => Promise<boolean>;
  removeReceptionist: (id: string) => Promise<void>;
  validateReceptionist: (username: string, password: string) => Promise<Receptionist | null>;
  updateAdminCredentials: (newUsername: string, newPassword: string) => Promise<boolean>;
  validateAdmin: (username: string, password: string) => Promise<boolean>;
  refreshReceptionists: () => Promise<void>;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = 'admin_credentials_backup';
const RECEPTIONISTS_STORAGE_KEY = 'receptionists_backup';

const DEFAULT_ADMIN_CREDENTIALS: AdminCredentials = {
  username: 'admin',
  password: 'admin123'
};

const DEFAULT_RECEPTIONIST: Receptionist = {
  id: 'rec-1',
  name: 'Recepcao Principal',
  username: 'recepcao',
  password: 'cbtea2024',
  createdAt: new Date('2024-01-01T00:00:00.000Z')
};

function shouldUseLocalFallback(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Failed to fetch') ||
    message.includes('404') ||
    message.includes('500') ||
    message.includes('502') ||
    message.includes('503')
  );
}

function parseReceptionist(rec: any): Receptionist {
  return {
    ...rec,
    createdAt: new Date(rec.createdAt)
  };
}

function serializeReceptionists(receptionists: Receptionist[]) {
  return receptionists.map((receptionist) => ({
    ...receptionist,
    createdAt: receptionist.createdAt.toISOString()
  }));
}

function loadStoredAdminCredentials(): AdminCredentials {
  if (typeof window === 'undefined') {
    return DEFAULT_ADMIN_CREDENTIALS;
  }

  try {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_ADMIN_CREDENTIALS;
    }

    const parsed = JSON.parse(stored);
    if (!parsed?.username || !parsed?.password) {
      return DEFAULT_ADMIN_CREDENTIALS;
    }

    return {
      username: parsed.username,
      password: parsed.password
    };
  } catch (error) {
    console.error('Error loading admin credentials backup:', error);
    return DEFAULT_ADMIN_CREDENTIALS;
  }
}

function storeAdminCredentials(credentials: AdminCredentials) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(credentials));
}

function loadStoredReceptionists(): Receptionist[] {
  if (typeof window === 'undefined') {
    return [DEFAULT_RECEPTIONIST];
  }

  try {
    const stored = localStorage.getItem(RECEPTIONISTS_STORAGE_KEY);
    if (!stored) {
      return [DEFAULT_RECEPTIONIST];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_RECEPTIONIST];
    }

    return parsed.map(parseReceptionist);
  } catch (error) {
    console.error('Error loading receptionists backup:', error);
    return [DEFAULT_RECEPTIONIST];
  }
}

function storeReceptionists(receptionists: Receptionist[]) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    RECEPTIONISTS_STORAGE_KEY,
    JSON.stringify(serializeReceptionists(receptionists))
  );
}

export function UserManagementProvider({ children }: { children: ReactNode }) {
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => loadStoredAdminCredentials());

  const [receptionists, setReceptionists] = useState<Receptionist[]>(() => loadStoredReceptionists());

  useEffect(() => {
    refreshReceptionists();
    loadAdminCredentials();
  }, []);

  const refreshReceptionists = async () => {
    try {
      const data = await api.fetchReceptionists();
      const parsedReceptionists = data.map(parseReceptionist);
      setReceptionists(parsedReceptionists);
      storeReceptionists(parsedReceptionists);
    } catch (error) {
      console.error('Error fetching receptionists:', error);
      setReceptionists(loadStoredReceptionists());
    }
  };

  const loadAdminCredentials = async () => {
    try {
      const creds = await api.fetchAdminCredentials();
      setAdminCredentials(creds);
      storeAdminCredentials(creds);
    } catch (error) {
      console.error('Error fetching admin credentials:', error);
      setAdminCredentials(loadStoredAdminCredentials());
    }
  };

  const addReceptionist = async (name: string, username: string, password: string): Promise<boolean> => {
    try {
      await api.addReceptionist(name, username, password);
      await refreshReceptionists();
      return true;
    } catch (error) {
      console.error('Error adding receptionist:', error);
      if (!shouldUseLocalFallback(error)) {
        return false;
      }

      const usernameExists = receptionists.some((receptionist) => receptionist.username === username);
      if (usernameExists) {
        return false;
      }

      const newReceptionist: Receptionist = {
        id: `rec-${Date.now()}`,
        name,
        username,
        password,
        createdAt: new Date()
      };

      const updatedReceptionists = [...receptionists, newReceptionist];
      setReceptionists(updatedReceptionists);
      storeReceptionists(updatedReceptionists);
      return true;
    }
  };

  const removeReceptionist = async (id: string): Promise<void> => {
    try {
      await api.deleteReceptionist(id);
      await refreshReceptionists();
    } catch (error) {
      console.error('Error removing receptionist:', error);
      if (!shouldUseLocalFallback(error)) {
        throw error;
      }

      const updatedReceptionists = receptionists.filter((receptionist) => receptionist.id !== id);
      setReceptionists(updatedReceptionists);
      storeReceptionists(updatedReceptionists);
    }
  };

  const validateReceptionist = async (username: string, password: string): Promise<Receptionist | null> => {
    try {
      const receptionist = await api.validateReceptionist(username, password);
      return parseReceptionist(receptionist);
    } catch (error) {
      console.error('Error validating receptionist:', error);
      if (!shouldUseLocalFallback(error)) {
        return null;
      }

      const localReceptionists = receptionists.length > 0 ? receptionists : loadStoredReceptionists();
      return (
        localReceptionists.find(
          (receptionist) => receptionist.username === username && receptionist.password === password
        ) || null
      );
    }
  };

  const updateAdminCredentials = async (newUsername: string, newPassword: string): Promise<boolean> => {
    try {
      if (!newUsername || !newPassword) {
        return false;
      }
      await api.updateAdminCredentials(newUsername, newPassword);
      setAdminCredentials({ username: newUsername, password: newPassword });
      storeAdminCredentials({ username: newUsername, password: newPassword });
      return true;
    } catch (error) {
      console.error('Error updating admin credentials:', error);
      if (!shouldUseLocalFallback(error)) {
        return false;
      }

      const updatedCredentials = {
        username: newUsername,
        password: newPassword
      };
      setAdminCredentials(updatedCredentials);
      storeAdminCredentials(updatedCredentials);
      return true;
    }
  };

  const validateAdmin = async (username: string, password: string): Promise<boolean> => {
    try {
      await api.validateAdmin(username, password);
      return true;
    } catch (error) {
      console.error('Error validating admin:', error);
      if (!shouldUseLocalFallback(error)) {
        return false;
      }

      const localCredentials = adminCredentials.username
        ? adminCredentials
        : loadStoredAdminCredentials();
      return (
        username === localCredentials.username &&
        password === localCredentials.password
      );
    }
  };

  return (
    <UserManagementContext.Provider value={{
      receptionists,
      adminCredentials,
      addReceptionist,
      removeReceptionist,
      validateReceptionist,
      updateAdminCredentials,
      validateAdmin,
      refreshReceptionists
    }}>
      {children}
    </UserManagementContext.Provider>
  );
}

export function useUserManagement() {
  const context = useContext(UserManagementContext);
  if (!context) {
    throw new Error('useUserManagement must be used within UserManagementProvider');
  }
  return context;
}
