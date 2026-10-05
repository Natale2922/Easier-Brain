import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniversityGrades } from '@workspace/api-client-react';
import { getGradeSummary, normalizeAcademicSnapshot, type AcademicSnapshot, type GradeSummary } from '@/utils/siiGrades';
import {
  clearDeveloperSiiCredentials,
  loadDeveloperSiiCredentials,
  saveDeveloperSiiCredentials,
  type SiiCredentials,
} from '@/utils/siiCredentials';

const GRADES_KEY = '@nuvo_grades_v1';

interface GradesContextValue {
  snapshot: AcademicSnapshot | null;
  summary: GradeSummary;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
  siiUsername: string | null;
  isSiiAuthenticated: boolean;
  loginSii: (username: string, password: string) => Promise<boolean>;
  logoutSii: () => Promise<void>;
  syncGrades: () => Promise<void>;
}

const emptySummary: GradeSummary = {
  accumulatedAverage: null,
  weightedAverage: null,
  totalSubjects: 0,
  completedSubjects: 0,
  latestPeriod: null,
};

const GradesContext = createContext<GradesContextValue | null>(null);

export function GradesProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<AcademicSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [siiUsername, setSiiUsername] = useState<string | null>(null);
  const [isSiiAuthenticated, setIsSiiAuthenticated] = useState(false);
  const requestInFlight = useRef(false);

  const requestGrades = useCallback(async (credentials: SiiCredentials, saveCredentials: boolean): Promise<boolean> => {
    if (requestInFlight.current) return false;
    requestInFlight.current = true;
    setIsSyncing(true);
    setError(null);
    try {
      const cleanCredentials = { username: credentials.username.trim(), password: credentials.password };
      if (!cleanCredentials.username || !cleanCredentials.password) throw new Error('Escribe tu usuario y contraseña del SII.');
      const result = await getUniversityGrades(cleanCredentials);
      if (!result.success || !result.data) throw new Error(result.error ?? 'No se pudieron consultar las calificaciones.');
      const next = normalizeAcademicSnapshot(result.data);
      if (!next.periods.length) {
        throw new Error('El acceso al SII fue correcto, pero no se encontraron calificaciones para mostrar.');
      }
      setSnapshot(next);
      setSiiUsername(cleanCredentials.username);
      setIsSiiAuthenticated(true);
      await AsyncStorage.setItem(GRADES_KEY, JSON.stringify(next));
      if (saveCredentials) await saveDeveloperSiiCredentials(cleanCredentials);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar las calificaciones.');
      setIsSiiAuthenticated(false);
      return false;
    } finally {
      requestInFlight.current = false;
      setIsSyncing(false);
    }
  }, []);

  const loginSii = useCallback((username: string, password: string) => (
    requestGrades({ username, password }, true)
  ), [requestGrades]);

  const syncGrades = useCallback(async () => {
    try {
      const credentials = await loadDeveloperSiiCredentials();
      if (!credentials) {
        setIsSiiAuthenticated(false);
        throw new Error('Inicia sesión en el SII para consultar tus calificaciones.');
      }
      await requestGrades(credentials, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar las calificaciones.');
    }
  }, [requestGrades]);

  const logoutSii = useCallback(async () => {
    await Promise.all([
      clearDeveloperSiiCredentials(),
      AsyncStorage.removeItem(GRADES_KEY),
    ]);
    setSnapshot(null);
    setSiiUsername(null);
    setIsSiiAuthenticated(false);
    setError(null);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [gradesRaw, credentials] = await Promise.all([
          AsyncStorage.getItem(GRADES_KEY),
          loadDeveloperSiiCredentials(),
        ]);
        if (!alive) return;
        if (gradesRaw) setSnapshot(normalizeAcademicSnapshot(JSON.parse(gradesRaw)));
        if (credentials) {
          setSiiUsername(credentials.username);
          await requestGrades(credentials, false);
        }
      } catch {
        // A saved academic snapshot remains available if secure login restoration fails.
      } finally {
        if (alive) setIsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [requestGrades]);

  const value = useMemo(() => ({
    snapshot,
    summary: snapshot ? getGradeSummary(snapshot) : emptySummary,
    isLoading,
    isSyncing,
    error,
    lastUpdatedAt: snapshot?.lastUpdatedAt ?? null,
    siiUsername,
    isSiiAuthenticated,
    loginSii,
    logoutSii,
    syncGrades,
  }), [snapshot, isLoading, isSyncing, error, siiUsername, isSiiAuthenticated, loginSii, logoutSii, syncGrades]);

  return <GradesContext.Provider value={value}>{children}</GradesContext.Provider>;
}

export function useGrades() {
  const context = useContext(GradesContext);
  if (!context) throw new Error('useGrades must be used within GradesProvider');
  return context;
}