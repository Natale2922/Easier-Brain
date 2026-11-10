import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { universityLogin } from '@workspace/api-client-react';
import {
  loadCampusCredentialsForUsername,
  saveCampusCredentials,
} from '@/utils/campusCredentialVault';

const AUTH_KEY = '@university_auth_v1';
const CREDS_KEY = '@university_creds_v1'; // legacy plaintext credentials; never used for re-login
export const FIRST_LOGIN_KEY = '@university_first_login_v1';

interface AuthState {
  sessionToken: string | null;
  sesskey: string | null;
  userFullname: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string, saveCredentials?: boolean) => Promise<{ success: boolean; error?: string; saveError?: string }>;
  logout: () => void;
  reloginSilently: () => Promise<{ sessionToken: string; sesskey: string } | null>;
  getStoredCredentials: () => Promise<{ username: string; password: string } | null>;
  legacyCredentialConsentPending: boolean;
  legacyCredentialUsername: string | null;
  resolveLegacyCredentialConsent: (save: boolean) => Promise<{ completed: boolean; saved: boolean }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    sessionToken: null,
    sesskey: null,
    userFullname: null,
    username: null,
    isAuthenticated: false,
    isLoading: true,
  });
  const [legacyCredentials, setLegacyCredentials] = useState<{ username: string; password: string } | null>(null);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(AUTH_KEY),
      AsyncStorage.getItem(CREDS_KEY),
    ])
      .then(([authRaw, legacyRaw]) => {
        if (authRaw) {
          try {
            const saved = JSON.parse(authRaw);
            setState({
              sessionToken: saved.sessionToken ?? null,
              sesskey: saved.sesskey ?? null,
              userFullname: saved.userFullname ?? null,
              username: saved.username ?? null,
              isAuthenticated: !!saved.sessionToken,
              isLoading: false,
            });
          } catch {
            AsyncStorage.removeItem(AUTH_KEY).catch(() => {});
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }

        if (legacyRaw) {
          try {
            const saved = JSON.parse(legacyRaw);
            if (saved.username && saved.password) {
              setLegacyCredentials({ username: saved.username, password: saved.password });
            } else {
              AsyncStorage.removeItem(CREDS_KEY).catch(() => {});
            }
          } catch {
            AsyncStorage.removeItem(CREDS_KEY).catch(() => {});
          }
        }
      })
      .catch(() => setState(prev => ({ ...prev, isLoading: false })));
  }, []);

  const resolveLegacyCredentialConsent = useCallback(async (save: boolean) => {
    const legacy = legacyCredentials;
    let saved = false;
    if (save && legacy) {
      try {
        saved = !!(await saveCampusCredentials({
          ...legacy,
          displayName: state.userFullname || legacy.username,
        }));
      } catch {
        saved = false;
      }
    }
    try {
      await AsyncStorage.removeItem(CREDS_KEY);
    } catch {
      return { completed: false, saved };
    }
    setLegacyCredentials(null);
    return { completed: true, saved };
  }, [legacyCredentials, state.userFullname]);

  const login = useCallback(async (username: string, password: string, shouldSaveCredentials = false) => {
    try {
      const result = await universityLogin({ username, password });

      if (!result.success || !result.sessionToken) {
        return { success: false, error: result.error ?? 'Credenciales incorrectas' };
      }

      const authData = {
        sessionToken: result.sessionToken,
        sesskey: result.sesskey ?? '',
        userFullname: result.userFullname ?? username,
        username,
      };

      // The session is stored locally, but the password requires explicit consent.
      await Promise.all([
        AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData)),
        AsyncStorage.getItem(FIRST_LOGIN_KEY).then(firstLogin =>
          firstLogin
            ? null
            : AsyncStorage.setItem(FIRST_LOGIN_KEY, new Date().toISOString()),
        ),
      ]);

      setState({ ...authData, isAuthenticated: true, isLoading: false });

      let saveError: string | undefined;
      if (shouldSaveCredentials) {
        try {
          const saved = await saveCampusCredentials({
            username,
            password,
            displayName: authData.userFullname,
          });
          if (!saved) {
            saveError = 'No se pudo guardar de forma segura en este dispositivo.';
          }
        } catch {
          saveError = 'La sesión inició, pero no se pudo guardar la cuenta de forma segura.';
        }
      }

      await AsyncStorage.removeItem(CREDS_KEY).catch(() => {});
      return { success: true, saveError };
    } catch {
      return { success: false, error: 'Error de conexión. Verifique su internet.' };
    }
  }, []);

  /** Re-authenticates silently using stored credentials. Returns new session or null. */
  const reloginSilently = useCallback(async (): Promise<{ sessionToken: string; sesskey: string } | null> => {
    try {
      if (!state.username) return null;
      const credentials = await loadCampusCredentialsForUsername(state.username);
      if (!credentials) return null;
      const { username, password } = credentials;

      const result = await universityLogin({ username, password });
      if (!result.success || !result.sessionToken) return null;

      const authData = {
        sessionToken: result.sessionToken,
        sesskey: result.sesskey ?? '',
        userFullname: result.userFullname ?? username,
        username,
      };

      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));
      setState(prev => ({ ...prev, ...authData }));
      return { sessionToken: result.sessionToken, sesskey: result.sesskey ?? '' };
    } catch {
      return null;
    }
  }, [state.username]);

  const getStoredCredentials = useCallback(async () => {
    try {
      if (!state.username) return null;
      const credentials = await loadCampusCredentialsForUsername(state.username);
      return credentials
        ? { username: credentials.username, password: credentials.password }
        : null;
    } catch {
      return null;
    }
  }, [state.username]);

  const logout = useCallback(() => {
    AsyncStorage.multiRemove([AUTH_KEY, CREDS_KEY, FIRST_LOGIN_KEY]).catch(() => {});
    setState({
      sessionToken: null,
      sesskey: null,
      userFullname: null,
      username: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      logout,
      reloginSilently,
      getStoredCredentials,
      legacyCredentialConsentPending: !!legacyCredentials,
      legacyCredentialUsername: legacyCredentials?.username ?? null,
      resolveLegacyCredentialConsent,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
