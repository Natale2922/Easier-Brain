import { parseTaskDueDate } from "../utils/date";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUniversityTasks } from '@workspace/api-client-react';
import { FIRST_LOGIN_KEY } from './AuthContext';
import { useAcademic } from './AcademicContext';

export type Priority = 'low' | 'medium' | 'high';
export type TaskSource = 'manual' | 'university';
export type DeliveryMethod = 'campus' | 'email' | 'class';

/**
 * A task is automatically archived (moved out of pending, into archive)
 * when it is more than 2 full days past its due date and still not completed.
 */
export function isOverdueArchived(task: Task): boolean {
  if (task.completed) return false;
  const dueEnd = parseTaskDueDate(task.dueDate, task.dueTime);
  if (!dueEnd) return false;
  return (Date.now() - dueEnd.getTime()) / 86400000 > 2;
}

/** A task is overdue as soon as its local due date has ended. */
export function isOverdue(task: Task): boolean {
  if (task.completed || !task.dueDate) return false;
  const dueEnd = parseTaskDueDate(task.dueDate, task.dueTime);
  return !!dueEnd && dueEnd.getTime() < Date.now();
}

/** How many full days past due (0 if not overdue). */
export function daysOverdue(task: Task): number {
  const dueEnd = parseTaskDueDate(task.dueDate, task.dueTime);

  if (!dueEnd) return 0;

  return Math.max(
    0,
    Math.floor((Date.now() - dueEnd.getTime()) / 86400000),
  );
}
export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  dueDate?: string;
  dueTime?: string;
  courseName?: string;
  deliveryMethod?: DeliveryMethod;
  source?: TaskSource;
  externalId?: string;
  /** Cleaned instructions text from Moodle */
  instructions?: string;
  /** Direct URL on the campus platform */
  campusUrl?: string;
}

export interface AddTaskParams {
  title: string;
  note?: string;
  priority?: Priority;
  dueDate?: string;
  dueTime?: string;
  courseName?: string;
  deliveryMethod?: DeliveryMethod;
}

type ReloginFn = () => Promise<{ sessionToken: string; sesskey: string } | null>;

interface TasksContextType {
  tasks: Task[];
  addTask: (params: AddTaskParams) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  syncUniversityTasks: (
    sessionToken: string,
    sesskey: string,
    reloginFn?: ReloginFn,
  ) => Promise<void>;
  clearUniversityTasks: () => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: string | null;
  isLoading: boolean;
  syncError: string | null;
}

const TasksContext = createContext<TasksContextType | null>(null);

const STORAGE_KEY = '@tasks_v2';
const SYNC_KEY = '@last_sync';

function normalizeMoodleDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const date = parseTaskDueDate(value);
  if (!date) return undefined;
  // Keep a local date key. This prevents UTC midnight from showing as
  // the previous/next day in Mexico and other non-UTC time zones.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { syncSubjectsFromTasks } = useAcademic();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);
  const syncGenerationRef = useRef(0);
  const firstLoginAtRef = useRef<string | null>(null);

  useEffect(() => {
    const loadGeneration = syncGenerationRef.current;
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SYNC_KEY),
      AsyncStorage.getItem('@tasks_v1'), // migrate old key
    ])
      .then(([tasksRaw, syncRaw, oldRaw]) => {
        if (loadGeneration !== syncGenerationRef.current) return;
        if (tasksRaw) {
          setTasks(JSON.parse(tasksRaw));
        } else if (oldRaw) {
          const old = JSON.parse(oldRaw) as Task[];
          setTasks(old);
          AsyncStorage.setItem(STORAGE_KEY, oldRaw).catch(() => {});
        }
        if (syncRaw) setLastSyncAt(syncRaw);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (tasks.length) {
      syncSubjectsFromTasks(tasks.filter(task => task.source === 'university'));
    }
  }, [tasks, syncSubjectsFromTasks]);

  const persist = useCallback((newTasks: Task[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks)).catch(() => {});
  }, []);

  const addTask = useCallback(
    (params: AddTaskParams) => {
      const { title, note, priority = 'medium', dueDate, dueTime, courseName, deliveryMethod } = params;
      const newTask: Task = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title,
        note,
        priority,
        completed: false,
        source: 'manual',
        createdAt: new Date().toISOString(),
        dueDate,
        dueTime,
        courseName,
        deliveryMethod,
      };
      setTasks(prev => {
        const updated = [newTask, ...prev];
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const toggleTask = useCallback(
    (id: string) => {
      setTasks(prev => {
        const updated = prev.map(t =>
          t.id === id
            ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
            : t,
        );
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setTasks(prev => {
        const updated = prev.filter(t => t.id !== id);
        persist(updated);
        return updated;
      });
    },
    [persist],
  );

  const applyMoodleTasks = useCallback(
    (moodleTasks: any[], prevTasks: Task[]): Task[] => {
      const manualTasks = prevTasks.filter(t => t.source !== 'university');
      const existingUni = prevTasks.filter(
        t => t.source === 'university' && shouldKeepTaskFromFirstLogin(t),
      );
      const existingMap = new Map(existingUni.map(t => [t.externalId, t]));

      const updatedUni: Task[] = moodleTasks.map(mTask => {
        const existing = existingMap.get(mTask.id);
        if (existing) {
          return {
            ...existing,
            title: mTask.title,
            courseName: mTask.courseName || undefined,
            dueDate: normalizeMoodleDate(mTask.dueDate),
            dueTime: mTask.dueTime || existing.dueTime,
            instructions: mTask.description || existing.instructions,
            campusUrl: mTask.url || existing.campusUrl,
          };
        }
        return {
          id: 'uni_' + mTask.id,
          externalId: mTask.id,
          title: mTask.title,
          courseName: mTask.courseName || undefined,
          note: undefined,
          instructions: mTask.description || undefined,
          campusUrl: mTask.url || undefined,
          dueDate: normalizeMoodleDate(mTask.dueDate),
          dueTime: mTask.dueTime || undefined,
          priority: 'medium' as Priority,
          completed: false,
          source: 'university' as TaskSource,
          createdAt: new Date().toISOString(),
        };
      });

      return [...manualTasks, ...updatedUni];
    },
    [],
  );

  const clearUniversityTasks = useCallback(async () => {
    syncGenerationRef.current += 1;
    firstLoginAtRef.current = null;
    isSyncingRef.current = false;
    setIsSyncing(false);
    let currentTasks = tasks;
    if (isLoading) {
      try {
        const [tasksRaw, legacyRaw] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          AsyncStorage.getItem('@tasks_v1'),
        ]);
        const raw = tasksRaw ?? legacyRaw;
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) currentTasks = parsed;
        }
      } catch {
        // Retain the in-memory tasks if the local cache cannot be read.
      }
    }
    const keptTasks = currentTasks.filter(task => task.source !== 'university');
    setTasks(keptTasks);
    setIsLoading(false);
    setLastSyncAt(null);
    setSyncError(null);
    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(keptTasks)),
      AsyncStorage.multiRemove([SYNC_KEY, '@tasks_v1']),
    ]);
  }, [isLoading, tasks]);

  function shouldKeepTaskFromFirstLogin(task: Task): boolean {
    if (!task.dueDate) return false;
    return isAfterFirstLoginWindow(task.dueDate, firstLoginAtRef.current);
  }

  const syncUniversityTasks = useCallback(
    async (sessionToken: string, sesskey: string, reloginFn?: ReloginFn) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      const syncGeneration = syncGenerationRef.current;
      setIsSyncing(true);
      setSyncError(null);

      const doFetch = async (token: string, key: string) => {
        const result = await getUniversityTasks({ sessionToken: token, sesskey: key });
        return result as typeof result & { sessionExpired?: boolean };
      };

      try {
        firstLoginAtRef.current = await AsyncStorage.getItem(FIRST_LOGIN_KEY);
        let result = await doFetch(sessionToken, sesskey);

        // Session expired: try silent re-login once
        if ((result as any).sessionExpired) {
          if (reloginFn) {
            const newCreds = await reloginFn();
            if (newCreds) {
              result = await doFetch(newCreds.sessionToken, newCreds.sesskey);
            }
          }
          // Still expired (or no creds stored) — signal caller to logout
          if ((result as any).sessionExpired) {
            if (syncGeneration !== syncGenerationRef.current) return;
            setSyncError('SESSION_EXPIRED_FINAL');
            return;
          }
        }

        if (syncGeneration !== syncGenerationRef.current) return;
        const firstLoginAt = firstLoginAtRef.current;
        const syncableTasks = (result.tasks as any[]).filter(task =>
          isAfterFirstLoginWindow(task.dueDate, firstLoginAt),
        );

        setTasks(prev => {
          const updated = applyMoodleTasks(syncableTasks, prev);
          persist(updated);
          return updated;
        });
        const now = new Date().toISOString();
        setLastSyncAt(now);
        AsyncStorage.setItem(SYNC_KEY, now).catch(() => {});
      } catch {
        if (syncGeneration === syncGenerationRef.current) {
          setSyncError('Error de conexión al sincronizar');
        }
      } finally {
        if (syncGeneration === syncGenerationRef.current) {
          isSyncingRef.current = false;
          setIsSyncing(false);
        }
      }
    },
    [persist, applyMoodleTasks],
  );

  return (
    <TasksContext.Provider
      value={{ tasks, addTask, toggleTask, deleteTask, syncUniversityTasks, clearUniversityTasks, isSyncing, lastSyncAt, isLoading, syncError }}
    >
      {children}
    </TasksContext.Provider>
  );
}

function isAfterFirstLoginWindow(
  dueDate: string | null | undefined,
  firstLoginAt: string | null,
): boolean {
  if (!dueDate || !firstLoginAt) return true;
  const due = parseTaskDueDate(dueDate);
  const first = new Date(firstLoginAt);
  if (!due || Number.isNaN(first.getTime())) return true;
  return due.getTime() >= first.getTime() - 2 * 86400000;
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
