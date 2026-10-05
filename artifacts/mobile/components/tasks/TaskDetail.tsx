import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { isOverdue, type Task, type Priority, useTasks } from '@/context/TasksContext';
import { parseDueDate } from '@/utils/date';
import { displayFontFamily } from '@/theme/typography';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#C26373',
  medium: '#BB7B38',
  low: '#4E8A72',
};
const PRIORITY_LABELS: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};
const DELIVERY_CONFIG = {
  campus: { label: 'Campus Virtual', icon: 'monitor' as const, color: '#7C6FCD' },
  email: { label: 'Correo', icon: 'mail' as const, color: '#3B82F6' },
  class: { label: 'En clase', icon: 'users' as const, color: '#10B981' },
};

function formatFullDate(iso: string, time?: string): string {
  const d = parseDueDate(iso) ?? new Date(iso);
  const dateStr = d.toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return time ? `${dateStr} a las ${time}` : dateStr;
}

function getDaysLeft(iso: string): { text: string; color: string } {
  const d = parseDueDate(iso);
  const diff = d ? Math.ceil((d.getTime() - Date.now()) / 86400000) : 0;
  if (diff < 0) return { text: `Vencida hace ${Math.abs(diff)} días`, color: '#C26373' };
  if (diff === 0) return { text: 'Vence hoy', color: '#C26373' };
  if (diff === 1) return { text: 'Vence mañana', color: '#BB7B38' };
  if (diff <= 7) return { text: `Faltan ${diff} días`, color: '#BB7B38' };
  return { text: `Faltan ${diff} días`, color: '#4E8A72' };
}

interface Props {
  task: Task | null;
  onClose: () => void;
}

