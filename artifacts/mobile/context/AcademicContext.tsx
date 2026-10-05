import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AcademicSubject {
  id: string;
  name: string;
  teacher?: string;
  room?: string;
  colorIndex: number;
  updatedAt: string;
}

export interface AcademicScheduleEntry {
  id: string;
  subject: string;
  day: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  room?: string;
  teacher?: string;
  colorIdx?: number;
}

interface AcademicStore {
  subjects: AcademicSubject[];
  schedule: AcademicScheduleEntry[];
  lastUpdatedAt: string | null;
}

interface AcademicContextValue extends AcademicStore {
  syncSubjectsFromTasks: (tasks: Array<{ courseName?: string }>) => void;
  saveSchedule: (schedule: AcademicScheduleEntry[]) => void;
  updateSubjectDetails: (name: string, details: { teacher?: string; room?: string }) => void;
  clearCampusData: () => Promise<void>;
}

const STORAGE_KEY = '@nuvo_academic_db_v1';
const SCHEDULE_STORAGE_KEY = '@horario_v1';
const EMPTY_STORE: AcademicStore = { subjects: [], schedule: [], lastUpdatedAt: null };
const AcademicContext = createContext<AcademicContextValue | null>(null);

function subjectId(name: string) {
  return `subject_${name.trim().toLocaleLowerCase('es-MX').replace(/\s+/g, '_')}`;
}

export function AcademicProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AcademicStore>(EMPTY_STORE);
  const loadGeneration = useRef(0);

  useEffect(() => {
    const generation = loadGeneration.current;
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => {
        if (!alive || generation !== loadGeneration.current || !raw) return;
        setStore({ ...EMPTY_STORE, ...JSON.parse(raw) });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  const persist = useCallback((next: AcademicStore) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const syncSubjectsFromTasks = useCallback((tasks: Array<{ courseName?: string }>) => {
    const names = Array.from(
      new Set(tasks.map(task => task.courseName?.trim()).filter((name): name is string => !!name)),
    );
    if (!names.length) return;
    setStore(current => {
      const existing = new Map(current.subjects.map(subject => [subject.id, subject]));
      const now = new Date().toISOString();
      const subjects = names.map((name, index) => {
        const saved = existing.get(subjectId(name));
        return saved ?? {
          id: subjectId(name),
          name,
          colorIndex: index % 10,
          updatedAt: now,
        };
      });
      const merged = [...subjects, ...current.subjects.filter(subject => !names.some(name => subject.id === subjectId(name)))];
      const next = { ...current, subjects: merged, lastUpdatedAt: now };
      persist(next);
      return next;
    });
  }, [persist]);

  const saveSchedule = useCallback((schedule: AcademicScheduleEntry[]) => {
    setStore(current => {
      const next = { ...current, schedule, lastUpdatedAt: new Date().toISOString() };
      persist(next);
      return next;
    });
  }, [persist]);

  const updateSubjectDetails = useCallback((name: string, details: { teacher?: string; room?: string }) => {
    setStore(current => {
      const now = new Date().toISOString();
      const id = subjectId(name);
      const found = current.subjects.some(subject => subject.id === id);
      const subjects = found
        ? current.subjects.map(subject => subject.id === id ? { ...subject, ...details, updatedAt: now } : subject)
        : [...current.subjects, { id, name: name.trim(), colorIndex: current.subjects.length % 10, ...details, updatedAt: now }];
      const next = { ...current, subjects, lastUpdatedAt: now };
      persist(next);
      return next;
    });
  }, [persist]);

  const clearCampusData = useCallback(async () => {
    loadGeneration.current += 1;
    setStore(EMPTY_STORE);
    await AsyncStorage.multiRemove([STORAGE_KEY, SCHEDULE_STORAGE_KEY]);
  }, []);

  return (
    <AcademicContext.Provider value={{ ...store, syncSubjectsFromTasks, saveSchedule, updateSubjectDetails, clearCampusData }}>
      {children}
    </AcademicContext.Provider>
  );
}

export function useAcademic() {
  const context = useContext(AcademicContext);
  if (!context) throw new Error('useAcademic must be used within AcademicProvider');
  return context;
}