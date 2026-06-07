import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { useRouter } from 'expo-router';

export default function InvoicesScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery(['invoices'], async () => {
    const res = await api.get('/api/business/invoices');
    return res.data;
  });

  const list = data?.data || data || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Invoices</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading invoices.</Text>}
      <FlatList
        data={Array.isArray(list) ? list : []}
        keyExtractor={(item: any) => item.id || String(item.number || Math.random())}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/(tabs)/invoices/${item.id}`)}>
            <Text style={styles.name}>{item.number || `#${item.id}`}</Text>
            <Text style={styles.sub}>{item.customer_name || item.customer || item.total}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' }, name: { fontSize: 16 }, sub: { fontSize: 12, color: '#666' } });
