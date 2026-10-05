import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  AppState,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTasks, isOverdue, type Task } from '@/context/TasksContext';
import { useAuth } from '@/context/AuthContext';
import { useAcademic } from '@/context/AcademicContext';
import { useGrades } from '@/context/GradesContext';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { AITaskDialog } from '@/components/ai/AITaskDialog';
import { BrandLockup } from '@/components/BrandMark';
import { useNotifications } from '@/hooks/useNotifications';
import { displayFontFamily } from '@/theme/typography';
import Svg, { Circle } from 'react-native-svg';

type DrawerRoute = '/(tabs)' | '/calendar' | '/materias' | '/done' | '/horario' | '/calificaciones';

const drawerItems: { label: string; icon: keyof typeof Feather.glyphMap; route?: DrawerRoute }[] = [
  { label: 'Inicio', icon: 'home', route: '/(tabs)' },
  { label: 'Calendario', icon: 'calendar', route: '/calendar' },
  { label: 'Materias', icon: 'book-open', route: '/materias' },
  { label: 'Calificaciones', icon: 'award', route: '/calificaciones' },
  { label: 'Tareas', icon: 'check-square', route: '/(tabs)' },
  { label: 'Archivo', icon: 'archive', route: '/done' },
  { label: 'Horario', icon: 'clock', route: '/horario' },
];

