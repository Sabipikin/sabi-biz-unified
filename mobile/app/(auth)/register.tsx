import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '../../src/components/ui/Input';
import { useAuth } from '../../src/hooks/useAuth';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Enter your full name' }),
  email: z.string().email({ message: 'Invalid email' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  phone: z.string().optional(),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const auth = useAuth();

  const { control, handleSubmit, formState } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  const onSubmit = async (values: RegisterForm) => {
    try {
      const data = await auth.register?.(values);
      if (data?.token) {
        // if backend returned token, user is logged in; otherwise prompt to login
        router.replace('/(tabs)/dashboard');
      } else {
        alert('Registered successfully. Please login.');
        router.push('/(auth)/login');
      }
    } catch (err: any) {
      alert(err?.message || 'Registration failed');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <Input placeholder="Full name" value={undefined} onChangeText={(t) => control.setValue('name', t)} />
      {formState.errors.name ? <Text style={styles.error}>{String(formState.errors.name?.message)}</Text> : null}
      <Input placeholder="Email" value={undefined} onChangeText={(t) => control.setValue('email', t)} />
      {formState.errors.email ? <Text style={styles.error}>{String(formState.errors.email?.message)}</Text> : null}
      <Input placeholder="Password" secure value={undefined} onChangeText={(t) => control.setValue('password', t)} />
      {formState.errors.password ? <Text style={styles.error}>{String(formState.errors.password?.message)}</Text> : null}
      <Input placeholder="Phone (optional)" value={undefined} onChangeText={(t) => control.setValue('phone', t)} />
      <Button title="Register" onPress={handleSubmit(onSubmit)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
  title: { fontSize: 20, marginBottom: 16, textAlign: 'center' },
  error: { color: 'red', marginBottom: 8 },
});
