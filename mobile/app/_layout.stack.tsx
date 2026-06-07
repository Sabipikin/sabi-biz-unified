import React from 'react';
import { Tabs, Slot } from 'expo-router';

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen name="(tabs)/dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="(tabs)/leads" options={{ title: 'Leads' }} />
      <Tabs.Screen name="(tabs)/marketing" options={{ title: 'Marketing' }} />
      <Tabs.Screen name="(tabs)/analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="(tabs)/settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
