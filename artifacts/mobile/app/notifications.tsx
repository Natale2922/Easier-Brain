import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/common/AppHeader';
import { useAuth } from '@/context/AuthContext';
import { useTasks, isOverdue } from '@/context/TasksContext';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/hooks/useNotifications';
import {
  loadCampusNotifications,
  markAllCampusNotificationsRead,
  markCampusNotificationRead,
  type CampusNotification,
} from '@/utils/campusNotifications';

function formatNotificationDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return date.toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function iconForNotification(notification: CampusNotification): keyof typeof Feather.glyphMap {
  if (notification.type === 'session_attention') return 'key';
  if (notification.type === 'task_added') return 'plus-circle';
  if (notification.type === 'task_removed') return 'minus-circle';
  return 'refresh-cw';
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { username } = useAuth();
  const { tasks } = useTasks();
  const {
    deviceNotificationsEnabled,
    deviceNotificationsCanAskAgain,
    enableDeviceNotifications,
    scheduleBulkReminders,
  } = useNotifications();
  const [notifications, setNotifications] = useState<CampusNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    void loadCampusNotifications(username).then(next => {
      if (active) {
        setNotifications(next);
        setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, [username]));

  const markAllRead = async () => {
    if (!username || isUpdating) return;
    setIsUpdating(true);
    try {
      const next = await markAllCampusNotificationsRead(username);
      setNotifications(next);
    } catch {
      setPermissionMessage('No se pudo actualizar el estado de lectura.');
    } finally {
      setIsUpdating(false);
    }
  };

  const markRead = async (notification: CampusNotification) => {
    if (!username || notification.read) return;
    try {
      const next = await markCampusNotificationRead(username, notification.id);
      setNotifications(next);
    } catch {
      setPermissionMessage('No se pudo guardar el estado de lectura.');
    }
  };

  const handleNotificationPress = async (notification: CampusNotification) => {
    await markRead(notification);
    if (notification.type === 'session_attention') {
      router.push('/accounts');
    }
  };

  const enableDeviceAlerts = async () => {
    setPermissionMessage(null);
    const enabled = await enableDeviceNotifications();
    if (enabled) {
      await scheduleBulkReminders(tasks.filter(task => !task.completed && task.dueDate && !isOverdue(task)));
      setPermissionMessage('Las alertas del dispositivo están activadas.');
    } else {
      setPermissionMessage(
        deviceNotificationsCanAskAgain
          ? 'No se concedió permiso. Puedes intentarlo de nuevo.'
          : 'El permiso está bloqueado. Actívalo desde los ajustes del dispositivo.',
      );
    }
  };

  const openDeviceSettings = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      setPermissionMessage('No se pudieron abrir los ajustes del dispositivo.');
    }
  };

  const unreadCount = notifications.filter(notification => !notification.read).length;
  const bottomInset = Platform.OS === 'web' ? 34 : insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Notificaciones"
        subtitle="Cambios detectados en el campus"
        onBack={() => router.back()}
        showAvatar={false}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset + 28 }]}
      >
        <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.primary + '25' }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.card }]}>
            <Feather name="refresh-cw" size={17} color={colors.primary} />
          </View>
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Cambios del Campus Virtual
            </Text>
            <Text style={[styles.infoText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Se detectan al sincronizar, normalmente cada 20 minutos o cuando abres la app. El campus no ofrece avisos instantáneos.
            </Text>
          </View>
        </View>

        {Platform.OS !== 'web' ? (
          <View style={[styles.permissionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.permissionCopy}>
              <Text style={[styles.permissionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                Alertas del dispositivo
              </Text>
              <Text style={[styles.permissionText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {deviceNotificationsEnabled
                  ? 'Recibe avisos fuera de la app cuando se detecten cambios.'
                  : 'Actívalas para recibir avisos cuando haya cambios del campus o se acerque una tarea.'}
              </Text>
              {permissionMessage ? (
                <Text style={[styles.permissionMessage, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                  {permissionMessage}
                </Text>
              ) : null}
            </View>
            {deviceNotificationsEnabled ? (
              <View style={[styles.enabledMark, { backgroundColor: colors.success + '18' }]}>
                <Feather name="check" size={16} color={colors.success} />
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={deviceNotificationsCanAskAgain ? 'Activar alertas del dispositivo' : 'Abrir ajustes de notificaciones'}
                testID="enable-device-notifications"
                onPress={deviceNotificationsCanAskAgain ? enableDeviceAlerts : openDeviceSettings}
                style={({ pressed }) => [
                  styles.enableButton,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.82 : 1 },
                ]}
              >
                <Feather name={deviceNotificationsCanAskAgain ? 'bell' : 'settings'} size={15} color={colors.primaryForeground} />
              </Pressable>
            )}
          </View>
        ) : null}

        <View style={styles.listHeader}>
          <View>
            <Text style={[styles.listTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Actividad reciente
            </Text>
            <Text style={[styles.listSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {unreadCount ? `${unreadCount} sin leer` : 'Actualizaciones de tus tareas'}
            </Text>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Marcar todas como leídas"
              testID="mark-all-notifications-read"
              disabled={isUpdating}
              onPress={markAllRead}
              style={({ pressed }) => [styles.markAllButton, { opacity: pressed || isUpdating ? 0.7 : 1 }]}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Feather name="check" size={14} color={colors.primary} />
                  <Text style={[styles.markAllText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Leer todo</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>

        {isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="bell-off" size={21} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Sin novedades por ahora
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              No hay notificaciones nuevas o recientes.
            </Text>
          </View>
        ) : (
          <View style={styles.notificationList}>
            {notifications.map(notification => (
              <Pressable
                key={notification.id}
                accessibilityRole="button"
                accessibilityLabel={`${notification.title}${notification.read ? '' : ', sin leer'}${notification.type === 'session_attention' ? ', revisar acceso' : ''}`}
                onPress={() => { void handleNotificationPress(notification); }}
                style={({ pressed }) => [
                  styles.notificationCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: notification.read ? colors.border : colors.primary + '55',
                    opacity: pressed ? 0.84 : 1,
                  },
                ]}
              >
                <View style={[styles.notificationIcon, { backgroundColor: notification.read ? colors.secondary : colors.primary + '18' }]}>
                  <Feather name={iconForNotification(notification)} size={17} color={colors.primary} />
                </View>
                <View style={styles.notificationCopy}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={[styles.notificationTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                      {notification.title}
                    </Text>
                    {!notification.read ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
                  </View>
                  <Text style={[styles.notificationBody, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {notification.body}
                  </Text>
                  <Text style={[styles.notificationDate, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                    {formatNotificationDate(notification.createdAt)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 17 },
  infoCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 17, padding: 14, gap: 11 },
  infoIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 12 },
  infoText: { fontSize: 11, lineHeight: 16 },
  permissionCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 17, padding: 14, gap: 12 },
  permissionCopy: { flex: 1, gap: 4 },
  permissionTitle: { fontSize: 12 },
  permissionText: { fontSize: 11, lineHeight: 16 },
  permissionMessage: { fontSize: 10, marginTop: 2 },
  enabledMark: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  enableButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  listTitle: { fontSize: 18, letterSpacing: -0.3 },
  listSubtitle: { fontSize: 11, marginTop: 3 },
  markAllButton: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 7 },
  markAllText: { fontSize: 11 },
  notificationList: { gap: 9 },
  notificationCard: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 16, padding: 13, gap: 11 },
  notificationIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  notificationCopy: { flex: 1, gap: 5 },
  notificationTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notificationTitle: { flex: 1, fontSize: 12, lineHeight: 17 },
  notificationBody: { fontSize: 11, lineHeight: 16 },
  notificationDate: { fontSize: 9, marginTop: 1 },
  unreadDot: { width: 7, height: 7, borderRadius: 4 },
  emptyCard: { minHeight: 202, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 18, padding: 24, gap: 9 },
  emptyIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  emptyTitle: { fontSize: 15, textAlign: 'center' },
  emptyText: { maxWidth: 240, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