const toolItems: { label: string; icon: keyof typeof Feather.glyphMap; route?: DrawerRoute }[] = [
  { label: 'Estadísticas', icon: 'bar-chart-2' },
  { label: 'Etiquetas', icon: 'tag' },
  { label: 'Sincronización', icon: 'refresh-cw' },
  { label: 'Ayuda', icon: 'help-circle' },
];

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(value?: string) {
  if (!value) return '';
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function formatDate(value?: string) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

const PROGRESS_RING_RADIUS = 24;
const PROGRESS_RING_LENGTH = 2 * Math.PI * PROGRESS_RING_RADIUS;

export default function TasksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { width } = Dimensions.get('window');
  const {
    tasks,
    isLoading,
    isSyncing,
    lastSyncAt,
    syncUniversityTasks,
    syncError,
    clearUniversityTasks,
  } = useTasks();
  const {
    sessionToken,
    sesskey,
    isAuthenticated,
    userFullname,
    logout,
    reloginSilently,
  } = useAuth();
  const { clearCampusData } = useAcademic();
  const { logoutSii } = useGrades();
  const { scheduleBulkReminders, notifyCampusChanges } = useNotifications();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [aiDialogVisible, setAiDialogVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [logoutStep, setLogoutStep] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const drawerX = useRef(new Animated.Value(-Math.min(312, width * 0.84))).current;
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const bottomSpace = Platform.OS === 'web' ? 118 : 104;

  const pendingTasks = useMemo(
    () =>
      tasks
        .filter(task => !task.completed && !isOverdue(task))
        .sort((a, b) => {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(`${a.dueDate}T12:00:00`).getTime() - new Date(`${b.dueDate}T12:00:00`).getTime();
        }),
    [tasks],
  );

  const todayTasks = useMemo(() => {
    const today = dateKey(new Date());
    return pendingTasks.filter(task => task.dueDate === today).slice(0, 4);
  }, [pendingTasks]);

  const nextEvent = useMemo(
    () => pendingTasks.find(task => task.dueDate) ?? null,
    [pendingTasks],
  );

  const overdueCount = tasks.filter(task => isOverdue(task)).length;
  const completedCount = tasks.filter(task => task.completed).length;
  const todayKey = dateKey(new Date());
  const dueTodayCount = pendingTasks.filter(task => task.dueDate === todayKey).length;
  const todayTaskTotal = tasks.filter(task => task.dueDate === todayKey).length;
  const completedTodayCount = tasks.filter(task => task.dueDate === todayKey && task.completed).length;
  const todayProgress = todayTaskTotal
    ? Math.round((completedTodayCount / todayTaskTotal) * 100)
    : 0;
  const futureTaskCount = pendingTasks.filter(task => task.dueDate && task.dueDate > todayKey).length;
  const firstName = userFullname?.trim().split(/\s+/)[0] ?? 'estudiante';

  const doSync = useCallback(async () => {
    if (!isAuthenticated || !sessionToken || !sesskey || isSyncing) return;
    await syncUniversityTasks(sessionToken, sesskey, reloginSilently);
  }, [isAuthenticated, sessionToken, sesskey, isSyncing, syncUniversityTasks, reloginSilently]);

  useEffect(() => {
    scheduleBulkReminders(
      tasks.filter(task => !task.completed && task.dueDate && !isOverdue(task)),
    );
    notifyCampusChanges(tasks);
  }, [tasks, scheduleBulkReminders, notifyCampusChanges]);

  useEffect(() => {
    if (!isAuthenticated) return;
    doSync();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') doSync();
    });
    const interval = setInterval(doSync, 20 * 60 * 1000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [isAuthenticated, sessionToken, sesskey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    Animated.timing(drawerX, {
      toValue: drawerOpen ? 0 : -Math.min(312, width * 0.84),
      duration: 240,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [drawerOpen, drawerX, width]);

  const closeDrawer = () => setDrawerOpen(false);
  const navigateFromDrawer = (route?: DrawerRoute) => {
    closeDrawer();
    if (route) router.push(route as any);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    if (!logoutStep) {
      setLogoutStep(true);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
      logoutTimer.current = setTimeout(() => setLogoutStep(false), 3000);
      return;
    }
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    setLogoutStep(false);
    setIsLoggingOut(true);
    await Promise.allSettled([
      clearUniversityTasks(),
      clearCampusData(),
      logoutSii(),
    ]);
    logout();
  };

  const syncLabel = syncError
    ? 'Revisar conexión'
    : isSyncing
      ? 'Sincronizando...'
      : lastSyncAt
        ? 'Sincronizado'
        : 'Listo para sincronizar';

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: topInset, paddingBottom: bottomSpace }}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.brandGroup}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                setDrawerOpen(true);
              }}
              style={({ pressed }) => [
                styles.headerIcon,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
              accessibilityLabel="Abrir menú"
            >
              <Feather name="menu" size={20} color={colors.foreground} />
            </Pressable>
              <BrandLockup size={32} />
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => Haptics.selectionAsync()}
                style={({ pressed }) => [
                  styles.headerIcon,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
                accessibilityLabel="Notificaciones"
              >
                <Feather name="bell" size={18} color={colors.foreground} />
                {overdueCount > 0 && <View style={[styles.notificationDot, { backgroundColor: colors.destructive }]} />}
              </Pressable>
              <View style={[styles.avatar, { backgroundColor: colors.secondary, borderColor: colors.primary + '35' }]}>
                <Text style={[styles.avatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>

          {/* Editorial greeting and daily focus */}
          <View style={styles.intro}>
            <View style={styles.dateEyebrow}>
              <View style={[styles.eyebrowDot, { backgroundColor: colors.success, shadowColor: colors.success }]} />
              <Text style={[styles.dateEyebrowText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                {formatTodayLabel()}
              </Text>
            </View>
            <Text style={[styles.heroTitle, { color: colors.foreground, fontFamily: displayFontFamily }]}>
              Vamos a tener{'\n'}un gran <Text style={{ color: colors.primary }}>día.</Text>
            </Text>
            <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {getGreeting()}, {firstName}. Tienes espacio para lo importante.
            </Text>
          </View>

          <View style={[styles.focusCard, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
            <View style={styles.focusTop}>
              <View style={styles.focusCopy}>
                <View style={styles.focusKicker}>
                  <Feather name="star" size={13} color={colors.primaryForeground} />
                  <Text style={[styles.focusKickerText, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
                    TU FOCO DE HOY
                  </Text>
                </View>
                <Text style={[styles.focusTitle, { color: colors.primaryForeground, fontFamily: displayFontFamily }]}>
                  Un paso a la vez.
                </Text>
                <Text style={[styles.focusSubtitle, { color: colors.primaryForeground + 'D9', fontFamily: 'Inter_400Regular' }]}>
                  {dueTodayCount
                    ? `${dueTodayCount} ${dueTodayCount === 1 ? 'tarea pendiente' : 'tareas pendientes'} para hoy${overdueCount ? ` · ${overdueCount} vencidas` : ''}`
                    : overdueCount
                      ? `${overdueCount} ${overdueCount === 1 ? 'tarea vencida' : 'tareas vencidas'} para revisar`
                      : 'Tu agenda de hoy está despejada.'}
                </Text>
              </View>
              <View style={styles.progressRing}>
                <Svg width={60} height={60} viewBox="0 0 60 60">
                  <Circle
                    cx={30}
                    cy={30}
                    r={PROGRESS_RING_RADIUS}
                    fill="none"
                    stroke={colors.primaryForeground + '45'}
                    strokeWidth={4}
                  />
                  <Circle
                    cx={30}
                    cy={30}
                    r={PROGRESS_RING_RADIUS}
                    fill="none"
                    stroke={colors.primaryForeground}
                    strokeWidth={4}
                    strokeLinecap="round"
                    strokeDasharray={`${PROGRESS_RING_LENGTH} ${PROGRESS_RING_LENGTH}`}
                    strokeDashoffset={PROGRESS_RING_LENGTH * (1 - todayProgress / 100)}
                    transform="rotate(-90 30 30)"
                  />
                </Svg>
                <Text style={[styles.progressValue, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
                  {todayProgress}%
                </Text>
              </View>
            </View>
            <View style={styles.focusFooter}>
              <Text style={[styles.focusFooterLabel, { color: colors.primaryForeground + 'CC', fontFamily: 'Inter_500Medium' }]}>
                PROGRESO DE HOY
              </Text>
              <Text style={[styles.focusFooterValue, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
                {completedTodayCount} / {todayTaskTotal} completas
              </Text>
            </View>
            <View style={[styles.focusProgressTrack, { backgroundColor: colors.primaryForeground + '35' }]}>
              <View style={[styles.focusProgressFill, { backgroundColor: colors.primaryForeground, width: `${todayProgress}%` }]} />
            </View>
          </View>

          {/* Compact task summary */}
          <View style={styles.metricsRow}>
            <MetricCard value={String(dueTodayCount)} label="para hoy" colors={colors} />
            <MetricCard value={String(futureTaskCount)} label="próximas" colors={colors} />
            <MetricCard value={String(completedCount)} label="completadas" colors={colors} />
          </View>

          {/* Smart input */}
          <Pressable
            onPress={() => setAiDialogVisible(true)}
            style={({ pressed }) => [
              styles.smartInput,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 },
            ]}
          >
            <Feather name="star" size={17} color={colors.primary} />
            <Text style={[styles.smartPlaceholder, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Escribe o dicta lo que quieres hacer...
            </Text>
            <Feather name="mic" size={17} color={colors.primary} />
            <View style={[styles.sendButton, { backgroundColor: colors.primary }]}>
              <Feather name="arrow-up" size={16} color="#FFF" />
            </View>
          </Pressable>
          <Text style={[styles.examples, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Ejemplos: Examen el viernes  ·  Tarea de inglés mañana
          </Text>

          {/* Today */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Hoy</Text>
            <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Ver todas</Text>
            </Pressable>
          </View>
          {isLoading ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : todayTasks.length > 0 ? (
            <View style={styles.taskStack}>
              {todayTasks.map(task => (
                <TaskItem key={task.id} task={task} onPress={() => setSelectedTask(task)} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Tu día está despejado</Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Agrega una tarea o sincroniza el campus.</Text>
              </View>
            </View>
          )}

          {/* Next event */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Próximo evento</Text>
            <Pressable onPress={() => router.push('/calendar')} hitSlop={8}>
              <Text style={[styles.seeAll, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Ver calendario</Text>
            </Pressable>
          </View>
          {nextEvent ? (
            <Pressable
              onPress={() => setSelectedTask(nextEvent)}
              style={({ pressed }) => [
                styles.eventCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <View style={[styles.eventTimeline, { backgroundColor: colors.primary }]} />
              <View style={[styles.eventIcon, { backgroundColor: colors.secondary }]}>
                <Feather name="book-open" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.eventTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{nextEvent.title}</Text>
                <Text style={[styles.eventMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{nextEvent.courseName || 'Campus Virtual'}</Text>
                <Text style={[styles.eventTime, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} /> {formatDate(nextEvent.dueDate)}{nextEvent.dueTime ? ` · ${formatTime(nextEvent.dueTime)}` : ''}
                </Text>
              </View>
              <View style={[styles.nextPill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.nextPillText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Próximo</Text>
              </View>
            </Pressable>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="calendar" size={22} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No tienes próximos eventos con fecha.</Text>
            </View>
          )}

          <View style={styles.syncFooter}>
            <View style={[styles.syncDot, { backgroundColor: syncError ? colors.destructive : isSyncing ? colors.primary : '#309A7D' }]} />
            <Text style={[styles.syncText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{syncLabel}</Text>
            <Pressable onPress={doSync} disabled={isSyncing} hitSlop={8}>
              <Feather name="refresh-cw" size={14} color={colors.primary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Drawer */}
      {drawerOpen && (
        <Pressable style={styles.scrim} onPress={closeDrawer}>
          <Animated.View
            style={[
              styles.drawer,
              { backgroundColor: colors.card, borderRightColor: colors.border, transform: [{ translateX: drawerX }] },
            ]}
          >
            <Pressable onPress={event => event.stopPropagation()} style={styles.drawerInner}>
              <View style={[styles.drawerBrand, { borderBottomColor: colors.border }]}>
                <BrandLockup size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.drawerBrandSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tu espacio de organización</Text>
                </View>
                <Pressable onPress={closeDrawer} hitSlop={10}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </Pressable>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerScroll}>
                <Text style={[styles.drawerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>NAVEGACIÓN</Text>
                {drawerItems.map(item => (
                  <DrawerItem key={item.label} item={item} active={item.label === 'Inicio'} colors={colors} onPress={() => navigateFromDrawer(item.route)} />
                ))}
                <View style={[styles.drawerDivider, { backgroundColor: colors.border }]} />
                <Text style={[styles.drawerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>HERRAMIENTAS</Text>
                {toolItems.map(item => (
                  <DrawerItem
                    key={item.label}
                    item={item}
                    colors={colors}
                    onPress={() => item.label === 'Sincronización' ? (closeDrawer(), doSync()) : undefined}
                  />
                ))}
                <View style={[styles.campusCard, { backgroundColor: colors.secondary, borderColor: colors.primary + '25' }]}>
                  <Feather name="layers" size={18} color={colors.primary} />
                  <Text style={[styles.campusTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Campus Virtual</Text>
                  <Text style={[styles.campusText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Sincroniza tus tareas institucionales.</Text>
                  <Pressable onPress={() => { closeDrawer(); doSync(); }} style={[styles.campusButton, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.campusButtonText, { fontFamily: 'Inter_600SemiBold' }]}>Sincronizar ahora</Text>
                  </Pressable>
                </View>
              </ScrollView>
              <View style={[styles.drawerAccount, { borderTopColor: colors.border }]}>
                <View style={[styles.accountAvatar, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.avatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{firstName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accountName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{userFullname || 'Mi cuenta'}</Text>
                  <Text style={[styles.accountSync, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Cuenta conectada</Text>
                </View>
                <Pressable
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={isLoggingOut ? 'Cerrando sesión' : logoutStep ? 'Confirmar cierre de sesión' : 'Cerrar sesión'}
                  style={({ pressed }) => [
                    styles.logoutButton,
                    {
                      backgroundColor: logoutStep ? colors.destructive + '14' : colors.secondary,
                      opacity: pressed ? 0.78 : 1,
                    },
                  ]}
                >
                  <Feather name={isLoggingOut ? 'loader' : logoutStep ? 'check' : 'log-out'} size={17} color={logoutStep || isLoggingOut ? colors.destructive : colors.mutedForeground} />
                  <Text style={[styles.logoutButtonText, { color: logoutStep || isLoggingOut ? colors.destructive : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    {isLoggingOut ? 'Cerrando…' : logoutStep ? 'Confirmar' : 'Cerrar sesión'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      )}

      <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
      <AITaskDialog visible={aiDialogVisible} onClose={() => setAiDialogVisible(false)} />
      <Pressable
        onPress={() => router.push('/add')}
        style={({ pressed }) => [styles.fab, { backgroundColor: colors.primary, bottom: bottomSpace - 14, opacity: pressed ? 0.84 : 1 }]}
        accessibilityLabel="Agregar tarea"
      >
        <Feather name="plus" size={25} color="#FFF" />
      </Pressable>
    </View>
  );
}

function MetricCard({
  value,
  label,
  colors,
}: {
  value: string;
  label: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.metricValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
    </View>
  );
}

function DrawerItem({
  item,
  active,
  colors,
  onPress,
}: {
  item: { label: string; icon: keyof typeof Feather.glyphMap };
  active?: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.drawerItem,
        { backgroundColor: active ? colors.secondary : 'transparent', opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={item.icon} size={18} color={active ? colors.primary : colors.mutedForeground} />
      <Text style={[styles.drawerItemText, { color: active ? colors.primary : colors.foreground, fontFamily: active ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>{item.label}</Text>
      {active && <View style={[styles.activeMark, { backgroundColor: colors.primary }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, marginBottom: 20 },
  brandGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIcon: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notificationDot: { position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: '#FFF' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16 },
  intro: { marginBottom: 18 },
  dateEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  eyebrowDot: { width: 6, height: 6, borderRadius: 3, shadowOpacity: 0.45, shadowRadius: 4, elevation: 1 },
  dateEyebrowText: { fontSize: 11, textTransform: 'capitalize' },
  greeting: { fontSize: 12, lineHeight: 18, marginTop: 7 },
  heroTitle: { fontSize: 32, lineHeight: 36, letterSpacing: -0.9 },
  focusCard: { borderRadius: 20, padding: 18, marginBottom: 13, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16, elevation: 4 },
  focusTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  focusCopy: { flex: 1 },
  focusKicker: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  focusKickerText: { fontSize: 10, letterSpacing: 1 },
  focusTitle: { fontSize: 22, lineHeight: 27, marginTop: 11, marginBottom: 4 },
  focusSubtitle: { fontSize: 11, lineHeight: 16 },
  progressRing: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },
  progressValue: { position: 'absolute', fontSize: 12 },
  focusFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 15, marginBottom: 8 },
  focusFooterLabel: { fontSize: 9, letterSpacing: 0.8 },
  focusFooterValue: { fontSize: 10 },
  focusProgressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  focusProgressFill: { height: '100%', borderRadius: 2 },
  metricsRow: { flexDirection: 'row', gap: 8, marginTop: 13, marginBottom: 21 },
  metricCard: { flex: 1, minHeight: 70, borderRadius: 15, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 11 },
  metricValue: { fontSize: 21, lineHeight: 25 },
  metricLabel: { fontSize: 10, marginTop: 3 },
  smartInput: { minHeight: 58, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13, shadowColor: '#31265C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  smartPlaceholder: { flex: 1, fontSize: 12 },
  sendButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  examples: { fontSize: 10, marginTop: 8, marginBottom: 24, paddingHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 2 },
  sectionTitle: { fontSize: 17, letterSpacing: -0.2 },
  seeAll: { fontSize: 11 },
  taskStack: { gap: 8, marginBottom: 22 },
  emptyCard: { minHeight: 72, borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 22 },
  emptyTitle: { fontSize: 14, marginBottom: 3 },
  emptyText: { fontSize: 12, lineHeight: 18, flex: 1 },
  eventCard: { minHeight: 106, borderRadius: 17, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden', marginBottom: 18, shadowColor: '#31265C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  eventTimeline: { width: 3, alignSelf: 'stretch', borderRadius: 3 },
  eventIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 13, lineHeight: 18 },
  eventMeta: { fontSize: 11 },
  eventTime: { fontSize: 10 },
  nextPill: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10 },
  nextPillText: { fontSize: 10 },
  syncFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingTop: 2 },
  syncDot: { width: 7, height: 7, borderRadius: 4 },
  syncText: { fontSize: 11 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#5130B8', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: '#15102780', zIndex: 20 },
  drawer: { width: 312, maxWidth: '84%', height: '100%', borderRightWidth: 1, shadowColor: '#241A4A', shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 16 },
  drawerInner: { flex: 1, paddingTop: Platform.OS === 'web' ? 67 : 0 },
  drawerBrand: { minHeight: 94, paddingHorizontal: 18, paddingBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1 },
  drawerBrandSub: { fontSize: 10, marginTop: 2 },
  drawerScroll: { padding: 16, gap: 4 },
  drawerLabel: { fontSize: 10, letterSpacing: 1, marginTop: 10, marginBottom: 7, paddingHorizontal: 10 },
  drawerItem: { height: 45, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 13 },
  drawerItemText: { fontSize: 14, flex: 1 },
  activeMark: { width: 3, height: 20, borderRadius: 2 },
  drawerDivider: { height: 1, marginVertical: 12 },
  campusCard: { borderRadius: 15, borderWidth: 1, padding: 14, gap: 6, marginTop: 18 },
  campusTitle: { fontSize: 13 },
  campusText: { fontSize: 11, lineHeight: 16 },
  campusButton: { borderRadius: 9, paddingVertical: 9, alignItems: 'center', marginTop: 4 },
  campusButtonText: { color: '#FFF', fontSize: 11 },
  drawerAccount: { minHeight: 72, borderTopWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  accountAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  accountName: { fontSize: 12 },
  accountSync: { fontSize: 10, marginTop: 2 },
  logoutButton: { minHeight: 38, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  logoutButtonText: { fontSize: 10 },
});