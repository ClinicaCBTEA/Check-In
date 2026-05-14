import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUserManagement, type Receptionist } from './UserManagementContext';

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: string | null;
  receptionist: Receptionist | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [receptionist, setReceptionist] = useState<Receptionist | null>(null);
  const { validateReceptionist } = useUserManagement();

  const login = async (username: string, password: string): Promise<boolean> => {
    const rec = await validateReceptionist(username, password);
    if (rec) {
      setIsAuthenticated(true);
      setCurrentUser(rec.name);
      setReceptionist(rec);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setReceptionist(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, currentUser, receptionist, login, logout }}>
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
