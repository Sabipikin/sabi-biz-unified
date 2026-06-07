import React from 'react';
import { authStore } from '../store/authStore';

export const AuthContext = React.createContext(authStore);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AuthContext.Provider value={authStore}>{children}</AuthContext.Provider>;
};
