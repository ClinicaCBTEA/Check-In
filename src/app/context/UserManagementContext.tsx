import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as api from '../../utils/api';
import type {
  AdminCredentialsPreviewDTO,
  ReceptionistDTO,
  UnitDTO,
} from '../../utils/api';
import { useAuth } from './AuthContext';

interface UserManagementContextType {
  units: UnitDTO[];
  receptionists: ReceptionistDTO[];
  adminCredentials: AdminCredentialsPreviewDTO;
  refreshUnits: () => Promise<void>;
  addUnit: (payload: { slug: string; name: string; address: string; id?: string }) => Promise<boolean>;
  updateUnitRecord: (id: string, updates: { name?: string; address?: string; slug?: string }) => Promise<boolean>;
  removeUnit: (id: string) => Promise<void>;
  addReceptionist: (name: string, username: string, password: string, unitIds: string[]) => Promise<boolean>;
  updateReceptionistUnits: (id: string, unitIds: string[]) => Promise<boolean>;
  removeReceptionist: (id: string) => Promise<void>;
  updateAdminCredentials: (newUsername: string, newPassword: string) => Promise<boolean>;
  refreshReceptionists: () => Promise<void>;
}

const UserManagementContext = createContext<UserManagementContextType | undefined>(undefined);
const UNITS_STORAGE_KEY = 'units_backup';

const DEFAULT_UNITS: UnitDTO[] = [
  {
    id: 'unidadebarra',
    slug: 'unidadebarra',
    name: 'Unidade Barra',
    address: 'Endereco da unidade Barra (configure no admin)',
  },
  {
    id: 'unidadesantoamaro',
    slug: 'unidadesantoamaro',
    name: 'Unidade Santo Amaro',
    address: 'Endereco da unidade Santo Amaro (configure no admin)',
  },
  {
    id: 'unidadeinga',
    slug: 'unidadeinga',
    name: 'Unidade Inga',
    address: 'Endereco da unidade Inga (configure no admin)',
  },
];

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

    return parsed as UnitDTO[];
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
  const { adminToken, isAdminAuthenticated } = useAuth();
  const [units, setUnits] = useState<UnitDTO[]>(() => loadStoredUnits());
  const [receptionists, setReceptionists] = useState<ReceptionistDTO[]>([]);
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentialsPreviewDTO>({
    username: '',
    passwordConfigured: false,
  });

  useEffect(() => {
    refreshUnits();
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated || !adminToken) {
      setReceptionists([]);
      setAdminCredentials({
        username: '',
        passwordConfigured: false,
      });
      return;
    }

    refreshReceptionists();
    loadAdminCredentials();
  }, [adminToken, isAdminAuthenticated]);

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
    if (!adminToken) {
      setReceptionists([]);
      return;
    }

    try {
      const data = await api.fetchReceptionists(adminToken);
      setReceptionists(data);
    } catch (error) {
      console.error('Error fetching receptionists:', error);
      setReceptionists([]);
    }
  };

  const loadAdminCredentials = async () => {
    if (!adminToken) {
      setAdminCredentials({
        username: '',
        passwordConfigured: false,
      });
      return;
    }

    try {
      const credentials = await api.fetchAdminCredentials(adminToken);
      setAdminCredentials(credentials);
    } catch (error) {
      console.error('Error fetching admin credentials:', error);
      setAdminCredentials({
        username: '',
        passwordConfigured: false,
      });
    }
  };

  const addReceptionist = async (
    name: string,
    username: string,
    password: string,
    unitIds: string[],
  ): Promise<boolean> => {
    if (!adminToken) {
      return false;
    }

    try {
      await api.addReceptionist(name, username, password, unitIds, adminToken);
      await refreshReceptionists();
      return true;
    } catch (error) {
      console.error('Error adding receptionist:', error);
      return false;
    }
  };

  const updateReceptionistUnits = async (id: string, unitIds: string[]): Promise<boolean> => {
    if (!adminToken) {
      return false;
    }

    try {
      await api.updateReceptionist(id, { unitIds }, adminToken);
      await refreshReceptionists();
      return true;
    } catch (error) {
      console.error('Error updating receptionist units:', error);
      return false;
    }
  };

  const addUnit = async (payload: {
    slug: string;
    name: string;
    address: string;
    id?: string;
  }): Promise<boolean> => {
    if (!adminToken) {
      return false;
    }

    try {
      await api.createUnit(payload, adminToken);
      await refreshUnits();
      return true;
    } catch (error) {
      console.error('Error creating unit:', error);
      return false;
    }
  };

  const updateUnitRecord = async (
    id: string,
    updates: { name?: string; address?: string; slug?: string },
  ): Promise<boolean> => {
    if (!adminToken) {
      return false;
    }

    try {
      await api.updateUnit(id, updates, adminToken);
      await refreshUnits();
      return true;
    } catch (error) {
      console.error('Error updating unit:', error);
      return false;
    }
  };

  const removeUnit = async (id: string): Promise<void> => {
    if (!adminToken) {
      throw new Error('Admin session is required');
    }

    await api.deleteUnit(id, adminToken);
    await refreshUnits();
  };

  const removeReceptionist = async (id: string): Promise<void> => {
    if (!adminToken) {
      throw new Error('Admin session is required');
    }

    await api.deleteReceptionist(id, adminToken);
    await refreshReceptionists();
  };

  const updateAdminCredentials = async (
    newUsername: string,
    newPassword: string,
  ): Promise<boolean> => {
    if (!adminToken) {
      return false;
    }

    try {
      const updatedCredentials = await api.updateAdminCredentials(
        newUsername,
        newPassword,
        adminToken,
      );
      setAdminCredentials(updatedCredentials);
      return true;
    } catch (error) {
      console.error('Error updating admin credentials:', error);
      return false;
    }
  };

  return (
    <UserManagementContext.Provider
      value={{
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
        updateAdminCredentials,
        refreshReceptionists,
      }}
    >
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
