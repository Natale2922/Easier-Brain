import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { type Task, type Priority, useTasks } from '@/context/TasksContext';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

function formatDueDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Vencida';
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays < 7) return `En ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function getDueDateColor(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return '#EF4444';
  if (diffDays <= 1) return '#EF4444';
  if (diffDays <= 3) return '#F59E0B';
  return '#22C55E';
}

interface Props {
  task: Task;
}

export function TaskItem({ task }: Props) {
  const colors = useColors();
  const { toggleTask, deleteTask } = useTasks();
  const checkScale = useRef(new Animated.Value(task.completed ? 1 : 0)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;

  const priorityColor = PRIORITY_COLORS[task.priority];
  const isUniversity = task.source === 'university';

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!task.completed) {
      Animated.sequence([
        Animated.spring(checkScale, {
          toValue: 1.3,
          useNativeDriver: true,
          tension: 200,
          friction: 5,
        }),
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 150,
          friction: 6,
        }),
      ]).start();
    } else {
      Animated.timing(checkScale, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }).start();
    }
    toggleTask(task.id);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.timing(rowOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => deleteTask(task.id));
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderRadius: colors.radius,
          borderColor: colors.border,
          opacity: rowOpacity,
        },
      ]}
    >
      {/* Priority stripe */}
      <View style={[styles.priorityStripe, { backgroundColor: priorityColor }]} />

      {/* Checkbox */}
      <Pressable onPress={handleToggle} style={styles.checkArea} hitSlop={8}>
        <View
          style={[
            styles.circle,
            {
              borderColor: task.completed ? priorityColor : colors.border,
              backgroundColor: task.completed ? priorityColor + '20' : 'transparent',
              borderRadius: 11,
            },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={13} color={priorityColor} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            {
              color: task.completed ? colors.mutedForeground : colors.foreground,
              textDecorationLine: task.completed ? 'line-through' : 'none',
              fontFamily: 'Inter_500Medium',
            },
          ]}
          numberOfLines={2}
        >
          {task.title}
        </Text>

        {task.note ? (
          <Text
            style={[styles.note, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}
            numberOfLines={1}
          >
            {task.note}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          {/* Priority badge */}
          <View
            style={[styles.badge, { backgroundColor: priorityColor + '18', borderRadius: 4 }]}
          >
            <View style={[styles.badgeDot, { backgroundColor: priorityColor }]} />
            <Text
              style={[styles.badgeText, { color: priorityColor, fontFamily: 'Inter_600SemiBold' }]}
            >
              {PRIORITY_LABELS[task.priority]}
            </Text>
          </View>

          {/* Course name badge (university tasks) */}
          {isUniversity && task.courseName ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.primary + '14', borderRadius: 4 },
              ]}
            >
              <Feather name="book" size={9} color={colors.primary} />
              <Text
                style={[
                  styles.badgeText,
                  { color: colors.primary, fontFamily: 'Inter_500Medium' },
                ]}
                numberOfLines={1}
              >
                {task.courseName}
              </Text>
            </View>
          ) : null}

          {/* Due date badge */}
          {task.dueDate && !task.completed ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: getDueDateColor(task.dueDate) + '18',
                  borderRadius: 4,
                },
              ]}
            >
              <Feather name="clock" size={9} color={getDueDateColor(task.dueDate)} />
              <Text
                style={[
                  styles.badgeText,
                  { color: getDueDateColor(task.dueDate), fontFamily: 'Inter_500Medium' },
                ]}
              >
                {formatDueDate(task.dueDate)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Delete */}
      <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  priorityStripe: { width: 3, alignSelf: 'stretch' },
  checkArea: { padding: 14, paddingRight: 10 },
  circle: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingVertical: 13,
    paddingRight: 8,
    gap: 4,
  },
  title: { fontSize: 15, lineHeight: 20 },
  note: { fontSize: 13, lineHeight: 17 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  badgeDot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    maxWidth: 120,
  },
  deleteBtn: { padding: 14, paddingLeft: 8 },
});
