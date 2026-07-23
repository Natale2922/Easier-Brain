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

export type Priority = 'low' | 'medium' | 'high';
export type TaskSource = 'manual' | 'university';
export type DeliveryMethod = 'campus' | 'email' | 'class';

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
  isSyncing: boolean;
  lastSyncAt: string | null;
  isLoading: boolean;
  syncError: string | null;
}

const TasksContext = createContext<TasksContextType | null>(null);

const STORAGE_KEY = '@tasks_v2';
const SYNC_KEY = '@last_sync';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SYNC_KEY),
      AsyncStorage.getItem('@tasks_v1'), // migrate old key
    ])
      .then(([tasksRaw, syncRaw, oldRaw]) => {
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
      const existingUni = prevTasks.filter(t => t.source === 'university');
      const existingMap = new Map(existingUni.map(t => [t.externalId, t]));

      const updatedUni: Task[] = moodleTasks.map(mTask => {
        const existing = existingMap.get(mTask.id);
        if (existing) {
          return {
            ...existing,
            title: mTask.title,
            courseName: mTask.courseName || undefined,
            dueDate: mTask.dueDate || undefined,
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
          dueDate: mTask.dueDate || undefined,
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

  const syncUniversityTasks = useCallback(
    async (sessionToken: string, sesskey: string, reloginFn?: ReloginFn) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      const doFetch = async (token: string, key: string) => {
        const result = await getUniversityTasks({ sessionToken: token, sesskey: key });
        return result as typeof result & { sessionExpired?: boolean };
      };

      try {
        let result = await doFetch(sessionToken, sesskey);

        // If session expired, attempt silent re-login and retry once
        if ((result as any).sessionExpired && reloginFn) {
          const newCreds = await reloginFn();
          if (newCreds) {
            result = await doFetch(newCreds.sessionToken, newCreds.sesskey);
          }
        }

        if (!(result as any).sessionExpired) {
          setTasks(prev => {
            const updated = applyMoodleTasks(result.tasks, prev);
            persist(updated);
            return updated;
          });
          const now = new Date().toISOString();
          setLastSyncAt(now);
          AsyncStorage.setItem(SYNC_KEY, now).catch(() => {});
        } else {
          setSyncError('Sesión expirada. Cerrando sesión...');
        }
      } catch {
        setSyncError('Error de conexión al sincronizar');
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [persist, applyMoodleTasks],
  );

  return (
    <TasksContext.Provider
      value={{ tasks, addTask, toggleTask, deleteTask, syncUniversityTasks, isSyncing, lastSyncAt, isLoading, syncError }}
    >
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
