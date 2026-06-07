import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../src/api';

export default function CustomerDetail() {
  const { id } = useLocalSearchParams();

  const { data, isLoading, isError } = useQuery(['customer', id], async () => {
    const res = await api.get(`/api/business/customers/${id}`);
    return res.data;
  }, { enabled: !!id });

  const item = data?.data || data || null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Customer</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading customer.</Text>}
      {item ? (
        <View>
          <Text style={styles.field}>Name: {item.name}</Text>
          <Text style={styles.field}>Email: {item.email}</Text>
          <Text style={styles.field}>Phone: {item.phone}</Text>
          <Text style={styles.pre}>{JSON.stringify(item, null, 2)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, field: { marginBottom: 8 }, pre: { marginTop: 12, fontFamily: 'monospace' } });
