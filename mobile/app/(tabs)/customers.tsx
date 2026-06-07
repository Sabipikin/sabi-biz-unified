import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';
import { useRouter } from 'expo-router';

export default function CustomersScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery(['customers'], async () => {
    const res = await api.get(Endpoints.LEADS.LIST);
    return res.data;
  });

  const list = data?.data || data || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Customers</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading customers.</Text>}
      <FlatList
        data={Array.isArray(list) ? list : []}
        keyExtractor={(item: any) => item.id || String(item.email || Math.random())}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/(tabs)/customers/${item.id}`)}>
            <Text style={styles.name}>{item.name || item.company || item.email}</Text>
            <Text style={styles.sub}>{item.email || item.phone}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' }, name: { fontSize: 16 }, sub: { fontSize: 12, color: '#666' } });
