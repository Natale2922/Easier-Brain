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

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  // University task extras
  source?: TaskSource;
  externalId?: string;
  dueDate?: string;
  courseName?: string;
}

interface TasksContextType {
  tasks: Task[];
  addTask: (title: string, note?: string, priority?: Priority) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  syncUniversityTasks: (sessionToken: string, sesskey: string) => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: string | null;
  isLoading: boolean;
}

const TasksContext = createContext<TasksContextType | null>(null);

const STORAGE_KEY = '@tasks_v1';
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
    ])
      .then(([tasksRaw, syncRaw]) => {
        if (tasksRaw) setTasks(JSON.parse(tasksRaw));
        if (syncRaw) setLastSyncAt(syncRaw);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const persist = useCallback((newTasks: Task[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newTasks)).catch(() => {});
  }, []);

  const addTask = useCallback(
    (title: string, note?: string, priority: Priority = 'medium') => {
      const newTask: Task = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        title,
        note,
        priority,
        completed: false,
        source: 'manual',
        createdAt: new Date().toISOString(),
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
          // Separate manual tasks from university-sourced tasks
          const manualTasks = prev.filter(t => t.source !== 'university');
          const existingUniTasks = prev.filter(t => t.source === 'university');
          const existingMap = new Map(
            existingUniTasks.map(t => [t.externalId, t]),
          );

          const updatedUniTasks: Task[] = result.tasks.map(mTask => {
            const existing = existingMap.get(mTask.id);
            if (existing) {
              // Update metadata but preserve completion status
              return {
                ...existing,
                title: mTask.title,
                courseName: mTask.courseName || undefined,
                dueDate: mTask.dueDate || undefined,
              };
            }
            // New task from Moodle
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
