import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MarketingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Campaigns</Text>
      <Text>WhatsApp campaigns are coming soon. The account, AI, and customer intelligence foundations are ready for this workflow.</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 } });
