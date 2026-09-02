import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniversityGrades } from '@workspace/api-client-react';
import { useAuth } from '@/context/AuthContext';
import { getGradeSummary, normalizeAcademicSnapshot, type AcademicSnapshot, type GradeSummary } from '@/utils/siiGrades';

const GRADES_KEY = '@nuvo_grades_v1';

interface GradesContextValue {
  snapshot: AcademicSnapshot | null;
  summary: GradeSummary;
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  lastUpdatedAt: string | null;
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
  const { getStoredCredentials } = useAuth();
  const [snapshot, setSnapshot] = useState<AcademicSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(GRADES_KEY)
      .then(raw => raw && setSnapshot(normalizeAcademicSnapshot(JSON.parse(raw))))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const syncGrades = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setError(null);
    try {
      const credentials = await getStoredCredentials();
      if (!credentials) throw new Error('Inicia sesión para consultar tus calificaciones.');
      const result = await getUniversityGrades(credentials);
      if (!result.success || !result.data) throw new Error(result.error ?? 'No se pudieron consultar las calificaciones.');
      const next = normalizeAcademicSnapshot(result.data);
      setSnapshot(next);
      await AsyncStorage.setItem(GRADES_KEY, JSON.stringify(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron actualizar las calificaciones.');
    } finally {
      setIsSyncing(false);
    }
  }, [getStoredCredentials, isSyncing]);

  const value = useMemo(() => ({
    snapshot,
    summary: snapshot ? getGradeSummary(snapshot) : emptySummary,
    isLoading,
    isSyncing,
    error,
    lastUpdatedAt: snapshot?.lastUpdatedAt ?? null,
    syncGrades,
  }), [snapshot, isLoading, isSyncing, error, syncGrades]);

  return <GradesContext.Provider value={value}>{children}</GradesContext.Provider>;
}

export function useGrades() {
  const context = useContext(GradesContext);
  if (!context) throw new Error('useGrades must be used within GradesProvider');
  return context;
}