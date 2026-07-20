import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  note?: string;
  priority: Priority;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

interface TasksContextType {
  tasks: Task[];
  addTask: (title: string, note?: string, priority?: Priority) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  isLoading: boolean;
}

const TasksContext = createContext<TasksContextType | null>(null);

const STORAGE_KEY = '@tasks_v1';

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(data => {
        if (data) setTasks(JSON.parse(data));
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

  return (
    <TasksContext.Provider value={{ tasks, addTask, toggleTask, deleteTask, isLoading }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error('useTasks must be used within TasksProvider');
  return ctx;
}
