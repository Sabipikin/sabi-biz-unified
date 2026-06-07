import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { useRouter } from 'expo-router';

export default function ConversationsScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery(['conversations'], async () => {
    const res = await api.get('/api/conversations');
    return res.data;
  });

  const list = data?.data || data || [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversations</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading conversations.</Text>}
      <FlatList
        data={Array.isArray(list) ? list : []}
        keyExtractor={(item: any) => item.id || String(item.thread_id || Math.random())}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/(tabs)/conversations/${item.id}`)}>
            <Text style={styles.name}>{item.subject || item.preview || item.customer}</Text>
            <Text style={styles.sub}>{item.updated_at || item.last_message}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' }, name: { fontSize: 16 }, sub: { fontSize: 12, color: '#666' } });
