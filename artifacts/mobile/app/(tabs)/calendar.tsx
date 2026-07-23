import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTasks, type Task } from '@/context/TasksContext';
import { TaskItem } from '@/components/TaskItem';
import { TaskDetail } from '@/components/TaskDetail';

const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isoToDateStr(iso: string) {
  return iso.split('T')[0];
}

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    today.toISOString().split('T')[0],
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Map date string → tasks
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.dueDate) continue;
      const d = isoToDateStr(t.dueDate);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return map;
  }, [tasks]);

  const selectedTasks = useMemo(() => {
    if (!selectedDate) return [];
    return tasksByDate.get(selectedDate) ?? [];
  }, [selectedDate, tasksByDate]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const todayStr = today.toISOString().split('T')[0];

  const renderDay = (day: number | null, idx: number) => {
    if (!day) return <View key={`empty-${idx}`} style={styles.dayCell} />;
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === selectedDate;
    const dayTasks = tasksByDate.get(dateStr) ?? [];
    const pendingCount = dayTasks.filter(t => !t.completed).length;
    const hasOverdue = dayTasks.some(t => !t.completed && new Date(t.dueDate!) < today);

    return (
      <Pressable
        key={dateStr}
        style={({ pressed }) => [
          styles.dayCell,
          {
            backgroundColor: isSelected
              ? colors.primary
              : isToday
              ? colors.primary + '20'
              : 'transparent',
            borderRadius: 12,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
        onPress={() => setSelectedDate(dateStr)}
      >
        <Text
          style={[
            styles.dayNum,
            {
              color: isSelected
                ? '#FFF'
                : isToday
                ? colors.primary
                : colors.foreground,
              fontFamily: isToday ? 'Inter_700Bold' : 'Inter_400Regular',
            },
          ]}
        >
          {day}
        </Text>
        {pendingCount > 0 ? (
          <View style={styles.dotsRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: hasOverdue ? colors.destructive : colors.primary },
              ]}
            />
            {pendingCount > 1 && (
              <View style={[styles.dot, { backgroundColor: colors.primary + '80' }]} />
            )}
          </View>
        ) : null}
      </Pressable>
    );
  };

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Calendario
        </Text>

        {/* Month navigator */}
        <View style={[styles.monthNav, { backgroundColor: colors.card, borderRadius: 16 }]}>
          <Pressable onPress={prevMonth} style={styles.navBtn} hitSlop={10}>
            <Feather name="chevron-left" size={20} color={colors.primary} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {MONTHS_ES[viewMonth]} {viewYear}
          </Text>
          <Pressable onPress={nextMonth} style={styles.navBtn} hitSlop={10}>
            <Feather name="chevron-right" size={20} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Calendar grid */}
        <View style={[styles.calCard, { backgroundColor: colors.card, borderRadius: 20 }]}>
          {/* Day headers */}
          <View style={styles.weekRow}>
            {DAYS_SHORT.map(d => (
              <Text
                key={d}
                style={[styles.weekDay, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}
              >
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.weekRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => renderDay(day, row * 7 + col))}
            </View>
          ))}
        </View>

        {/* Selected day tasks */}
        <View style={styles.daySection}>
          <Text style={[styles.daySectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            {selectedDate === todayStr ? 'Hoy' : selectedDate
              ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday: 'long', day: 'numeric', month: 'long',
                })
              : 'Selecciona un día'}
          </Text>

          {selectedTasks.length === 0 ? (
            <View style={[styles.emptyDay, { backgroundColor: colors.card, borderRadius: 16 }]}>
              <Feather name="check-circle" size={28} color={colors.border} />
              <Text style={[styles.emptyDayText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                Sin tareas este día
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {selectedTasks.map(t => <TaskItem key={t.id} task={t} onPress={() => setSelectedTask(t)} />)}
            </View>
          )}
        </View>

        {/* Upcoming with due dates */}
        <View style={styles.daySection}>
          <Text style={[styles.daySectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Próximas fechas
          </Text>
          {(() => {
            const upcoming = tasks
              .filter(t => t.dueDate && !t.completed)
              .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
              .slice(0, 8);
            if (upcoming.length === 0) {
              return (
                <Text style={[styles.emptyDayText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                  No hay tareas con fecha asignada
                </Text>
              );
            }
            return upcoming.map(t => <TaskItem key={t.id} task={t} onPress={() => setSelectedTask(t)} />);
          })()}
        </View>

        <View style={{ height: Platform.OS === 'web' ? 120 : 100 }} />
      </ScrollView>

      <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 14,
  },
  title: { fontSize: 28, letterSpacing: -0.5 },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  navBtn: { padding: 4 },
  monthLabel: { fontSize: 16 },
  calCard: {
    marginHorizontal: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 4,
  },
  weekDay: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingBottom: 8,
  },
  dayCell: {
    width: 36,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayNum: { fontSize: 14 },
  dotsRow: { flexDirection: 'row', gap: 2 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  daySection: {
    paddingHorizontal: 20,
    marginTop: 24,
    gap: 12,
  },
  daySectionTitle: { fontSize: 18, letterSpacing: -0.3 },
  emptyDay: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyDayText: { fontSize: 14 },
});
