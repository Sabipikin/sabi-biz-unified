import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function DashboardScreen() {
  const { data, isLoading, isError } = useQuery(['analytics'], async () => {
    const res = await api.get(Endpoints.ANALYTICS.DASH);
    return res.data;
  });
  const intelligenceQuery = useQuery(['customer-intelligence'], async () => {
    const res = await api.get(Endpoints.ANALYTICS.CUSTOMER_INTELLIGENCE);
    return res.data;
  });

  const metrics = data?.data || [];
  const intelligence = intelligenceQuery.data?.data || {};

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading analytics.</Text>}
      <View style={styles.grid}>
        <View style={styles.card}><Text style={styles.label}>Conversations</Text><Text style={styles.value}>{metrics.length}</Text></View>
        <View style={styles.card}><Text style={styles.label}>VIP Customers</Text><Text style={styles.value}>{intelligence.vip_customers?.length || 0}</Text></View>
        <View style={styles.card}><Text style={styles.label}>At Risk</Text><Text style={styles.value}>{intelligence.at_risk_customers?.length || 0}</Text></View>
        <View style={styles.card}><Text style={styles.label}>Repeat Buyers</Text><Text style={styles.value}>{intelligence.repeat_buyers?.length || 0}</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  grid: { gap: 10 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 8 },
  label: { color: '#666', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '700' },
});
