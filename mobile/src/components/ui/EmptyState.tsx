import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const EmptyState: React.FC<{ title?: string; subtitle?: string }> = ({ title = 'Nothing here', subtitle }) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>
);

const styles = StyleSheet.create({ container: { padding: 24, alignItems: 'center' }, title: { fontSize: 18, marginBottom: 8 }, subtitle: { color: '#666' } });
