import FloatingActions from "@/components/dashboard/FloatingActions";
import TaskList from "@/components/dashboard/TaskList";
import DashboardStats from "@/components/dashboard/DashboardStats";
import FilterBar from "@/components/dashboard/FilterBar";
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
import { useTasks, isOverdueArchived, type Task } from '@/context/TasksContext';
import { useAuth } from '@/context/AuthContext';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { AITaskDialog } from '@/components/ai/AITaskDialog';
import { useNotifications } from '@/hooks/useNotifications';

type Filter = 'all' | 'today' | 'tomorrow' | 'week' | 'nodate';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'week', label: 'Esta semana' },
  { key: 'nodate', label: 'Sin fecha' },
];

function formatLastSync(isoString: string | null): string {
  if (!isoString) return 'Nunca sincronizado';
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Ahora mismo';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Hace ${diffH} h`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function dayBounds(offsetDays: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const start = d.getTime();
  const end = start + 86399999;
  return { start, end };
}

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks, isLoading, isSyncing, lastSyncAt, syncUniversityTasks, syncError } = useTasks();
  const { sessionToken, sesskey, isAuthenticated, userFullname, logout, reloginSilently } = useAuth();
  const { scheduleBulkReminders } = useNotifications();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const [filter, setFilter] = useState<Filter>('all');
  const [aiDialogVisible, setAiDialogVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  // 2-step logout: 0=normal, 1=confirming
  const [logoutStep, setLogoutStep] = useState<0 | 1>(0);
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auto-logout when session is permanently expired ─────────────────────
  useEffect(() => {
    if (syncError === 'SESSION_EXPIRED_FINAL') {
      const timer = setTimeout(() => {
        logout();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [syncError, logout]);

  // ─── Filtered pending tasks ──────────────────────────────────────────────
  const pendingTasks = useMemo(() => {
    const today = dayBounds(0);
    const tomorrow = dayBounds(1);
    const weekEnd = Date.now() + 7 * 86400000;

    return tasks
      .filter(t => {
        if (t.completed) return false;
        if (isOverdueArchived(t)) return false; // auto-archived: show in Archivo tab
        if (filter === 'all') return true;
        const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
        if (filter === 'today') return due !== null && due >= today.start && due <= today.end;
        if (filter === 'tomorrow') return due !== null && due >= tomorrow.start && due <= tomorrow.end;
        if (filter === 'week') return due !== null && due >= today.start && due <= weekEnd;
        if (filter === 'nodate') return due === null;
        return true;
      })
      .sort((a, b) => {
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate)
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        const ord = { high: 0, medium: 1, low: 2 } as const;
        return ord[a.priority] - ord[b.priority];
      });
  }, [tasks, filter]);

  const completedToday = useMemo(() => {
    const today = new Date().toDateString();
    return tasks.filter(
      t => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === today,
    ).length;
  }, [tasks]);

  // ─── Sync ────────────────────────────────────────────────────────────────
  const doSync = useCallback(async () => {
    if (!isAuthenticated || !sessionToken || !sesskey || isSyncing) return;
    await syncUniversityTasks(sessionToken, sesskey, reloginSilently);
  }, [isAuthenticated, sessionToken, sesskey, isSyncing, syncUniversityTasks, reloginSilently]);

  // Schedule notifications after tasks load/sync
  useEffect(() => {
    if (tasks.length > 0) {
      scheduleBulkReminders(tasks.filter(t => !t.completed && t.dueDate));
    }
  }, [tasks.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const INTERVAL_MS = 20 * 60 * 1000;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    doSync();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') doSync();
    });
    intervalRef.current = setInterval(doSync, INTERVAL_MS);
    return () => {
      sub.remove();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, sessionToken, sesskey]);

  // ─── Logout (2-tap, no Alert) ─────────────────────────────────────────────
  const handleLogoutPress = () => {
    if (logoutStep === 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLogoutStep(1);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = setTimeout(() => setLogoutStep(0), 3000);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      setLogoutStep(0);
      logout();
    }
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const dateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const filterCount = (f: Filter): number => {
    const today = dayBounds(0);
    const tomorrow = dayBounds(1);
    const weekEnd = Date.now() + 7 * 86400000;
    return tasks.filter(t => {
      if (t.completed) return false;
      if (isOverdueArchived(t)) return false;
      const due = t.dueDate ? new Date(t.dueDate).getTime() : null;
      if (f === 'all') return true;
      if (f === 'today') return due !== null && due >= today.start && due <= today.end;
      if (f === 'tomorrow') return due !== null && due >= tomorrow.start && due <= tomorrow.end;
      if (f === 'week') return due !== null && due >= today.start && due <= weekEnd;
      if (f === 'nodate') return due === null;
      return false;
    }).length;
  };

  const isSessionExpired = syncError === 'SESSION_EXPIRED_FINAL';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Session expired banner */}
      {isSessionExpired && (
        <View style={[styles.expiredBanner, { backgroundColor: colors.destructive }]}>
          <Feather name="alert-circle" size={14} color="#FFF" />
          <Text style={[styles.expiredText, { fontFamily: 'Inter_500Medium' }]}>
            Sesión expirada. Iniciando sesión nuevamente...
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {greeting()}{userFullname ? `, ${userFullname.split(' ')[0]}` : ''}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              Mis Tareas
            </Text>
            <Text style={[styles.dateText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {dateStr}
            </Text>
          </View>
          <View style={styles.headerBtns}>
            {/* Sync */}
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); doSync(); }}
              style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, opacity: pressed ? 0.7 : 1 }]}
              disabled={isSyncing}
            >
              {isSyncing
                ? <ActivityIndicator size="small" color={colors.primary} />
                : <Feather name="refresh-cw" size={16} color={colors.primary} />}
            </Pressable>
            {/* Logout — tap once shows "¿Salir?", tap again confirms */}
            <Pressable
              onPress={handleLogoutPress}
              style={({ pressed }) => [
                styles.iconBtn,
                {
                  backgroundColor: logoutStep === 1 ? colors.destructive + '18' : colors.card,
                  borderColor: logoutStep === 1 ? colors.destructive : colors.border,
                  borderRadius: 14,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              {logoutStep === 1
                ? <Text style={[styles.logoutConfirmText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>¿Sí?</Text>
                : <Feather name="log-out" size={16} color={colors.mutedForeground} />}
            </Pressable>
          </View>
        </View>

        {/* Sync status */}
        <View style={styles.syncRow}>
          <View style={[styles.syncDot, {
            backgroundColor: isSessionExpired ? colors.destructive
              : isSyncing ? colors.primary
              : syncError ? '#FFB347'
              : '#22C55E'
          }]} />
          <Text style={[styles.syncText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {isSessionExpired
              ? 'Sesión expirada — vuelve a iniciar sesión'
              : isSyncing
              ? 'Sincronizando con campus virtual...'
              : syncError
              ? 'Error de conexión'
              : formatLastSync(lastSyncAt)}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <DashboardStats
        pending={tasks.filter((t) => !t.completed).length}
        completedToday={completedToday}
        university={
          tasks.filter((t) => t.source === "university" && !t.completed).length
        }
      />
      
      {/* Filters */}
<FilterBar
  filters={FILTERS}
  selected={filter}
  getCount={filterCount}
  onSelect={setFilter}
/>
      {/* Task list */}
      <TaskList
        pendingTasks={pendingTasks}
        isLoading={isLoading}
        isSyncing={isSyncing}
        doSync={doSync}
        setSelectedTask={setSelectedTask}
        TaskItem={TaskItem}
        styles={styles}
        colors={colors}
        filter={filter}
      />

      {/* FABs */}
<FloatingActions
  styles={styles}
  colors={colors}
  setAiDialogVisible={setAiDialogVisible}
/>
      <AITaskDialog visible={aiDialogVisible} onClose={() => setAiDialogVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  expiredBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10 },
  expiredText: { color: '#FFF', fontSize: 13, flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  greeting: { fontSize: 13, marginBottom: 1 },
  headerTitle: { fontSize: 28, letterSpacing: -0.5 },
  dateText: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  headerBtns: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  logoutConfirmText: { fontSize: 11 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  syncDot: { width: 6, height: 6, borderRadius: 3 },
  syncText: { fontSize: 11 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 10 },
  statCard: { flex: 1, padding: 12 },
  statNumber: { fontSize: 24, lineHeight: 28 },
  statLabel: { fontSize: 11, marginTop: 2 },
  filterRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center', paddingBottom: 10 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 7, borderWidth: 1 },
  filterText: { fontSize: 13 },
  filterBadge: { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  emptyContent: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, marginTop: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  fabGroup: { position: 'absolute', right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fabSecondary: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  fab: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', shadowColor: '#6366F1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8 },
});
