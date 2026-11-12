import AsyncStorage from '@react-native-async-storage/async-storage';

export type CampusNotificationType = 'task_added' | 'task_updated' | 'task_removed' | 'session_attention';

export interface CampusNotification {
  id: string;
  type: CampusNotificationType;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  taskId?: string;
  campusUrl?: string;
}

export type NewCampusNotification = Pick<
  CampusNotification,
  'type' | 'title' | 'body' | 'taskId' | 'campusUrl'
>;

const STORAGE_PREFIX = '@nuvo_campus_notifications_v1';
const SNAPSHOT_PREFIX = '@nuvo_campus_task_snapshot_v2';
const SESSION_NOTICE_PREFIX = '@nuvo_campus_session_notice_v1';
const MAX_NOTIFICATIONS = 120;
const SESSION_NOTICE_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function accountScope(username: string) {
  let hash = 2166136261;
  const normalized = username.trim().toLocaleLowerCase('es-MX');
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function notificationsKey(username: string) {
  return `${STORAGE_PREFIX}:${accountScope(username)}`;
}

export function campusTaskSnapshotKey(username: string) {
  return `${SNAPSHOT_PREFIX}:${accountScope(username)}`;
}

function sessionNoticeKey(username: string) {
  return `${SESSION_NOTICE_PREFIX}:${accountScope(username)}`;
}

export async function loadCampusNotifications(username: string | null | undefined): Promise<CampusNotification[]> {
  if (!username) return [];
  try {
    const raw = await AsyncStorage.getItem(notificationsKey(username));
    if (!raw) return [];
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is CampusNotification => (
        !!item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.body === 'string' &&
        typeof item.createdAt === 'string' &&
        typeof item.read === 'boolean'
      ))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch {
    return [];
  }
}

export async function recordCampusNotifications(
  username: string | null | undefined,
  entries: NewCampusNotification[],
): Promise<CampusNotification[]> {
  if (!username || entries.length === 0) return loadCampusNotifications(username);
  const current = await loadCampusNotifications(username);
  const createdAt = new Date().toISOString();
  const added = entries.map((entry, index): CampusNotification => ({
    ...entry,
    id: `${Date.now().toString(36)}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt,
    read: false,
  }));
  const next = [...added, ...current].slice(0, MAX_NOTIFICATIONS);
  await AsyncStorage.setItem(notificationsKey(username), JSON.stringify(next));
  return next;
}

export async function markCampusNotificationRead(
  username: string | null | undefined,
  notificationId: string,
): Promise<CampusNotification[]> {
  if (!username) return [];
  const current = await loadCampusNotifications(username);
  const next = current.map(item => item.id === notificationId ? { ...item, read: true } : item);
  await AsyncStorage.setItem(notificationsKey(username), JSON.stringify(next));
  return next;
}

export async function markAllCampusNotificationsRead(
  username: string | null | undefined,
): Promise<CampusNotification[]> {
  if (!username) return [];
  const current = await loadCampusNotifications(username);
  const next = current.map(item => ({ ...item, read: true }));
  await AsyncStorage.setItem(notificationsKey(username), JSON.stringify(next));
  return next;
}

export async function recordCampusSessionIssue(
  username: string | null | undefined,
): Promise<boolean> {
  if (!username) return false;
  const key = sessionNoticeKey(username);
  const now = Date.now();
  try {
    const previous = Number(await AsyncStorage.getItem(key));
    if (Number.isFinite(previous) && now - previous < SESSION_NOTICE_COOLDOWN_MS) return false;

    await recordCampusNotifications(username, [{
      type: 'session_attention',
      title: 'Revisa tu acceso al campus',
      body: 'La sesión caducó o las credenciales guardadas ya no son válidas. Inicia sesión de nuevo para continuar.',
    }]);
    await AsyncStorage.setItem(key, String(now));
    return true;
  } catch {
    return false;
  }
}
