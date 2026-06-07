import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Button } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api';
import { Endpoints } from '../../../src/api/endpoints';

export default function ConversationDetail() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery(['conversation', id], async () => {
    const res = await api.get(Endpoints.CONVERSATIONS.DETAIL(id));
    return res.data;
  }, { enabled: !!id });

  const sendMutation = useMutation(async (text: string) => {
    const res = await api.post(Endpoints.CONVERSATIONS.REPLY(id), { message: text });
    return res.data;
  }, {
    onSuccess: () => queryClient.invalidateQueries(['conversation', id]),
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Conversation</Text>
      {isLoading && <Text>Loading...</Text>}
      {data?.data ? (
        <View>
          <Text style={styles.name}>{data.data.customer_name || data.data.contact_name || data.data.external_contact_phone}</Text>
          <Text style={styles.sub}>{data.data.status} | {data.data.ai_enabled === false ? 'AI paused' : 'AI active'}</Text>
          {(data.data.messages || []).map((item: any) => (
            <View key={item.id} style={[styles.bubble, item.direction === 'outbound' ? styles.outbound : styles.inbound]}>
              <Text style={styles.meta}>{item.sender_type}</Text>
              <Text>{item.message_text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput placeholder="Write a message" value={message} onChangeText={setMessage} style={styles.input} />
      <Button title="Send" onPress={() => { sendMutation.mutate(message); setMessage(''); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700' },
  sub: { color: '#666', marginBottom: 12 },
  bubble: { padding: 12, borderRadius: 8, marginVertical: 6 },
  inbound: { backgroundColor: '#f3f4f6', alignSelf: 'flex-start' },
  outbound: { backgroundColor: '#dbeafe', alignSelf: 'flex-end' },
  meta: { fontSize: 11, color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginTop: 12 },
});
