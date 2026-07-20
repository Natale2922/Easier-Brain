import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTasks } from '@/context/TasksContext';
import { useAuth } from '@/context/AuthContext';
import { TaskItem } from '@/components/TaskItem';

function formatLastSync(isoString: string | null): string {
  if (!isoString) return 'Nunca sincronizado';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, isLoading, isSyncing, lastSyncAt, syncUniversityTasks } = useTasks();
  const { sessionToken, sesskey, isAuthenticated } = useAuth();

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter(t => !t.completed)
        .sort((a, b) => {
          // University tasks with due dates first
          if (a.dueDate && !b.dueDate) return -1;
          if (!a.dueDate && b.dueDate) return 1;
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          const order = { high: 0, medium: 1, low: 2 } as const;
          return order[a.priority] - order[b.priority];
        }),
    [tasks],
  );

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(
      t =>
        t.completed &&
        t.completedAt &&
        new Date(t.completedAt).toDateString() === today,
    ).length;
  }, [tasks]);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  // Sync helper
  const doSync = useCallback(async () => {
    if (!isAuthenticated || !sessionToken || !sesskey || isSyncing) return;
    await syncUniversityTasks(sessionToken, sesskey);
  }, [isAuthenticated, sessionToken, sesskey, isSyncing, syncUniversityTasks]);

  // Auto-sync: on mount, on foreground, every 30 minutes
  const INTERVAL_MS = 30 * 60 * 1000;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Sync on mount
    doSync();

    // Sync on foreground
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') doSync();
    });

    // Sync on interval
    intervalRef.current = setInterval(doSync, INTERVAL_MS);

    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionToken, sesskey]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const dateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 20, backgroundColor: colors.background },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text
              style={[
                styles.greeting,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              {greeting()}
            </Text>
            <Text
              style={[
                styles.headerTitle,
                { color: colors.foreground, fontFamily: 'Inter_700Bold' },
              ]}
            >
              Mis Tareas
            </Text>
            <Text
              style={[
                styles.dateText,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              {dateStr}
            </Text>
          </View>

          {/* Sync button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              doSync();
            }}
            style={({ pressed }) => [
              styles.syncBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: colors.radius,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={16} color={colors.primary} />
            )}
          </Pressable>
        </View>

        {/* Sync status */}
        <View style={styles.syncRow}>
          <Feather
            name={isSyncing ? 'loader' : 'check'}
            size={11}
            color={colors.mutedForeground}
          />
          <Text
            style={[
              styles.syncText,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            {isSyncing
              ? 'Sincronizando con campus virtual...'
              : formatLastSync(lastSyncAt)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statCard,
            { backgroundColor: colors.primary + '14', borderRadius: colors.radius },
          ]}
        >
          <Text
            style={[
              styles.statNumber,
              { color: colors.primary, fontFamily: 'Inter_700Bold' },
            ]}
          >
            {pendingTasks.length}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: colors.primary, fontFamily: 'Inter_500Medium' },
            ]}
          >
            Pendientes
          </Text>
        </View>
        <View
          style={[
            styles.statCard,
            { backgroundColor: '#22C55E14', borderRadius: colors.radius },
          ]}
        >
          <Text
            style={[
              styles.statNumber,
              { color: '#22C55E', fontFamily: 'Inter_700Bold' },
            ]}
          >
            {completedToday}
          </Text>
          <Text
            style={[
              styles.statLabel,
              { color: '#22C55E', fontFamily: 'Inter_500Medium' },
            ]}
          >
            Hoy completadas
          </Text>
        </View>
      </View>

      {/* Task list */}
      <FlatList
        data={pendingTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskItem task={item} />}
        contentContainerStyle={[
          styles.listContent,
          pendingTasks.length === 0 && styles.emptyContent,
          { paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={isSyncing}
        onRefresh={doSync}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={52} color={colors.border} />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                Todo al día
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  {
                    color: colors.mutedForeground,
                    fontFamily: 'Inter_400Regular',
                  },
                ]}
              >
                No tienes tareas pendientes.{'\n'}Toca + para agregar una nueva.
              </Text>
            </View>
          ) : null
        }
      />

      {/* FAB */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            borderRadius: 28,
            bottom: Platform.OS === 'web' ? 106 : 90,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
        onPress={() => router.push('/add')}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: 14, marginBottom: 2 },
  headerTitle: { fontSize: 30, letterSpacing: -0.5 },
  dateText: { fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
  syncBtn: {
    width: 38,
    height: 38,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
  },
  syncText: { fontSize: 11 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 14,
    alignItems: 'flex-start',
  },
  statNumber: { fontSize: 28, lineHeight: 32 },
  statLabel: { fontSize: 12, marginTop: 2 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  emptyContent: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, marginTop: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
