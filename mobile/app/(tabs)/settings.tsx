import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Button, Alert, Linking } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function SettingsScreen() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery(['me'], async () => {
    const res = await api.get(Endpoints.AUTH.ME);
    return res.data;
  });
  const accountsQuery = useQuery(['whatsapp-accounts'], async () => {
    const res = await api.get(Endpoints.WHATSAPP.ACCOUNTS);
    return res.data;
  });
  const embeddedSignupQuery = useQuery(['whatsapp-embedded-config'], async () => {
    const res = await api.get(Endpoints.WHATSAPP.EMBEDDED_CONFIG);
    return res.data;
  });

  const me = data?.data || data || null;
  const accounts = accountsQuery.data?.data || [];
  const embeddedSignup = embeddedSignupQuery.data?.data || null;
  const embeddedReady = embeddedSignup?.ready === true;

  const [showForm, setShowForm] = useState(false);
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const createMutation = useMutation(async (payload: any) => {
    const res = await api.post(Endpoints.WHATSAPP.ACCOUNTS, payload);
    return res.data;
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['whatsapp-accounts']);
      setShowForm(false);
      setDisplayPhoneNumber('');
      setPhoneNumberId('');
      setAccessToken('');
    }
  });

  const deleteMutation = useMutation(async (id: string) => {
    const res = await api.delete(`${Endpoints.WHATSAPP.ACCOUNTS}/${id}`);
    return res.data;
  }, {
    onSuccess: () => queryClient.invalidateQueries(['whatsapp-accounts'])
  });

  const handleCreate = () => {
    if (!displayPhoneNumber || !phoneNumberId) {
      Alert.alert('Validation', 'Phone number and Phone Number ID are required');
      return;
    }
    createMutation.mutate({ display_phone_number: displayPhoneNumber, phone_number_id: phoneNumberId, access_token: accessToken, status: 'connected' });
  };

  const handleDelete = (id: string) => {
    Alert.alert('Confirm', 'Remove this WhatsApp account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ]);
  };

  const handleEmbeddedSignup = async () => {
    if (!embeddedReady) {
      const missing = embeddedSignup?.missing?.length ? ` Missing: ${embeddedSignup.missing.join(', ')}` : '';
      Alert.alert('Waiting for Meta setup', `Embedded signup is structured, but it is not ready yet.${missing}`);
      return;
    }

    Alert.alert(
      'Embedded signup ready',
      'The mobile app has the backend config now. The final one-click Meta popup should be launched from the web SDK or a browser auth session once Meta verification is active.'
    );
  };

  const handleOAuthConnect = async () => {
    try {
      const res = await api.get(Endpoints.WHATSAPP.OAUTH_URL);
      const url = res?.data?.data?.url || res?.data?.url || res?.url || null;
      if (!url) {
        Alert.alert('Error', 'Unable to build OAuth URL.');
        return;
      }
      Linking.openURL(url);
    } catch (err) {
      Alert.alert('Error', 'Failed to start OAuth flow.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      {isLoading && <Text>Loading...</Text>}
      {isError && <Text>Error loading profile.</Text>}
      {me ? (
        <View>
          <Text style={styles.field}>Name: {me.name}</Text>
          <Text style={styles.field}>Email: {me.email}</Text>
          <Text style={styles.field}>Business: {me.shop_name || '-'}</Text>
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>WhatsApp</Text>
        <View style={styles.signupPanel}>
          <Text style={styles.signupTitle}>One-click WhatsApp connection</Text>
          <Text style={styles.field}>
            {embeddedReady
              ? 'Embedded Meta Signup is configured and ready for the final Meta popup.'
              : 'Embedded Meta Signup is waiting for verification or Meta app configuration.'}
          </Text>
          {!embeddedReady && embeddedSignup?.missing?.length ? (
            <Text style={styles.muted}>Missing: {embeddedSignup.missing.join(', ')}</Text>
          ) : null}
          <Button
            title={embeddedReady ? 'Start Embedded Meta Signup' : 'Embedded Signup Pending'}
            onPress={handleEmbeddedSignup}
            disabled={embeddedSignupQuery.isLoading}
          />
          <View style={{ marginTop: 8 }} />
          <Button title="Use Meta OAuth fallback" onPress={handleOAuthConnect} />
        </View>

        <View style={styles.manualHeader}>
          <Text style={styles.field}>Manual developer fallback</Text>
          <Button title={showForm ? 'Cancel Manual Entry' : 'Connect Manually'} onPress={() => setShowForm(s => !s)} />
        </View>

        {showForm ? (
          <View style={{ marginTop: 12 }}>
            <TextInput placeholder="Display phone number (e.g. +2348012345678)" value={displayPhoneNumber} onChangeText={setDisplayPhoneNumber} style={styles.input} />
            <TextInput placeholder="Phone Number ID" value={phoneNumberId} onChangeText={setPhoneNumberId} style={styles.input} />
            <TextInput placeholder="Access Token (paste temporary)" value={accessToken} onChangeText={setAccessToken} style={styles.input} secureTextEntry={true} />
            <Button title={createMutation.isLoading ? 'Connecting...' : 'Connect'} onPress={handleCreate} />
          </View>
        ) : null}

        {accounts.length ? accounts.map((account: any) => {
          const history = Array.isArray(account.connection_history) ? account.connection_history : [];
          const lastEvent = history.length ? history[history.length - 1] : null;
          const connectedAt = account.connected_at ? new Date(account.connected_at) : null;
          const now = new Date();
          const healthy = account.status === 'connected' && connectedAt && ((now.getTime() - connectedAt.getTime()) / (1000 * 60 * 60 * 24) < 30);

          return (
            <View key={account.id} style={styles.account}>
              <Text style={styles.accountName}>{account.display_phone_number || 'WhatsApp number'}</Text>
              <Text>Status: {account.status} {healthy ? '- Healthy' : ''}</Text>
              <Text>Phone Number ID: {account.phone_number_id || '-'}</Text>
              {lastEvent ? <Text>Last: {lastEvent.status} @ {new Date(lastEvent.at).toLocaleString()}</Text> : null}
              <View style={{ marginTop: 8 }}>
                <Button title="Disconnect" onPress={() => handleDelete(account.id)} />
              </View>
            </View>
          );
        }) : <Text>No WhatsApp numbers connected yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 20, marginBottom: 12, fontWeight: '700' },
  field: { marginBottom: 8 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  signupPanel: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d7e3f8', padding: 12, borderRadius: 8, marginBottom: 12 },
  signupTitle: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  muted: { color: '#667085', marginBottom: 8 },
  manualHeader: { marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' },
  account: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  accountName: { fontWeight: '700', marginBottom: 4 },
});
