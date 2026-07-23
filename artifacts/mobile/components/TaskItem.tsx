import React, { useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { type Task, type Priority, useTasks } from '@/context/TasksContext';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#FF7B7B',
  medium: '#FFB347',
  low: '#5EC97E',
};
const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};
const DELIVERY_CONFIG = {
  campus: { label: 'Campus', icon: 'monitor' as const, color: '#7C6FCD' },
  email: { label: 'Correo', icon: 'mail' as const, color: '#3B82F6' },
  class: { label: 'En clase', icon: 'users' as const, color: '#10B981' },
};

function formatDueDate(isoString: string): string {
  const date = new Date(isoString);
  const diffDays = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return 'Vencida';
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays < 7) return `${diffDays} días`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}
function getDueDateColor(isoString: string): string {
  const diffDays = Math.ceil((new Date(isoString).getTime() - Date.now()) / 86400000);
  if (diffDays <= 0) return '#FF7B7B';
  if (diffDays <= 1) return '#FF7B7B';
  if (diffDays <= 3) return '#FFB347';
  return '#5EC97E';
}

interface Props {
  task: Task;
  onPress?: () => void;
}

export function TaskItem({ task, onPress }: Props) {
  const colors = useColors();
  const { toggleTask, deleteTask } = useTasks();
  const checkScale = useRef(new Animated.Value(task.completed ? 1 : 0)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;

  const priorityColor = PRIORITY_COLORS[task.priority];
  const deliveryCfg = task.deliveryMethod ? DELIVERY_CONFIG[task.deliveryMethod] : null;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!task.completed) {
      Animated.sequence([
        Animated.spring(checkScale, { toValue: 1.4, useNativeDriver: true, tension: 200, friction: 5 }),
        Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 150, friction: 6 }),
      ]).start();
    } else {
      Animated.timing(checkScale, { toValue: 0, duration: 130, useNativeDriver: true }).start();
    }
    toggleTask(task.id);
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Animated.timing(rowOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => deleteTask(task.id));
  };

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.card, borderRadius: 16, borderColor: colors.border, opacity: rowOpacity }]}>
      {/* Priority stripe */}
      <View style={[styles.stripe, { backgroundColor: task.completed ? colors.border : priorityColor }]} />

      {/* Checkbox */}
      <Pressable onPress={handleToggle} style={styles.checkArea} hitSlop={8}>
        <View style={[styles.circle, { borderColor: task.completed ? priorityColor : colors.border, backgroundColor: task.completed ? priorityColor + '22' : 'transparent', borderRadius: 11 }]}>
          <Animated.View style={{ transform: [{ scale: checkScale }] }}>
            <Ionicons name="checkmark" size={13} color={priorityColor} />
          </Animated.View>
        </View>
      </Pressable>

      {/* Content — pressable to open details */}
      <Pressable style={styles.content} onPress={onPress} disabled={!onPress}>
        <Text style={[styles.title, { color: task.completed ? colors.mutedForeground : colors.foreground, textDecorationLine: task.completed ? 'line-through' : 'none', fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
          {task.title}
        </Text>
        {task.note ? (
          <Text style={[styles.note, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>{task.note}</Text>
        ) : null}
        {/* Instructions preview */}
        {task.instructions && !task.note ? (
          <Text style={[styles.note, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            📋 {task.instructions.substring(0, 60)}...
          </Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.badge, { backgroundColor: priorityColor + '18', borderRadius: 6 }]}>
            <View style={[styles.badgeDot, { backgroundColor: priorityColor }]} />
            <Text style={[styles.badgeText, { color: priorityColor, fontFamily: 'Inter_600SemiBold' }]}>{PRIORITY_LABELS[task.priority]}</Text>
          </View>
          {task.courseName ? (
            <View style={[styles.badge, { backgroundColor: colors.primary + '14', borderRadius: 6 }]}>
              <Feather name="book" size={9} color={colors.primary} />
              <Text style={[styles.badgeText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]} numberOfLines={1}>{task.courseName}</Text>
            </View>
          ) : null}
          {task.dueDate && !task.completed ? (
            <View style={[styles.badge, { backgroundColor: getDueDateColor(task.dueDate) + '18', borderRadius: 6 }]}>
              <Feather name="clock" size={9} color={getDueDateColor(task.dueDate)} />
              <Text style={[styles.badgeText, { color: getDueDateColor(task.dueDate), fontFamily: 'Inter_500Medium' }]}>
                {formatDueDate(task.dueDate)}{task.dueTime ? ` ${task.dueTime}` : ''}
              </Text>
            </View>
          ) : null}
          {deliveryCfg && !task.completed ? (
            <View style={[styles.badge, { backgroundColor: deliveryCfg.color + '18', borderRadius: 6 }]}>
              <Feather name={deliveryCfg.icon} size={9} color={deliveryCfg.color} />
              <Text style={[styles.badgeText, { color: deliveryCfg.color, fontFamily: 'Inter_500Medium' }]}>{deliveryCfg.label}</Text>
            </View>
          ) : null}
          {task.source === 'university' ? (
            <View style={[styles.badge, { backgroundColor: '#10B98118', borderRadius: 6 }]}>
              <Feather name="globe" size={9} color="#10B981" />
              <Text style={[styles.badgeText, { color: '#10B981', fontFamily: 'Inter_500Medium' }]}>Campus</Text>
            </View>
          ) : null}
        </View>
        {/* Tap hint */}
        {onPress && !task.completed ? (
          <Text style={[styles.tapHint, { color: colors.mutedForeground + '80', fontFamily: 'Inter_400Regular' }]}>Toca para ver detalles</Text>
        ) : null}
      </Pressable>

      {/* Delete */}
      <Pressable onPress={handleDelete} style={styles.deleteBtn} hitSlop={8}>
        <Feather name="trash-2" size={15} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  stripe: { width: 3, alignSelf: 'stretch' },
  checkArea: { padding: 14, paddingRight: 10 },
  circle: { width: 22, height: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, paddingVertical: 12, paddingRight: 8, gap: 3 },
  title: { fontSize: 15, lineHeight: 20 },
  note: { fontSize: 12, lineHeight: 16 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 3, gap: 4 },
  badgeDot: { width: 5, height: 5, borderRadius: 3 },
  badgeText: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, maxWidth: 130 },
  tapHint: { fontSize: 10, marginTop: 2 },
  deleteBtn: { padding: 14, paddingLeft: 8 },
});
