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

  const me = data?.data || data || null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading profile.</Text>}
      {me ? (
        <View>
          <Text style={styles.field}>Name: {me.name}</Text>
          <Text style={styles.field}>Email: {me.email}</Text>
          <Text style={styles.pre}>{JSON.stringify(me, null, 2)}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, field: { marginBottom: 8 }, pre: { marginTop: 12, fontFamily: 'monospace' } });
