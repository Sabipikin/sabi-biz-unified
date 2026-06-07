import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function SettingsScreen() {
  const { data, isLoading, isError } = useQuery(['me'], async () => {
    const res = await api.get(Endpoints.AUTH.ME);
    return res.data;
  });
  const accountsQuery = useQuery(['whatsapp-accounts'], async () => {
    const res = await api.get(Endpoints.WHATSAPP.ACCOUNTS);
    return res.data;
  });

  const me = data?.data || data || null;
  const accounts = accountsQuery.data?.data || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading profile.</Text>}
      {me ? (
        <View>
          <Text style={styles.field}>Name: {me.name}</Text>
          <Text style={styles.field}>Email: {me.email}</Text>
          <Text style={styles.field}>Business: {me.shop_name || '-'}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WhatsApp</Text>
        <Text style={styles.field}>Connect WhatsApp (Coming Soon)</Text>
        {accounts.length ? accounts.map((account: any) => (
          <View key={account.id} style={styles.account}>
            <Text style={styles.accountName}>{account.display_phone_number || 'WhatsApp number'}</Text>
            <Text>Status: {account.status}</Text>
            <Text>Phone Number ID: {account.phone_number_id || '-'}</Text>
          </View>
        )) : <Text>No WhatsApp numbers connected yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  field: { marginBottom: 8 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  account: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  accountName: { fontWeight: '700', marginBottom: 4 },
});
