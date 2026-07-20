import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useTasks, type Priority } from '@/context/TasksContext';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Baja', color: '#22C55E' },
  { value: 'medium', label: 'Media', color: '#F59E0B' },
  { value: 'high', label: 'Alta', color: '#EF4444' },
];

export default function AddTaskScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTask } = useTasks();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un título para la tarea.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask(title.trim(), note.trim() || undefined, priority);
    router.back();
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        bottomOffset={16}
      >
        {/* Title field */}
        <Text
          style={[
            styles.sectionLabel,
            { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' },
          ]}
        >
          ¿QUÉ NECESITAS HACER?
        </Text>
        <TextInput
          style={[
            styles.titleInput,
            {
              color: colors.foreground,
              borderBottomColor: colors.border,
              fontFamily: 'Inter_500Medium',
            },
          ]}
          placeholder="Título de la tarea..."
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          maxLength={120}
        />

        {/* Note field */}
        <Text
          style={[
            styles.sectionLabel,
            {
              color: colors.mutedForeground,
              fontFamily: 'Inter_500Medium',
              marginTop: 28,
            },
          ]}
        >
          NOTA (OPCIONAL)
        </Text>
        <TextInput
          style={[
            styles.noteInput,
            {
              color: colors.foreground,
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius,
              fontFamily: 'Inter_400Regular',
            },
          ]}
          placeholder="Agrega un detalle..."
          placeholderTextColor={colors.mutedForeground}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={300}
        />

        {/* Priority selector */}
        <Text
          style={[
            styles.sectionLabel,
            {
              color: colors.mutedForeground,
              fontFamily: 'Inter_500Medium',
              marginTop: 28,
            },
          ]}
        >
          PRIORIDAD
        </Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map(p => (
            <Pressable
              key={p.value}
              style={[
                styles.priorityBtn,
                {
                  backgroundColor:
                    priority === p.value ? p.color + '1A' : colors.card,
                  borderColor: priority === p.value ? p.color : colors.border,
                  borderRadius: colors.radius,
                },
              ]}
              onPress={() => {
                setPriority(p.value);
                Haptics.selectionAsync();
              }}
            >
              <View
                style={[
                  styles.priorityDot,
                  { backgroundColor: p.color },
                ]}
              />
              <Text
                style={[
                  styles.priorityLabel,
                  {
                    color:
                      priority === p.value ? p.color : colors.mutedForeground,
                    fontFamily: 'Inter_600SemiBold',
                  },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: title.trim()
                ? pressed
                  ? colors.primary + 'DD'
                  : colors.primary
                : colors.muted,
              borderRadius: colors.radius,
              marginTop: 36,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={handleSave}
        >
          <Text
            style={[
              styles.saveBtnText,
              {
                color: title.trim()
                  ? colors.primaryForeground
                  : colors.mutedForeground,
                fontFamily: 'Inter_600SemiBold',
              },
            ]}
          >
            Guardar tarea
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    padding: 20,
    paddingTop: 24,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.9,
    marginBottom: 10,
  },
  titleInput: {
    fontSize: 20,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    lineHeight: 26,
  },
  noteInput: {
    fontSize: 15,
    lineHeight: 22,
    padding: 14,
    borderWidth: 1,
    minHeight: 90,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    gap: 7,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityLabel: {
    fontSize: 13,
  },
  saveBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 16,
  },
});
