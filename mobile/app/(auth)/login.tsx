import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../src/components/ui/Input';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(6, { message: 'Password too short' }),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const auth = useAuth();

  const { control, handleSubmit, formState } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginForm) => {
    try {
      await auth.login(values);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      alert(err?.message || 'Login failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <Input placeholder="Email" value={undefined} onChangeText={(t) => control.setValue('email', t)} />
      {formState.errors.email ? <Text style={styles.error}>{String(formState.errors.email?.message)}</Text> : null}
      <Input placeholder="Password" secure value={undefined} onChangeText={(t) => control.setValue('password', t)} />
      {formState.errors.password ? <Text style={styles.error}>{String(formState.errors.password?.message)}</Text> : null}
      <Button title="Sign In" onPress={handleSubmit(onSubmit)} />
      <Button title="Register" onPress={() => router.push('/(auth)/register')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 24, marginBottom: 16, textAlign: 'center' },
  error: { color: 'red', marginBottom: 8 },
});
