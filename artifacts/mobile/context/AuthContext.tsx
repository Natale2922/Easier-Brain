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

interface AuthState {
  sessionToken: string | null;
  sesskey: string | null;
  userFullname: string | null;
  username: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (
    username: string,
    password: string,
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
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

  // Load saved auth from AsyncStorage on mount
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

  const login = useCallback(
    async (username: string, password: string) => {
      try {
        const result = await universityLogin({ username, password });

        if (!result.success || !result.sessionToken) {
          return {
            success: false,
            error: result.error ?? 'Credenciales incorrectas',
          };
        }

        const authData = {
          sessionToken: result.sessionToken,
          sesskey: result.sesskey ?? '',
          userFullname: result.userFullname ?? username,
          username,
        };

        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(authData));

        setState({
          ...authData,
          isAuthenticated: true,
          isLoading: false,
        });

        return { success: true };
      } catch {
        return {
          success: false,
          error: 'Error de conexión. Verifique su internet.',
        };
      }
    },
    [],
  );

  const logout = useCallback(() => {
    AsyncStorage.removeItem(AUTH_KEY).catch(() => {});
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
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
