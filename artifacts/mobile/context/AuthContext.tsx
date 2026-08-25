import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { universityLogin } from '@workspace/api-client-react';

const AUTH_KEY = '@university_auth_v1';
const CREDS_KEY = '@university_creds_v1'; // stores username+password for auto-relogin
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
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  reloginSilently: () => Promise<{ sessionToken: string; sesskey: string } | null>;
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

  useEffect(() => {
    AsyncStorage.getItem(AUTH_KEY)
      .then(raw => {
        if (raw) {
          const saved = JSON.parse(raw);
          setState({
            sessionToken: saved.sessionToken ?? null,
            sesskey: saved.sesskey ?? null,
            userFullname: saved.userFullname ?? null,
            username: saved.username ?? null,
            isAuthenticated: !!saved.sessionToken,
            isLoading: false,
          });
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      })
      .catch(() => setState(prev => ({ ...prev, isLoading: false })));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
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

      // Store session + credentials (for silent re-login when session expires)
      await Promise.all([
        AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData)),
        AsyncStorage.setItem(CREDS_KEY, JSON.stringify({ username, password })),
        AsyncStorage.getItem(FIRST_LOGIN_KEY).then(firstLogin =>
          firstLogin
            ? null
            : AsyncStorage.setItem(FIRST_LOGIN_KEY, new Date().toISOString()),
        ),
      ]);

      setState({ ...authData, isAuthenticated: true, isLoading: false });
      return { success: true };
    } catch {
      return { success: false, error: 'Error de conexión. Verifique su internet.' };
    }
  }, []);

  /** Re-authenticates silently using stored credentials. Returns new session or null. */
  const reloginSilently = useCallback(async (): Promise<{ sessionToken: string; sesskey: string } | null> => {
    try {
      const raw = await AsyncStorage.getItem(CREDS_KEY);
      if (!raw) return null;
      const { username, password } = JSON.parse(raw);
      if (!username || !password) return null;

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
  }, []);

  const logout = useCallback(() => {
    AsyncStorage.multiRemove([AUTH_KEY, CREDS_KEY]).catch(() => {});
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
    <AuthContext.Provider value={{ ...state, login, logout, reloginSilently }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
