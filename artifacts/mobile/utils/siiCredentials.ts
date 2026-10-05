import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'nuvo_sii_credentials_v1';

export interface SiiCredentials {
  username: string;
  password: string;
}

// Web previews keep the credential in memory only. Native builds use the
// operating system's encrypted secure storage.
let webSessionCredentials: SiiCredentials | null = null;

export async function saveDeveloperSiiCredentials(credentials: SiiCredentials) {
  if (Platform.OS === 'web') {
    webSessionCredentials = { ...credentials };
    return;
  }
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(credentials));
}

export async function loadDeveloperSiiCredentials(): Promise<SiiCredentials | null> {
  if (Platform.OS === 'web') return webSessionCredentials ? { ...webSessionCredentials } : null;
  const raw = await SecureStore.getItemAsync(STORAGE_KEY);
  if (!raw) return null;
  try {
    const credentials = JSON.parse(raw) as Partial<SiiCredentials>;
    return credentials.username && credentials.password
      ? { username: credentials.username, password: credentials.password }
      : null;
  } catch {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    return null;
  }
}

export async function clearDeveloperSiiCredentials() {
  if (Platform.OS === 'web') {
    webSessionCredentials = null;
    return;
  }
  await SecureStore.deleteItemAsync(STORAGE_KEY);
}
