import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTasks, isOverdue, daysOverdue, type Task } from '@/context/TasksContext';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { AppHeader } from '@/components/common/AppHeader';

export default function ArchiveScreen() {
  const colors = useColors();
  const { tasks } = useTasks();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const completedTasks = useMemo(
    () =>
      tasks
        .filter(t => t.completed)
        .sort(
          (a, b) =>
            new Date(b.completedAt ?? b.createdAt).getTime() -
            new Date(a.completedAt ?? a.createdAt).getTime(),
        ),
    [tasks],
  );

  const overdueTasks = useMemo(
    () =>
      tasks
        .filter(t => isOverdue(t))
        .sort((a, b) => daysOverdue(b) - daysOverdue(a)), // most overdue first
    [tasks],
  );

  const totalArchived = completedTasks.length + overdueTasks.length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Archivo"
        subtitle="Tu historial de tareas y entregas"
      />
      <View style={styles.headerStats}>
        <View style={[styles.statPill, { backgroundColor: colors.success + '18' }]}>
          <Feather name="check-circle" size={11} color={colors.success} />
          <Text
            style={[
              styles.statText,
              { color: colors.success, fontFamily: 'Inter_600SemiBold' },
            ]}
          >
            {completedTasks.length} completadas
          </Text>
        </View>
        {overdueTasks.length > 0 && (
          <View style={[styles.statPill, { backgroundColor: colors.destructive + '18' }]}>
            <Feather name="alert-circle" size={11} color={colors.destructive} />
            <Text
              style={[
                styles.statText,
                { color: colors.destructive, fontFamily: 'Inter_600SemiBold' },
              ]}
            >
              {overdueTasks.length} vencidas
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          totalArchived === 0 && styles.emptyScroll,
          { paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
      >
        {/* ── Overdue-archived section ──────────────────────────────────── */}
        {overdueTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#FF7B7B' }]} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: '#FF7B7B', fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                Vencidas
              </Text>
            </View>
            <Text
              style={[
                styles.sectionSub,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              Las tareas vencidas salen de Pendientes automáticamente. Las que llevan más de 2 días se conservan aquí como archivadas.
            </Text>
            <View style={styles.list}>
              {overdueTasks.map(task => (
                <View key={task.id}>
                  <View style={styles.overdueDaysBadge}>
                    <Text
                      style={[
                        styles.overdueDaysText,
                        { color: '#FF7B7B', fontFamily: 'Inter_600SemiBold' },
                      ]}
                    >
                      {daysOverdue(task)}d vencida
                    </Text>
                  </View>
                  <TaskItem
                    task={task}
                    overdueArchived
                    onPress={() => setSelectedTask(task)}
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Completed section ─────────────────────────────────────────── */}
        {completedTasks.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionDot, { backgroundColor: '#22C55E' }]} />
              <Text
                style={[
                  styles.sectionTitle,
                  { color: '#22C55E', fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                Completadas
              </Text>
            </View>
            <View style={styles.list}>
              {completedTasks.map(task => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onPress={() => setSelectedTask(task)}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {totalArchived === 0 && (
          <View style={styles.emptyState}>
            <Feather name="archive" size={52} color={colors.border} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
              ]}
            >
              Archivo vacío
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              Las tareas completadas y las vencidas{'\n'}por más de 2 días aparecerán aquí.
            </Text>
          </View>
        )}
      </ScrollView>

      <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerStats: { paddingHorizontal: 20, flexDirection: 'row', gap: 8, marginBottom: 6, flexWrap: 'wrap' },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statText: { fontSize: 12 },
  scroll: { paddingHorizontal: 20, gap: 8 },
  emptyScroll: { flex: 1 },
  section: { gap: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionSub: { fontSize: 12, lineHeight: 18, marginTop: -4 },
  list: { gap: 10 },
  overdueDaysBadge: { alignSelf: 'flex-start', marginBottom: 2, marginLeft: 4 },
  overdueDaysText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, marginTop: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
