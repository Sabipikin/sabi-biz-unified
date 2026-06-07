import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Button } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../src/api';

export default function ConversationDetail() {
  const { id } = useLocalSearchParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery(['conversation', id], async () => {
    const res = await api.get(`/api/conversations/${id}`);
    return res.data;
  }, { enabled: !!id });

  const sendMutation = useMutation(async (text: string) => {
    const res = await api.post(`/api/conversations/${id}/reply`, { message: text });
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
          <Text style={styles.pre}>{JSON.stringify(data.data, null, 2)}</Text>
        </View>
      ) : null}

      <TextInput placeholder="Write a message" value={message} onChangeText={setMessage} style={styles.input} />
      <Button title="Send" onPress={() => { sendMutation.mutate(message); setMessage(''); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ container: { padding: 16 }, title: { fontSize: 20, marginBottom: 12 }, pre: { fontFamily: 'monospace' }, input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginTop: 12 } });
