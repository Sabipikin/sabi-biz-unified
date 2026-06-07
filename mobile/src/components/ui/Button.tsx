import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

type Props = { title: string; onPress?: () => void; disabled?: boolean } & any;

export const Button: React.FC<Props> = ({ title, onPress, disabled }) => {
  return (
    <TouchableOpacity style={[styles.btn, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={styles.text}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  text: { color: '#fff', fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
