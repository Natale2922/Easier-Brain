import { useEffect, useCallback, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Task } from '@/context/TasksContext';
import { parseTaskDueDate } from '@/utils/date';
import { campusTaskSnapshotKey, recordCampusNotifications } from '@/utils/campusNotifications';

// Dynamically import expo-notifications to avoid crashes if not available
let Notifications: any = null;
try {
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

function setCampusNotificationHandler() {
  Notifications?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

async function deviceNotificationsGranted() {
  if (!Notifications || Platform.OS === 'web') return false;
  try {
    const permission = await Notifications.getPermissionsAsync();
    return permission.granted || permission.status === 'granted';
  } catch {
    return false;
  }
}

export function useNotifications() {
  const [deviceNotificationsEnabled, setDeviceNotificationsEnabled] = useState(false);
  const [deviceNotificationsCanAskAgain, setDeviceNotificationsCanAskAgain] = useState(true);

  useEffect(() => {
    if (!Notifications || Platform.OS === 'web') return;
    (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        const granted = permission.granted || permission.status === 'granted';
        setDeviceNotificationsEnabled(granted);
        setDeviceNotificationsCanAskAgain(permission.canAskAgain ?? true);
        if (granted) setCampusNotificationHandler();
      } catch {}
    })();
  }, []);

  const enableDeviceNotifications = useCallback(async () => {
    if (!Notifications || Platform.OS === 'web') return false;
    try {
      let permission = await Notifications.getPermissionsAsync();
      if (!permission.granted && permission.status !== 'granted') {
        permission = await Notifications.requestPermissionsAsync();
      }
      const granted = permission.granted || permission.status === 'granted';
      setDeviceNotificationsEnabled(granted);
      setDeviceNotificationsCanAskAgain(permission.canAskAgain ?? true);
      if (granted) setCampusNotificationHandler();
      return granted;
    } catch {
      return false;
    }
  }, []);

  const scheduleReminder = useCallback(async (task: Task) => {
    if (!Notifications || Platform.OS === 'web' || !task.dueDate) return false;
    try {
      if (!(await deviceNotificationsGranted())) return false;

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
      if (!(await deviceNotificationsGranted())) return;
      await Notifications.cancelAllScheduledNotificationsAsync();
      const pending = tasks.filter(t => !t.completed && t.dueDate);
      for (const task of pending.slice(0, 20)) { // limit to 20 to avoid OS limits
        await scheduleReminder(task);
      }
    } catch {}
  }, [scheduleReminder]);

  const notifyCampusChanges = useCallback(async (tasks: Task[], username: string | null) => {
    if (!username) return;
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
              instructions: task.instructions ?? '',
              campusUrl: task.campusUrl ?? '',
            },
          ]),
      );
      const snapshotKey = campusTaskSnapshotKey(username);
      const previousRaw = await AsyncStorage.getItem(snapshotKey);
      await AsyncStorage.setItem(snapshotKey, JSON.stringify(current));
      if (!previousRaw) return;

      let previous: Record<string, typeof current[string]>;
      try {
        previous = JSON.parse(previousRaw);
      } catch {
        return;
      }
      const changes = Object.entries(current).filter(([id, value]) => {
        const old = previous[id];
        return !old || JSON.stringify(old) !== JSON.stringify(value);
      });

      const changedEntries = changes.map(([id, value]) => {
        const isNew = !previous[id];
        return {
          type: isNew ? 'task_added' as const : 'task_updated' as const,
          title: isNew ? 'Nueva tarea del campus' : 'Tarea actualizada',
          body: `"${value.title}"${value.courseName ? ` · ${value.courseName}` : ''}`,
          taskId: id,
          campusUrl: value.campusUrl || undefined,
        };
      });
      const today = new Date();
      const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const removedEntries = Object.entries(previous)
        .filter(([id, value]) => !current[id] && !!value.dueDate && value.dueDate >= todayKey)
        .map(([id, value]) => ({
          type: 'task_removed' as const,
          title: 'Tarea retirada del campus',
          body: `"${value.title}"${value.courseName ? ` · ${value.courseName}` : ''}`,
          taskId: id,
          campusUrl: value.campusUrl || undefined,
        }));
      const entries = [...changedEntries, ...removedEntries];
      if (entries.length) {
        await recordCampusNotifications(username, entries);
      }

      if (!Notifications || Platform.OS === 'web' || !(await deviceNotificationsGranted())) return;
      for (const entry of entries.slice(0, 8)) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: entry.title,
            body: entry.body,
            data: { taskId: entry.taskId, source: 'university', type: entry.type },
          },
          trigger: null,
        });
      }
    } catch {
      // A notification failure must never block task synchronization.
    }
  }, []);

  return {
    scheduleReminder,
    cancelAllReminders,
    scheduleBulkReminders,
    notifyCampusChanges,
    deviceNotificationsEnabled,
    deviceNotificationsCanAskAgain,
    enableDeviceNotifications,
  };
}
