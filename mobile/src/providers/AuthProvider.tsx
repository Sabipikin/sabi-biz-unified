import React, { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform, ToastAndroid } from 'react-native';
import { authStore } from '../store/authStore';

export const AuthContext = React.createContext(authStore);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const prevTokenRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = authStore.subscribe((state) => {
      const token = state.accessToken;
      // Redirect only when we transition from having a token to not having one
      if (prevTokenRef.current && !token) {
        // show a brief toast/alert to inform user
        try {
          if (Platform.OS === 'android') {
            ToastAndroid.show('You have been logged out. Please sign in again.', ToastAndroid.SHORT);
          } else {
            Alert.alert('Logged out', 'You have been logged out. Please sign in again.');
          }
        } catch (e) {}
        router.replace('/(auth)/login');
      }
      prevTokenRef.current = token;
    });
    return () => unsub();
  }, [router]);

  return <AuthContext.Provider value={authStore}>{children}</AuthContext.Provider>;
};
