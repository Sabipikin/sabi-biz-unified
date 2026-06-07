import React from 'react';
import { useSyncExternalStore } from 'react';
import { authStore } from '../store/authStore';

export function useAuth() {
  const state = authStore();
  return state;
}
