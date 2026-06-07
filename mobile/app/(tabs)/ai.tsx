import React from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Switch } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';
import { Button } from '../../src/components/ui/Button';

export default function AiAssistantScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(['ai-settings'], async () => {
    const res = await api.get(Endpoints.AI.SETTINGS);
    return res.data;
  });

  const settings = data?.data || {};
  const [enabled, setEnabled] = React.useState(settings.enabled !== false);
  const [assistantName, setAssistantName] = React.useState(settings.assistant_name || 'Sabi Assistant');
  const [businessContext, setBusinessContext] = React.useState(settings.business_context || '');

  React.useEffect(() => {
    setEnabled(settings.enabled !== false);
    setAssistantName(settings.assistant_name || 'Sabi Assistant');
    setBusinessContext(settings.business_context || '');
  }, [settings.id]);

  const saveMutation = useMutation(async () => {
    const res = await api.put(Endpoints.AI.SETTINGS, {
      enabled,
      assistant_name: assistantName,
      business_context: businessContext,
      tone: settings.tone || 'Friendly',
      language: settings.language || 'English',
      escalation_enabled: settings.escalation_enabled !== false,
      escalation_keywords: settings.escalation_keywords || ['human', 'agent', 'complaint', 'refund'],
    });
    return res.data;
  }, {
    onSuccess: () => queryClient.invalidateQueries(['ai-settings']),
  });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>AI Assistant</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading AI settings.</Text>}
      <View style={styles.row}>
        <Text style={styles.label}>Enabled</Text>
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
      <Text style={styles.label}>Assistant Name</Text>
      <TextInput value={assistantName} onChangeText={setAssistantName} style={styles.input} />
      <Text style={styles.label}>Business Description</Text>
      <TextInput value={businessContext} onChangeText={setBusinessContext} style={[styles.input, styles.textarea]} multiline />
      <Text style={styles.meta}>Tone: {settings.tone || 'Friendly'} | Language: {settings.language || 'English'}</Text>
      <Button title={saveMutation.isLoading ? 'Saving...' : 'Save AI Settings'} onPress={() => saveMutation.mutate()} disabled={saveMutation.isLoading} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 12, backgroundColor: '#fff' },
  textarea: { minHeight: 120, textAlignVertical: 'top' },
  meta: { color: '#666', marginBottom: 16 },
});
