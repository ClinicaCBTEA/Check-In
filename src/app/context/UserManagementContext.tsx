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

function parseReceptionist(rec: any): Receptionist {
  return {
    ...rec,
    createdAt: new Date(rec.createdAt)
  };
}

export function UserManagementProvider({ children }: { children: ReactNode }) {
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>({
    username: 'admin',
    password: 'admin123'
  });

  const [receptionists, setReceptionists] = useState<Receptionist[]>([]);

  useEffect(() => {
    refreshReceptionists();
    loadAdminCredentials();
  }, []);

  const refreshReceptionists = async () => {
    try {
      const data = await api.fetchReceptionists();
      setReceptionists(data.map(parseReceptionist));
    } catch (error) {
      console.error('Error fetching receptionists:', error);
    }
  };

  const loadAdminCredentials = async () => {
    try {
      const creds = await api.fetchAdminCredentials();
      setAdminCredentials(creds);
    } catch (error) {
      console.error('Error fetching admin credentials:', error);
    }
  };

  const addReceptionist = async (name: string, username: string, password: string): Promise<boolean> => {
    try {
      await api.addReceptionist(name, username, password);
      await refreshReceptionists();
      return true;
    } catch (error) {
      console.error('Error adding receptionist:', error);
      return false;
    }
  };

  const removeReceptionist = async (id: string): Promise<void> => {
    try {
      await api.deleteReceptionist(id);
      await refreshReceptionists();
    } catch (error) {
      console.error('Error removing receptionist:', error);
      throw error;
    }
  };

  const validateReceptionist = async (username: string, password: string): Promise<Receptionist | null> => {
    try {
      const receptionist = await api.validateReceptionist(username, password);
      return parseReceptionist(receptionist);
    } catch (error) {
      console.error('Error validating receptionist:', error);
      return null;
    }
  };

  const updateAdminCredentials = async (newUsername: string, newPassword: string): Promise<boolean> => {
    try {
      if (!newUsername || !newPassword) {
        return false;
      }
      await api.updateAdminCredentials(newUsername, newPassword);
      setAdminCredentials({ username: newUsername, password: newPassword });
      return true;
    } catch (error) {
      console.error('Error updating admin credentials:', error);
      return false;
    }
  };

  const validateAdmin = async (username: string, password: string): Promise<boolean> => {
    try {
      await api.validateAdmin(username, password);
      return true;
    } catch (error) {
      return false;
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
