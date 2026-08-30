import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '@/context/TasksContext';
import { parseTaskDueDate } from '@/utils/date';

// Dynamically import expo-notifications to avoid crashes if not available
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

const CAMPUS_SNAPSHOT_KEY = '@nuvo_campus_task_snapshot_v1';

export function useNotifications() {
  useEffect(() => {
    if (!Notifications || Platform.OS === 'web') return;
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch {}
    })();
  }, []);

  const scheduleReminder = useCallback(async (task: Task) => {
    if (!Notifications || Platform.OS === 'web' || !task.dueDate) return false;
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') return false;
      }

      const dueDate = parseTaskDueDate(task.dueDate, task.dueTime);
      if (!dueDate) return false;
      if (task.dueTime) {
        const [h, m] = task.dueTime.split(':').map(Number);
        dueDate.setHours(h, m, 0, 0);
      } else {
        dueDate.setHours(23, 59, 0, 0);
      }

      const now = Date.now();
      const notifIds: string[] = [];

      // 24 hours before
      const oneDayBefore = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000);
      if (oneDayBefore.getTime() > now) {
        const id1 = await Notifications.scheduleNotificationAsync({
          content: {
            title: '📅 Tarea para mañana',
            body: `"${task.title}"${task.courseName ? ` — ${task.courseName}` : ''}`,
            data: { taskId: task.id },
          },
          trigger: { date: oneDayBefore },
        });
        notifIds.push(id1);
      }

      // 1 hour before
      const oneHourBefore = new Date(dueDate.getTime() - 60 * 60 * 1000);
      if (oneHourBefore.getTime() > now) {
        const id2 = await Notifications.scheduleNotificationAsync({
          content: {
            title: '⏰ ¡Tarea en 1 hora!',
            body: `"${task.title}"${task.courseName ? ` — ${task.courseName}` : ''}`,
            data: { taskId: task.id },
          },
          trigger: { date: oneHourBefore },
        });
        notifIds.push(id2);
      }

      // At due time
      if (dueDate.getTime() > now) {
        const id3 = await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 ¡Tarea vence ahora!',
            body: `"${task.title}"${task.courseName ? ` — ${task.courseName}` : ''}`,
            data: { taskId: task.id },
          },
          trigger: { date: dueDate },
        });
        notifIds.push(id3);
      }

      return notifIds.length > 0;
    } catch {
      return false;
    }
  }, []);

  const cancelAllReminders = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch {}
  }, []);

  const scheduleBulkReminders = useCallback(async (tasks: Task[]) => {
    if (!Notifications || Platform.OS === 'web') return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      const pending = tasks.filter(t => !t.completed && t.dueDate);
      for (const task of pending.slice(0, 20)) { // limit to 20 to avoid OS limits
        await scheduleReminder(task);
      }
    } catch {}
  }, [scheduleReminder]);

  const notifyCampusChanges = useCallback(async (tasks: Task[]) => {
    if (!Notifications || Platform.OS === 'web') return;
    try {
      const current = Object.fromEntries(
        tasks
          .filter(task => task.source === 'university')
          .map(task => [
            task.externalId ?? task.id,
            {
              title: task.title,
              courseName: task.courseName ?? '',
              dueDate: task.dueDate ?? '',
              dueTime: task.dueTime ?? '',
            },
          ]),
      );
      const previousRaw = await AsyncStorage.getItem(CAMPUS_SNAPSHOT_KEY);
      await AsyncStorage.setItem(CAMPUS_SNAPSHOT_KEY, JSON.stringify(current));
      if (!previousRaw) return;

      const previous = JSON.parse(previousRaw) as Record<string, typeof current[string]>;
      const changes = Object.entries(current).filter(([id, value]) => {
        const old = previous[id];
        return !old || JSON.stringify(old) !== JSON.stringify(value);
      });

      for (const [id, value] of changes.slice(0, 8)) {
        const isNew = !previous[id];
        await Notifications.scheduleNotificationAsync({
          content: {
            title: isNew ? '✨ Nueva tarea en el campus' : '🔔 Tarea actualizada',
            body: `"${value.title}"${value.courseName ? ` — ${value.courseName}` : ''}`,
            data: { taskId: id, source: 'university' },
          },
          trigger: null,
        });
      }
    } catch {
      // A notification failure must never block task synchronization.
    }
  }, []);

  return { scheduleReminder, cancelAllReminders, scheduleBulkReminders, notifyCampusChanges };
}
