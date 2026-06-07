import React from 'react';
import { View, StyleSheet } from 'react-native';

export const Card: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View style={styles.card}>{children}</View>;
};

const styles = StyleSheet.create({ card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 } });
