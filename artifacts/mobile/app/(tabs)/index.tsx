import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  AppState,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTasks } from '@/context/TasksContext';
import { useAuth } from '@/context/AuthContext';
import { TaskItem } from '@/components/TaskItem';
import { AITaskDialog } from '@/components/AITaskDialog';

type Filter = 'all' | 'today' | 'tomorrow' | 'week' | 'nodate';

const FILTERS: { key: Filter; label: string; icon: string }[] = [
  { key: 'all', label: 'Todas', icon: 'list' },
  { key: 'today', label: 'Hoy', icon: 'sun' },
  { key: 'tomorrow', label: 'Mañana', icon: 'sunrise' },
  { key: 'week', label: 'Esta semana', icon: 'calendar' },
  { key: 'nodate', label: 'Sin fecha', icon: 'minus-circle' },
];

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

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23,59,59,999); return r; }

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, isLoading, isSyncing, lastSyncAt, syncUniversityTasks } = useTasks();
  const { sessionToken, sesskey, isAuthenticated } = useAuth();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const [filter, setFilter] = useState<Filter>('all');
  const [aiDialogVisible, setAiDialogVisible] = useState(false);

  const pendingTasks = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = endOfDay(tomorrowStart);
    const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);

    return tasks
      .filter(t => {
        if (t.completed) return false;
        if (filter === 'all') return true;
        if (filter === 'today') {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= todayStart && d <= todayEnd;
        }
        if (filter === 'tomorrow') {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= tomorrowStart && d <= tomorrowEnd;
        }
        if (filter === 'week') {
          if (!t.dueDate) return false;
          const d = new Date(t.dueDate);
          return d >= todayStart && d <= weekEnd;
        }
        if (filter === 'nodate') return !t.dueDate;
        return true;
      })
      .sort((a, b) => {
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        const order = { high: 0, medium: 1, low: 2 } as const;
        return order[a.priority] - order[b.priority];
      });
  }, [tasks, filter]);

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(
      t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === today,
    ).length;
  }, [tasks]);

  const doSync = useCallback(async () => {
    if (!isAuthenticated || !sessionToken || !sesskey || isSyncing) return;
    await syncUniversityTasks(sessionToken, sesskey);
  }, [isAuthenticated, sessionToken, sesskey, isSyncing, syncUniversityTasks]);

  const INTERVAL_MS = 30 * 60 * 1000;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    doSync();
    const sub = AppState.addEventListener('change', state => { if (state === 'active') doSync(); });
    intervalRef.current = setInterval(doSync, INTERVAL_MS);
    return () => { sub.remove(); if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionToken, sesskey]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const dateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const filterCount = (f: Filter) => {
    const now = new Date();
    const todayStart = startOfDay(now); const todayEnd = endOfDay(now);
    const tomorrowStart = new Date(todayStart); tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = endOfDay(tomorrowStart);
    const weekEnd = new Date(todayStart); weekEnd.setDate(weekEnd.getDate() + 7);
    return tasks.filter(t => {
      if (t.completed) return false;
      if (f === 'all') return true;
      if (f === 'today') { if (!t.dueDate) return false; const d = new Date(t.dueDate); return d >= todayStart && d <= todayEnd; }
      if (f === 'tomorrow') { if (!t.dueDate) return false; const d = new Date(t.dueDate); return d >= tomorrowStart && d <= tomorrowEnd; }
      if (f === 'week') { if (!t.dueDate) return false; const d = new Date(t.dueDate); return d >= todayStart && d <= weekEnd; }
      if (f === 'nodate') return !t.dueDate;
      return true;
    }).length;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 20, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {greeting()}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Mis Tareas
            </Text>
            <Text style={[styles.dateText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {dateStr}
            </Text>
          </View>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); doSync(); }}
            style={({ pressed }) => [styles.syncBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius, opacity: pressed ? 0.7 : 1 }]}
            disabled={isSyncing}
          >
            {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : <Feather name="refresh-cw" size={16} color={colors.primary} />}
          </Pressable>
        </View>

        {/* Sync status */}
        <View style={styles.syncRow}>
          <Feather name={isSyncing ? 'loader' : 'check'} size={11} color={colors.mutedForeground} />
          <Text style={[styles.syncText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {isSyncing ? 'Sincronizando con campus virtual...' : formatLastSync(lastSyncAt)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.primary + '14', borderRadius: colors.radius }]}>
          <Text style={[styles.statNumber, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
            {tasks.filter(t => !t.completed).length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>Pendientes</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: '#22C55E14', borderRadius: colors.radius }]}>
          <Text style={[styles.statNumber, { color: '#22C55E', fontFamily: 'Inter_700Bold' }]}>{completedToday}</Text>
          <Text style={[styles.statLabel, { color: '#22C55E', fontFamily: 'Inter_500Medium' }]}>Hoy completadas</Text>
        </View>
      </View>

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={{ maxHeight: 48 }}
      >
        {FILTERS.map(f => {
          const count = filterCount(f.key);
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: active ? colors.primary : colors.card,
                  borderColor: active ? colors.primary : colors.border,
                  borderRadius: 20,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => { Haptics.selectionAsync(); setFilter(f.key); }}
            >
              <Text style={[styles.filterText, { color: active ? '#FFF' : colors.mutedForeground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {f.label}
              </Text>
              {count > 0 && (
                <View style={[styles.filterBadge, { backgroundColor: active ? '#FFFFFF33' : colors.primary + '18' }]}>
                  <Text style={[styles.filterBadgeText, { color: active ? '#FFF' : colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                    {count}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Task list */}
      <FlatList
        data={pendingTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskItem task={item} />}
        contentContainerStyle={[
          styles.listContent,
          pendingTasks.length === 0 && styles.emptyContent,
          { paddingBottom: Platform.OS === 'web' ? 130 : 110 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshing={isSyncing}
        onRefresh={doSync}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Feather name="check-circle" size={52} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                {filter === 'all' ? 'Todo al día' : 'Sin tareas aquí'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {filter === 'all'
                  ? 'No tienes tareas pendientes.\nToca + para agregar una nueva.'
                  : 'No hay tareas con este filtro.'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* FABs */}
      <View style={[styles.fabGroup, { bottom: Platform.OS === 'web' ? 106 : 90 }]}>
        {/* AI button */}
        <Pressable
          style={({ pressed }) => [
            styles.fabSecondary,
            { backgroundColor: colors.secondary, borderRadius: 20, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAiDialogVisible(true); }}
        >
          <Feather name="zap" size={20} color={colors.primary} />
        </Pressable>

        {/* Main FAB */}
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { backgroundColor: colors.primary, borderRadius: 28, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => router.push('/add')}
        >
          <Feather name="plus" size={26} color="#FFFFFF" />
        </Pressable>
      </View>

      <AITaskDialog visible={aiDialogVisible} onClose={() => setAiDialogVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 14, marginBottom: 2 },
  headerTitle: { fontSize: 30, letterSpacing: -0.5 },
  dateText: { fontSize: 13, marginTop: 3, textTransform: 'capitalize' },
  syncBtn: { width: 38, height: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  syncText: { fontSize: 11 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 12 },
  statCard: { flex: 1, padding: 14 },
  statNumber: { fontSize: 28, lineHeight: 32 },
  statLabel: { fontSize: 12, marginTop: 2 },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingBottom: 12 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  filterText: { fontSize: 13 },
  filterBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  emptyContent: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, marginTop: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fabGroup: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 12 },
  fabSecondary: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  fab: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
