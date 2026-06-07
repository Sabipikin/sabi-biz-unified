import Constants from 'expo-constants';
import { z } from 'zod';

const RawEnvSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url().nonempty(),
  EXPO_PUBLIC_APP_NAME: z.string().optional(),
}).partial();

const raw = {
  EXPO_PUBLIC_API_URL: (Constants.manifest?.extra?.apiUrl as string) || process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'https://sabiz.onrender.com',
  EXPO_PUBLIC_APP_NAME: process.env.EXPO_PUBLIC_APP_NAME || 'SabiReply',
};

const parsed = RawEnvSchema.parse(raw);

export function getEnv() {
  return {
    API_URL: parsed.EXPO_PUBLIC_API_URL,
    APP_NAME: parsed.EXPO_PUBLIC_APP_NAME,
  };
}
