import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function AnalyticsScreen() {
  const { data, isLoading, isError } = useQuery(['product-summary'], async () => {
    const res = await api.get(Endpoints.PRODUCT.SUMMARY);
    return res.data;
  });

  const summary = data?.data || {};
  const metrics = [
    ['Messages', summary.messages],
    ['Contacts', summary.contacts],
    ['Leads', summary.leads],
    ['Campaigns', summary.campaigns],
    ['Pipeline Value', summary.pipeline_value],
    ['AI Conversations', summary.ai_conversations],
    ['Human Conversations', summary.human_conversations],
    ['Won Deals', summary.won_deals],
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      {isLoading && <Text>Loading analytics...</Text>}
      {isError && <Text>Error loading analytics.</Text>}
      <View style={styles.grid}>
        {metrics.map(([label, value]) => (
          <View key={String(label)} style={styles.card}>
            <Text style={styles.value}>{Number(value || 0).toLocaleString()}</Text>
            <Text>{label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 8, padding: 12 },
  value: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
});
