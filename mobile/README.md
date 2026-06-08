# SabiReply Mobile (Expo + TypeScript)

This folder contains a lightweight Expo + React Native TypeScript scaffold that provides a mobile-first client for SabiReply. It mirrors core web features (auth, inbox/conversations, customers, invoices, subscriptions, AI assistant) and demonstrates recommended app architecture: Axios API client, React Query, Zustand auth store, and secure token storage.

Quick start

1. cd mobile
2. npm install
3. npx expo start

Environment

- Create a `.env` (or set environment variables) before running. Common vars:
	- `API_URL` — backend API base URL (e.g. https://api.example.com)
	- `EXPO_PUBLIC_API_URL` — Expo/Metro accessible API URL if different

Core features

- Authentication (access + refresh token flow)
- Inbox / Conversations with reply support
- Customers and Invoices list + details
- Subscriptions and basic billing views
- AI assistant prototypes and campaign screens
- WhatsApp settings surface for Embedded Meta Signup readiness, OAuth fallback, and manual developer fallback

WhatsApp Embedded Signup

- The mobile Settings screen reads `/api/whatsapp/embedded/config` to show whether one-click WhatsApp connection is ready.
- While Meta verification or app configuration is pending, the screen shows the missing backend environment variables and keeps OAuth/manual fallback available.
- Once Meta Embedded Signup is active, the web SDK flow should return a signup code that the backend exchanges through `/api/whatsapp/embedded/exchange`.

Project structure (high level)

- `src/api` — Axios client and endpoints
- `src/store` — Zustand auth store and helpers
- `src/providers` — AuthProvider, QueryClient provider, theme
- `app/(tabs)` — Expo Router screens (Dashboard, Customers, Invoices, Conversations, Settings)

Running the app

- Start Metro/Expo: `npx expo start`
- Run on a simulator: use the Expo UI, or `npx expo run:android` / `npx expo run:ios` (native builds require proper environment)

Testing auth refresh (manual)

1. Login with valid credentials.
2. Simulate expired access token (or wait), then perform an API call — the app will use the refresh token to obtain a new access token automatically.
3. On refresh failure the user will be logged out and redirected to login.

Troubleshooting

- If `npm install` fails when installing native Expo dependencies, ensure your Node version is supported (Node 16/18/20 recommended) and run:

```powershell
cd mobile
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npx expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage expo-secure-store
```

- If you see networking errors, verify `API_URL` and that the backend is running. Clear service worker / cache if testing against the web client.

Contributing & development tips

- Keep API shapes aligned with the web backend. The mobile app expects the same auth endpoints (`/api/auth/login`, `/api/auth/refresh`, etc.).
- Use the `authStore` helpers when adding auth-protected requests.
- For UI components, add shared `components/` to keep consistency across screens.

Want me to run the install and fix the earlier failure logs? I can attempt `npm install` in `mobile` and share the error output.
