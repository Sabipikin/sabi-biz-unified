import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LeadsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leads</Text>
      <Text>Leads placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 } });
