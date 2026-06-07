import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MarketingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketing</Text>
      <Text>Marketing placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1, padding: 16 }, title: { fontSize: 20, marginBottom: 12 } });
