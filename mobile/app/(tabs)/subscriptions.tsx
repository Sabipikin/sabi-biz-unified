import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';

export default function SubscriptionsScreen() {
  const { data, isLoading, isError } = useQuery(['subscriptions'], async () => {
    const res = await api.get('/api/subscriptions');
    return res.data;
  });

  const list = data?.data || data || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscriptions</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading subscriptions.</Text>}
      <FlatList
        data={Array.isArray(list) ? list : []}
        keyExtractor={(item: any) => item.id || String(item.plan || Math.random())}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.name}>{item.plan || item.name}</Text>
            <Text style={styles.sub}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' }, name: { fontSize: 16 }, sub: { fontSize: 12, color: '#666' } });
