import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/api';
import { Endpoints } from '../../src/api/endpoints';

export default function AutomationScreen() {
  const { data, refetch } = useQuery(['workflows'], async () => {
    const res = await api.get(Endpoints.WORKFLOWS.LIST);
    return res.data;
  });

  const workflows = data || [];

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: '700' }}>Automation</Text>
      <Button title="Refresh" onPress={() => refetch()} />
      <FlatList data={workflows} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={{ padding: 8, backgroundColor: '#fff', marginTop: 8, borderRadius: 8 }}>
          <Text style={{ fontWeight: '700' }}>{item.name}</Text>
          <Text>{item.status}</Text>
        </View>
      )} />
    </View>
  );
}
