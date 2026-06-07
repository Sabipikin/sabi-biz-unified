import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';
import { useRouter } from 'expo-router';

export default function ConversationsScreen() {
  const router = useRouter();
  const { data, isLoading, isError } = useQuery(['conversations'], async () => {
    const res = await api.get(Endpoints.CONVERSATIONS.LIST);
    return res.data;
  });

  const payload = data?.data || data || {};
  const list = payload.conversations || [];
  const summary = payload.summary || {};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.metrics}>
        <Text style={styles.metric}>Open {summary.active_chats || 0}</Text>
        <Text style={styles.metric}>Unread {summary.unread_messages || 0}</Text>
        <Text style={styles.metric}>AI {summary.ai_handled_chats || 0}</Text>
        <Text style={styles.metric}>Human {summary.human_takeover || 0}</Text>
      </View>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading conversations.</Text>}
      <FlatList
        data={Array.isArray(list) ? list : []}
        keyExtractor={(item: any) => item.id || String(item.thread_id || Math.random())}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => router.push(`/(tabs)/conversations/${item.id}`)}>
            <Text style={styles.name}>{item.customer_name || item.contact_name || item.external_contact_phone}</Text>
            <Text style={styles.sub}>{item.last_message_text || item.ai_status || item.status}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  metric: { backgroundColor: '#eef2ff', color: '#1e3a8a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, fontWeight: '600' },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontSize: 16, fontWeight: '600' },
  sub: { fontSize: 12, color: '#666', marginTop: 4 },
});
