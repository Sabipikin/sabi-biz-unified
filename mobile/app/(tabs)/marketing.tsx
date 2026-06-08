import React from 'react';
import { ScrollView, Text, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function MarketingScreen() {
  const campaignsQuery = useQuery(['campaigns'], async () => {
    const res = await api.get(Endpoints.CAMPAIGNS.LIST);
    return res.data;
  });
  const templatesQuery = useQuery(['message-templates'], async () => {
    const res = await api.get(Endpoints.CAMPAIGNS.TEMPLATES);
    return res.data;
  });
  const broadcastsQuery = useQuery(['broadcasts'], async () => {
    const res = await api.get(Endpoints.CAMPAIGNS.BROADCASTS);
    return res.data;
  });

  const campaigns = campaignsQuery.data?.data || [];
  const templates = templatesQuery.data?.data || [];
  const broadcasts = broadcastsQuery.data?.data || [];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Campaigns</Text>
      {(campaignsQuery.isLoading || templatesQuery.isLoading || broadcastsQuery.isLoading) && <Text>Loading marketing workspace...</Text>}

      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{campaigns.length}</Text><Text>Campaigns</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{templates.length}</Text><Text>Templates</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{broadcasts.length}</Text><Text>Broadcasts</Text></View>
      </View>

      <Text style={styles.sectionTitle}>Recent Campaigns</Text>
      {campaigns.length ? campaigns.map((campaign: any) => (
        <View key={campaign.id} style={styles.card}>
          <Text style={styles.cardTitle}>{campaign.name}</Text>
          <Text>Status: {campaign.status}</Text>
          <Text>Channel: {campaign.channel}</Text>
          <Text>Sent: {campaign.metrics?.sent || 0}  Read: {campaign.metrics?.read || 0}  Failed: {campaign.metrics?.failed || 0}</Text>
        </View>
      )) : <Text>No campaigns yet.</Text>}

      <Text style={styles.sectionTitle}>Message Templates</Text>
      {templates.length ? templates.map((template: any) => (
        <View key={template.id} style={styles.card}>
          <Text style={styles.cardTitle}>{template.name}</Text>
          <Text>{template.category} - {template.approval_status}</Text>
          <Text numberOfLines={2}>{template.body}</Text>
        </View>
      )) : <Text>No templates yet.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  metrics: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  metric: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12 },
  metricValue: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 8 },
  cardTitle: { fontWeight: '700', marginBottom: 4 },
});
