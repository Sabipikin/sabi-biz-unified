import React from 'react';
import { Tabs } from 'expo-router';

export default function StackTabs() {
  return (
    <Tabs>
      <Tabs.Screen name="dashboard" />
      <Tabs.Screen name="leads" />
      <Tabs.Screen name="marketing" />
      <Tabs.Screen name="analytics" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