export function TaskDetail({ task, onClose }: Props) {
  const colors = useColors();
  const { toggleTask, deleteTask } = useTasks();
  const checkScale = useRef(new Animated.Value(1)).current;

  if (!task) return null;

  const priorityColor = PRIORITY_COLORS[task.priority];
  const deliveryCfg = task.deliveryMethod ? DELIVERY_CONFIG[task.deliveryMethod] : null;
  const daysLeft = task.dueDate ? getDaysLeft(task.dueDate) : null;

  const handleToggle = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Animated.sequence([
      Animated.spring(checkScale, { toValue: 1.3, useNativeDriver: Platform.OS !== 'web', tension: 200, friction: 5 }),
      Animated.spring(checkScale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', tension: 150, friction: 6 }),
    ]).start();
    toggleTask(task.id);
    onClose();
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    deleteTask(task.id);
    onClose();
  };

  const openCampusUrl = () => {
    if (task.campusUrl) Linking.openURL(task.campusUrl).catch(() => {});
  };

  return (
    <Modal
      visible={!!task}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Close */}
        <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </Pressable>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === 'web' ? 40 : 60 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status + Source */}
          <View style={styles.topRow}>
            {task.completed ? (
              <View style={[styles.statusChip, { backgroundColor: '#22C55E18' }]}>
                <Feather name="check-circle" size={13} color="#22C55E" />
                <Text style={[styles.statusText, { color: '#22C55E', fontFamily: 'Inter_600SemiBold' }]}>Completada</Text>
              </View>
            ) : isOverdue(task) ? (
              <View style={[styles.statusChip, { backgroundColor: colors.destructive + '18' }]}>
                <Feather name="alert-circle" size={13} color={colors.destructive} />
                <Text style={[styles.statusText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>Vencida</Text>
              </View>
            ) : (
              <View style={[styles.statusChip, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="clock" size={13} color={colors.primary} />
                <Text style={[styles.statusText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Pendiente</Text>
              </View>
            )}
            {task.source === 'university' && (
              <View style={[styles.statusChip, { backgroundColor: '#10B98118' }]}>
                <Feather name="globe" size={13} color="#10B981" />
                <Text style={[styles.statusText, { color: '#10B981', fontFamily: 'Inter_600SemiBold' }]}>Campus Virtual</Text>
              </View>
            )}
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.foreground, fontFamily: displayFontFamily }]}>
            {task.title}
          </Text>

          {/* Info cards */}
          <View style={styles.cards}>
            {/* Course */}
            {task.courseName ? (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderRadius: 14 }]}>
                <View style={[styles.infoIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Feather name="book-open" size={16} color={colors.primary} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Materia</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{task.courseName}</Text>
                </View>
              </View>
            ) : null}

            {/* Due date */}
            {task.dueDate ? (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderRadius: 14 }]}>
                <View style={[styles.infoIcon, { backgroundColor: (daysLeft?.color ?? '#22C55E') + '18' }]}>
                  <Feather name="calendar" size={16} color={daysLeft?.color ?? '#22C55E'} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Fecha de entrega</Text>
                  <Text style={[styles.infoValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                    {formatFullDate(task.dueDate, task.dueTime)}
                  </Text>
                  <Text style={[styles.daysLeft, { color: daysLeft?.color ?? '#22C55E', fontFamily: 'Inter_500Medium' }]}>
                    {daysLeft?.text}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Priority */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderRadius: 14 }]}>
              <View style={[styles.infoIcon, { backgroundColor: priorityColor + '18' }]}>
                <Feather name="alert-circle" size={16} color={priorityColor} />
              </View>
              <View style={styles.infoText}>
                <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Prioridad</Text>
                <Text style={[styles.infoValue, { color: priorityColor, fontFamily: 'Inter_600SemiBold' }]}>
                  {PRIORITY_LABELS[task.priority]}
                </Text>
              </View>
            </View>

            {/* Delivery */}
            {deliveryCfg ? (
              <View style={[styles.infoCard, { backgroundColor: colors.card, borderRadius: 14 }]}>
                <View style={[styles.infoIcon, { backgroundColor: deliveryCfg.color + '18' }]}>
                  <Feather name={deliveryCfg.icon} size={16} color={deliveryCfg.color} />
                </View>
                <View style={styles.infoText}>
                  <Text style={[styles.infoLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Forma de entrega</Text>
                  <Text style={[styles.infoValue, { color: deliveryCfg.color, fontFamily: 'Inter_600SemiBold' }]}>
                    {deliveryCfg.label}
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Notes / comment */}
          {task.note ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                COMENTARIO
              </Text>
              <View style={[styles.textBlock, { backgroundColor: colors.card, borderRadius: 14 }]}>
                <Text style={[styles.bodyText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                  {task.note}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Instructions from Moodle */}
          {task.instructions ? (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                INSTRUCCIONES DEL CAMPUS
              </Text>
              <View style={[styles.textBlock, { backgroundColor: colors.accent, borderRadius: 14, borderLeftWidth: 3, borderLeftColor: colors.primary }]}>
                <Text style={[styles.bodyText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
                  {task.instructions}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Campus URL button */}
          {task.campusUrl ? (
            <Pressable
              style={({ pressed }) => [
                styles.campusBtn,
                { backgroundColor: colors.primary + '14', borderRadius: 14, borderColor: colors.primary, opacity: pressed ? 0.8 : 1 },
              ]}
              onPress={openCampusUrl}
            >
              <Feather name="external-link" size={16} color={colors.primary} />
              <Text style={[styles.campusBtnText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>
                Ver en Campus Virtual
              </Text>
            </Pressable>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: task.completed ? colors.card : colors.primary,
                  borderRadius: 14,
                  flex: 2,
                  opacity: pressed ? 0.85 : 1,
                  borderColor: task.completed ? colors.border : colors.primary,
                  borderWidth: 1,
                },
              ]}
              onPress={handleToggle}
            >
              <Animated.View style={[styles.actionBtnInner, { transform: [{ scale: checkScale }] }]}>
                <Feather name={task.completed ? 'rotate-ccw' : 'check'} size={18} color={task.completed ? colors.foreground : '#FFF'} />
                <Text style={[styles.actionBtnText, { color: task.completed ? colors.foreground : '#FFF', fontFamily: 'Inter_600SemiBold' }]}>
                  {task.completed ? 'Marcar pendiente' : 'Marcar lista'}
                </Text>
              </Animated.View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.card, borderRadius: 14, flex: 1, opacity: pressed ? 0.8 : 1, borderColor: colors.destructive, borderWidth: 1 },
              ]}
              onPress={handleDelete}
            >
              <View style={styles.actionBtnInner}>
                <Feather name="trash-2" size={16} color={colors.destructive} />
                <Text style={[styles.actionBtnText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>Eliminar</Text>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingTop: 32, gap: 16 },
  topRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { fontSize: 12 },
  title: { fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
  cards: { gap: 10 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  infoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 11, letterSpacing: 0.5 },
  infoValue: { fontSize: 15 },
  daysLeft: { fontSize: 12, marginTop: 2 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 11, letterSpacing: 0.8 },
  textBlock: { padding: 14 },
  bodyText: { fontSize: 14, lineHeight: 22 },
  campusBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1 },
  campusBtnText: { fontSize: 15 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  actionBtn: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  actionBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtnText: { fontSize: 15 },
});
