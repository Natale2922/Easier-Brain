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
  // Scheduling
  dueDate?: string;
  dueTime?: string;
  // Classification
  courseName?: string;
  deliveryMethod?: DeliveryMethod;
  // University sync
  source?: TaskSource;
  externalId?: string;
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

interface TasksContextType {
  tasks: Task[];
  addTask: (params: AddTaskParams) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  syncUniversityTasks: (sessionToken: string, sesskey: string) => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: string | null;
  isLoading: boolean;
}

const TasksContext = createContext<TasksContextType | null>(null);

const STORAGE_KEY = '@tasks_v2';
const SYNC_KEY = '@last_sync';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(SYNC_KEY),
      // Migrate from old storage key
      AsyncStorage.getItem('@tasks_v1'),
    ])
      .then(([tasksRaw, syncRaw, oldRaw]) => {
        if (tasksRaw) {
          setTasks(JSON.parse(tasksRaw));
        } else if (oldRaw) {
          // Migrate old tasks
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
      const {
        title,
        note,
        priority = 'medium',
        dueDate,
        dueTime,
        courseName,
        deliveryMethod,
      } = params;
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
            ? {
                ...t,
                completed: !t.completed,
                completedAt: !t.completed ? new Date().toISOString() : undefined,
              }
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

  const syncUniversityTasks = useCallback(
    async (sessionToken: string, sesskey: string) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);

      try {
        const result = await getUniversityTasks({ sessionToken, sesskey });

        setTasks(prev => {
          const manualTasks = prev.filter(t => t.source !== 'university');
          const existingUniTasks = prev.filter(t => t.source === 'university');
          const existingMap = new Map(existingUniTasks.map(t => [t.externalId, t]));

          const updatedUniTasks: Task[] = result.tasks.map(mTask => {
            const existing = existingMap.get(mTask.id);
            if (existing) {
              return {
                ...existing,
                title: mTask.title,
                courseName: mTask.courseName || undefined,
                dueDate: mTask.dueDate || undefined,
              };
            }
            return {
              id: 'uni_' + mTask.id,
              externalId: mTask.id,
              title: mTask.title,
              courseName: mTask.courseName || undefined,
              note: mTask.description || undefined,
              dueDate: mTask.dueDate || undefined,
              priority: 'medium' as Priority,
              completed: false,
              source: 'university' as TaskSource,
              createdAt: new Date().toISOString(),
            };
          });

          const updated = [...manualTasks, ...updatedUniTasks];
          persist(updated);
          return updated;
        });

        const now = new Date().toISOString();
        setLastSyncAt(now);
        AsyncStorage.setItem(SYNC_KEY, now).catch(() => {});
      } catch {
        // Silently fail — keep existing tasks
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [persist],
  );

  return (
    <TasksContext.Provider
      value={{
        tasks,
        addTask,
        toggleTask,
        deleteTask,
        syncUniversityTasks,
        isSyncing,
        lastSyncAt,
        isLoading,
      }}
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
