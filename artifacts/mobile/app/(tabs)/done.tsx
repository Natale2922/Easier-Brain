import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTasks } from '@/context/TasksContext';
import { TaskItem } from '@/components/TaskItem';

export default function DoneScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { tasks } = useTasks();

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

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 20, backgroundColor: colors.background },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            { color: colors.foreground, fontFamily: 'Inter_700Bold' },
          ]}
        >
          Completadas
        </Text>
        <Text
          style={[
            styles.headerSub,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          {completedTasks.length}{' '}
          {completedTasks.length === 1 ? 'tarea completada' : 'tareas completadas'}
        </Text>
      </View>

      <FlatList
        data={completedTasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <TaskItem task={item} />}
        contentContainerStyle={[
          styles.listContent,
          completedTasks.length === 0 && styles.emptyContent,
          { paddingBottom: Platform.OS === 'web' ? 120 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="award" size={52} color={colors.border} />
            <Text
              style={[
                styles.emptyTitle,
                { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
              ]}
            >
              Sin completadas aún
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
              ]}
            >
              Las tareas que marques como listas{'\n'}aparecerán aquí.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 28, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, marginTop: 4 },
  listContent: { paddingHorizontal: 20, gap: 10 },
  emptyContent: { flex: 1 },
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
