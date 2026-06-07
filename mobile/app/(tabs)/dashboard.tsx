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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading analytics.</Text>}
      {data ? (
        <View>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text>Data summary (raw):</Text>
          <Text style={styles.pre}>{JSON.stringify(data, null, 2)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, sectionTitle: { fontSize: 16, marginTop: 12, marginBottom: 8 }, pre: { fontFamily: 'monospace', marginTop: 8 } });
