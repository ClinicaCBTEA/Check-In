import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as api from '../../utils/api';
import type { UnitDTO } from '../../utils/api';

export interface Receptionist {
  id: string;
  name: string;
  username: string;
  password: string;
  unitIds: string[];
  createdAt: Date;
}

interface AdminCredentials {
  username: string;
  password: string;
}

interface UserManagementContextType {
  units: UnitDTO[];
  receptionists: Receptionist[];
  adminCredentials: AdminCredentials;
  refreshUnits: () => Promise<void>;
  addUnit: (payload: { slug: string; name: string; address: string; id?: string }) => Promise<boolean>;
  updateUnitRecord: (id: string, updates: { name?: string; address?: string; slug?: string }) => Promise<boolean>;
  removeUnit: (id: string) => Promise<void>;
  addReceptionist: (name: string, username: string, password: string, unitIds: string[]) => Promise<boolean>;
  updateReceptionistUnits: (id: string, unitIds: string[]) => Promise<boolean>;
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
  unitIds: ['unidadebarra', 'unidadesantoamaro', 'unidadeinga'],
  createdAt: new Date('2024-01-01T00:00:00.000Z')
};

const UNITS_STORAGE_KEY = 'units_backup';

const DEFAULT_UNITS: UnitDTO[] = [
  {
    id: 'unidadebarra',
    slug: 'unidadebarra',
    name: 'Unidade Barra',
    address: 'Endereço da unidade Barra (configure no admin)',
  },
  {
    id: 'unidadesantoamaro',
    slug: 'unidadesantoamaro',
    name: 'Unidade Santo Amaro',
    address: 'Endereço da unidade Santo Amaro (configure no admin)',
  },
  {
    id: 'unidadeinga',
    slug: 'unidadeinga',
    name: 'Unidade Inga',
    address: 'Endereço da unidade Inga (configure no admin)',
  },
];

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
  const unitIds =
    Array.isArray(rec.unitIds) && rec.unitIds.length > 0
      ? rec.unitIds
      : ['unidadebarra', 'unidadesantoamaro', 'unidadeinga'];
  return {
    ...rec,
    unitIds,
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

function loadStoredUnits(): UnitDTO[] {
  if (typeof window === 'undefined') {
    return DEFAULT_UNITS;
  }
  try {
    const stored = localStorage.getItem(UNITS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_UNITS;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_UNITS;
    }
    return parsed;
  } catch {
    return DEFAULT_UNITS;
  }
}

function storeUnits(units: UnitDTO[]) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(UNITS_STORAGE_KEY, JSON.stringify(units));
}

export function UserManagementProvider({ children }: { children: ReactNode }) {
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => loadStoredAdminCredentials());

  const [receptionists, setReceptionists] = useState<Receptionist[]>(() => loadStoredReceptionists());
  const [units, setUnits] = useState<UnitDTO[]>(() => loadStoredUnits());

  useEffect(() => {
    refreshReceptionists();
    refreshUnits();
    loadAdminCredentials();
  }, []);

  const refreshUnits = async () => {
    try {
      const data = await api.fetchUnits();
      setUnits(data);
      storeUnits(data);
    } catch (error) {
      console.error('Error fetching units:', error);
      setUnits(loadStoredUnits());
    }
  };

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

  const addReceptionist = async (
    name: string,
    username: string,
    password: string,
    unitIds: string[]
  ): Promise<boolean> => {
    try {
      await api.addReceptionist(name, username, password, unitIds);
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
        unitIds,
        createdAt: new Date()
      };

      const updatedReceptionists = [...receptionists, newReceptionist];
      setReceptionists(updatedReceptionists);
      storeReceptionists(updatedReceptionists);
      return true;
    }
  };

  const updateReceptionistUnits = async (id: string, unitIds: string[]): Promise<boolean> => {
    try {
      await api.updateReceptionist(id, { unitIds });
      await refreshReceptionists();
      return true;
    } catch (error) {
      console.error('Error updating receptionist units:', error);
      if (!shouldUseLocalFallback(error)) {
        return false;
      }
      const updated = receptionists.map((r) =>
        r.id === id ? { ...r, unitIds } : r
      );
      setReceptionists(updated);
      storeReceptionists(updated);
      return true;
    }
  };

  const addUnit = async (payload: {
    slug: string;
    name: string;
    address: string;
    id?: string;
  }): Promise<boolean> => {
    try {
      await api.createUnit(payload);
      await refreshUnits();
      return true;
    } catch (error) {
      console.error('Error creating unit:', error);
      if (!shouldUseLocalFallback(error)) {
        return false;
      }
      const id = payload.id || payload.slug;
      if (units.some((u) => u.id === id)) {
        return false;
      }
      const u: UnitDTO = {
        id,
        slug: payload.slug,
        name: payload.name,
        address: payload.address,
      };
      const next = [...units, u];
      setUnits(next);
      storeUnits(next);
      return true;
    }
  };

  const updateUnitRecord = async (
    id: string,
    updates: { name?: string; address?: string; slug?: string }
  ): Promise<boolean> => {
    try {
      await api.updateUnit(id, updates);
      await refreshUnits();
      return true;
    } catch (error) {
      console.error('Error updating unit:', error);
      if (!shouldUseLocalFallback(error)) {
        return false;
      }
      const next = units.map((u) =>
        u.id === id ? { ...u, ...updates } : u
      );
      setUnits(next);
      storeUnits(next);
      return true;
    }
  };

  const removeUnit = async (id: string): Promise<void> => {
    try {
      await api.deleteUnit(id);
      await refreshUnits();
    } catch (error) {
      console.error('Error removing unit:', error);
      if (!shouldUseLocalFallback(error)) {
        throw error;
      }
      const next = units.filter((u) => u.id !== id);
      setUnits(next);
      storeUnits(next);
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
      units,
      receptionists,
      adminCredentials,
      refreshUnits,
      addUnit,
      updateUnitRecord,
      removeUnit,
      addReceptionist,
      updateReceptionistUnits,
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
