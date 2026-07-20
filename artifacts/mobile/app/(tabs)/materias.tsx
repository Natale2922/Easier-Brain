import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTasks, type Task } from '@/context/TasksContext';
import { TaskItem } from '@/components/TaskItem';

function SubjectCard({
  courseName,
  tasks,
  pasteIndex,
}: {
  courseName: string;
  tasks: Task[];
  pasteIndex: number;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);

  const pending = tasks.filter(t => !t.completed).length;
  const done = tasks.filter(t => t.completed).length;

  const bg = colors.pastel[pasteIndex % colors.pastel.length];
  const fg = colors.pastelText[pasteIndex % colors.pastelText.length];

  return (
    <View style={[styles.subjectCard, { backgroundColor: colors.card, borderRadius: 18 }]}>
      <Pressable
        style={styles.subjectHeader}
        onPress={() => {
          Haptics.selectionAsync();
          setExpanded(e => !e);
        }}
      >
        {/* Color badge */}
        <View style={[styles.subjectBadge, { backgroundColor: bg, borderRadius: 12 }]}>
          <Feather name="book-open" size={16} color={fg} />
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[styles.subjectName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}
            numberOfLines={2}
          >
            {courseName}
          </Text>
          <View style={styles.subjectMeta}>
            {pending > 0 && (
              <View style={[styles.countChip, { backgroundColor: colors.primary + '18' }]}>
                <View style={[styles.countDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.countText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                  {pending} pendiente{pending !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
            {done > 0 && (
              <View style={[styles.countChip, { backgroundColor: '#22C55E18' }]}>
                <View style={[styles.countDot, { backgroundColor: '#22C55E' }]} />
                <Text style={[styles.countText, { color: '#22C55E', fontFamily: 'Inter_500Medium' }]}>
                  {done} lista{done !== 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>
        </View>

        <Feather
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.mutedForeground}
        />
      </Pressable>

      {expanded && (
        <View style={styles.taskList}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          {tasks
            .sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1;
              if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              if (a.dueDate) return -1;
              if (b.dueDate) return 1;
              return 0;
            })
            .map(t => (
              <TaskItem key={t.id} task={t} />
            ))}
        </View>
      )}
    </View>
  );
}

export default function MateriasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  // Group tasks by courseName
  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();

    for (const task of tasks) {
      const key = task.courseName?.trim() || 'Sin materia';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }

    // Sort: subjects with pending tasks first, then by name
    return Array.from(map.entries()).sort(([aName, aTasks], [bName, bTasks]) => {
      const aPending = aTasks.filter(t => !t.completed).length;
      const bPending = bTasks.filter(t => !t.completed).length;
      if (aPending !== bPending) return bPending - aPending;
      return aName.localeCompare(bName, 'es');
    });
  }, [tasks]);

  const totalPending = tasks.filter(t => !t.completed).length;
  const totalDone = tasks.filter(t => t.completed).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 20 }]}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
          Por Materia
        </Text>
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.statChipText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
              {totalPending} pendientes
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: '#22C55E18' }]}>
            <Text style={[styles.statChipText, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>
              {totalDone} completadas
            </Text>
          </View>
        </View>
      </View>

      {grouped.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="book" size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Sin materias aún
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Sincroniza con el campus o crea{'\n'}tareas con materia asignada.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === 'web' ? 120 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {grouped.map(([name, subjectTasks], idx) => (
            <SubjectCard
              key={name}
              courseName={name}
              tasks={subjectTasks}
              pasteIndex={idx}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  title: { fontSize: 28, letterSpacing: -0.5 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statChipText: { fontSize: 13 },
  list: {
    paddingHorizontal: 20,
    gap: 12,
  },
  subjectCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  subjectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  subjectBadge: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectName: { fontSize: 15, lineHeight: 20 },
  subjectMeta: { flexDirection: 'row', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  countChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  countDot: { width: 5, height: 5, borderRadius: 3 },
  countText: { fontSize: 11 },
  divider: { height: 1, marginHorizontal: 16 },
  taskList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 18, marginTop: 4 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
