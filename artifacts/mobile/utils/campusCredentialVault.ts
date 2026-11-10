import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCOUNT_IDS_KEY = '@nuvo_campus_account_ids_v1';
const ACCOUNT_KEY_PREFIX = 'nuvo_campus_account_v1:';

export interface SavedCampusAccount {
  id: string;
  username: string;
  displayName: string;
}

export interface CampusCredentials {
  username: string;
  password: string;
  displayName?: string;
}

interface StoredCampusAccount extends CampusCredentials {
  id: string;
}

function accountKey(id: string) {
  return `${ACCOUNT_KEY_PREFIX}${id}`;
}

function createAccountId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAccountIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ACCOUNT_IDS_KEY);
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string' && id.length > 0)
      : [];
  } catch {
    return [];
  }
}

async function readStoredAccount(id: string): Promise<StoredCampusAccount | null> {
  try {
    const raw = await SecureStore.getItemAsync(accountKey(id));
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<StoredCampusAccount>;
    if (value.id !== id || !value.username || !value.password) return null;
    return {
      id,
      username: value.username,
      password: value.password,
      displayName: value.displayName || value.username,
    };
  } catch {
    return null;
  }
}

export async function isCampusCredentialStorageAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function loadSavedCampusAccounts(): Promise<SavedCampusAccount[]> {
  if (!(await isCampusCredentialStorageAvailable())) return [];

  const ids = await readAccountIds();
  const accounts: SavedCampusAccount[] = [];
  const validIds: string[] = [];

  for (const id of ids) {
    const record = await readStoredAccount(id);
    if (!record) continue;
    validIds.push(id);
    accounts.push({
      id,
      username: record.username,
      displayName: record.displayName || record.username,
    });
  }

  if (validIds.length !== ids.length) {
    await AsyncStorage.setItem(ACCOUNT_IDS_KEY, JSON.stringify(validIds));
  }

  return accounts;
}

export async function loadCampusCredentials(id: string): Promise<CampusCredentials | null> {
  if (!(await isCampusCredentialStorageAvailable())) return null;
  const record = await readStoredAccount(id);
  if (!record) return null;
  return {
    username: record.username,
    password: record.password,
    displayName: record.displayName,
  };
}

export async function loadCampusCredentialsForUsername(
  username: string,
): Promise<CampusCredentials | null> {
  const normalizedUsername = username.trim().toLocaleLowerCase();
  const accounts = await loadSavedCampusAccounts();
  const account = accounts.find(item => item.username.trim().toLocaleLowerCase() === normalizedUsername);
  return account ? loadCampusCredentials(account.id) : null;
}

export async function saveCampusCredentials(
  credentials: CampusCredentials,
): Promise<SavedCampusAccount | null> {
  const username = credentials.username.trim();
  if (!username || !credentials.password || !(await isCampusCredentialStorageAvailable())) {
    return null;
  }

  const ids = await readAccountIds();
  let id: string | undefined;
  for (const existingId of ids) {
    const existing = await readStoredAccount(existingId);
    if (existing?.username.trim().toLocaleLowerCase() === username.toLocaleLowerCase()) {
      id = existingId;
      break;
    }
  }

  const accountId = id ?? createAccountId();
  const record: StoredCampusAccount = {
    id: accountId,
    username,
    password: credentials.password,
    displayName: credentials.displayName?.trim() || username,
  };

  await SecureStore.setItemAsync(accountKey(accountId), JSON.stringify(record));
  if (!id) {
    try {
      await AsyncStorage.setItem(ACCOUNT_IDS_KEY, JSON.stringify([...ids, accountId]));
    } catch (error) {
      await SecureStore.deleteItemAsync(accountKey(accountId)).catch(() => {});
      throw error;
    }
  }

  return {
    id: accountId,
    username: record.username,
    displayName: record.displayName || record.username,
  };
}

export async function removeSavedCampusAccount(id: string): Promise<void> {
  if (!(await isCampusCredentialStorageAvailable())) return;
  await SecureStore.deleteItemAsync(accountKey(id));
  const ids = await readAccountIds();
  await AsyncStorage.setItem(ACCOUNT_IDS_KEY, JSON.stringify(ids.filter(item => item !== id)));
}
