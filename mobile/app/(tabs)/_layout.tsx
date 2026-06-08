import React from 'react';
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="conversations" options={{ title: 'Inbox' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI Assistant' }} />
      <Tabs.Screen name="marketing" options={{ title: 'Campaigns' }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Tabs.Screen name="subscriptions" options={{ title: 'Billing' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
