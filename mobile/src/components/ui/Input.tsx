import React from 'react';
import { TextInput, StyleSheet } from 'react-native';

type Props = { value?: string; onChangeText?: (t: string) => void; placeholder?: string; secure?: boolean };

export const Input: React.FC<Props> = ({ value, onChangeText, placeholder, secure }) => {
  return <TextInput style={styles.input} value={value} onChangeText={onChangeText} placeholder={placeholder} secureTextEntry={secure} />;
};

const styles = StyleSheet.create({ input: { borderWidth: 1, borderColor: '#ddd', padding: 10, borderRadius: 8, marginBottom: 12 } });
