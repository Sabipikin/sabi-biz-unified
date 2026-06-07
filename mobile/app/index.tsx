import React from 'react';
import { Redirect } from 'expo-router';

// Default route -> auth or tabs can be decided with auth state; for scaffold, redirect to auth
export default function Index() {
  return <Redirect href="/(auth)/login" />;
}
