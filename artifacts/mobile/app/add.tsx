import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTasks, type Priority, type DeliveryMethod } from '@/context/TasksContext';
import { KeyboardAwareScrollViewCompat } from '@/components/common/KeyboardAwareScrollViewCompat';

const PRIORITIES: { value: Priority; label: string; color: string; icon: string }[] = [
  { value: 'high', label: 'Alta', color: '#FF7B7B', icon: 'alert-circle' },
  { value: 'medium', label: 'Media', color: '#FFB347', icon: 'minus-circle' },
  { value: 'low', label: 'Baja', color: '#5EC97E', icon: 'arrow-down-circle' },
];

const DELIVERY_OPTIONS: { value: DeliveryMethod; label: string; icon: string; color: string }[] = [
  { value: 'campus', label: 'Campus Virtual', icon: 'monitor', color: '#7C6FCD' },
  { value: 'email', label: 'Correo', icon: 'mail', color: '#3B82F6' },
  { value: 'class', label: 'En clase', icon: 'users', color: '#10B981' },
];

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

export default function AddTaskScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTask, tasks } = useTasks();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [courseName, setCourseName] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | undefined>(undefined);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom + 16;

  // Get unique course names from existing tasks
  const knownSubjects = useMemo(() => {
    const set = new Set<string>();
    for (const t of tasks) {
      if (t.courseName?.trim()) set.add(t.courseName.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'es'));
  }, [tasks]);

  const handleSave = () => {
    if (!title.trim()) {
      Alert.alert('Campo requerido', 'Por favor ingresa un título para la tarea.');
      return;
    }
    // Validate date format DD/MM/YYYY or YYYY-MM-DD
    let parsedDate: string | undefined = undefined;
    if (dueDate.trim()) {
      const ddmm = dueDate.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/);
      const iso = dueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (ddmm) {
        const d = parseInt(ddmm[1]);
        const m = parseInt(ddmm[2]) - 1;
        const rawY = ddmm[3] ? parseInt(ddmm[3]) : new Date().getFullYear();
        const y = rawY < 100 ? 2000 + rawY : rawY;
        const dt = new Date(y, m, d);
        parsedDate = dt.toISOString().split('T')[0];
      } else if (iso) {
        parsedDate = dueDate;
      } else {
        Alert.alert('Fecha inválida', 'Usa el formato DD/MM/AAAA, por ejemplo: 15/08/2026');
        return;
      }
    }

    // Validate time
    let parsedTime: string | undefined = undefined;
    if (dueTime.trim()) {
      const t = dueTime.match(/^(\d{1,2}):(\d{2})$/);
      if (t) {
        parsedTime = `${t[1].padStart(2, '0')}:${t[2]}`;
      } else {
        Alert.alert('Hora inválida', 'Usa el formato HH:MM, por ejemplo: 09:00');
        return;
      }
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask({
      title: title.trim(),
      note: note.trim() || undefined,
      priority,
      dueDate: parsedDate,
      dueTime: parsedTime,
      courseName: courseName.trim() || undefined,
      deliveryMethod,
    });
    router.back();
  };

  const quickDateBtn = (label: string, offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    setDueDate(`${dd}/${mm}/${yy}`);
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
        bottomOffset={16}
      >
        {/* Title */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
          ¿QUÉ NECESITAS HACER?
        </Text>
        <TextInput
          style={[styles.titleInput, { color: colors.foreground, borderBottomColor: colors.primary + '44', fontFamily: 'Inter_500Medium' }]}
          placeholder="Título de la tarea..."
          placeholderTextColor={colors.mutedForeground}
          value={title}
          onChangeText={setTitle}
          autoFocus
          returnKeyType="done"
          maxLength={120}
        />

        {/* Subject dropdown */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
          MATERIA
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.pickerBtn,
            {
              backgroundColor: courseName ? colors.primary + '12' : colors.card,
              borderColor: courseName ? colors.primary : colors.border,
              borderRadius: 14,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => setSubjectPickerVisible(true)}
        >
          <Feather name="book-open" size={16} color={courseName ? colors.primary : colors.mutedForeground} />
          <Text style={[styles.pickerText, { color: courseName ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_400Regular', flex: 1 }]}>
            {courseName || 'Seleccionar materia...'}
          </Text>
          {courseName ? (
            <Pressable onPress={() => setCourseName('')} hitSlop={10}>
              <Feather name="x" size={14} color={colors.mutedForeground} />
            </Pressable>
          ) : (
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
          )}
        </Pressable>

        {/* Manual subject input */}
        {!knownSubjects.includes(courseName) && courseName.trim() === '' && (
          <TextInput
            style={[styles.subjectInput, { color: colors.foreground, borderColor: colors.border, borderRadius: 12, fontFamily: 'Inter_400Regular' }]}
            placeholder="O escribe el nombre de la materia..."
            placeholderTextColor={colors.mutedForeground}
            value={courseName}
            onChangeText={setCourseName}
            maxLength={80}
          />
        )}

        {/* Due date */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
          FECHA DE ENTREGA
        </Text>
        <View style={styles.quickDates}>
          {[['Hoy', 0], ['Mañana', 1], ['En 1 semana', 7]].map(([label, offset]) => (
            <Pressable
              key={String(label)}
              style={({ pressed }) => [styles.quickDateBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, opacity: pressed ? 0.8 : 1 }]}
              onPress={() => quickDateBtn(String(label), Number(offset))}
            >
              <Text style={[styles.quickDateText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, fontFamily: 'Inter_400Regular' }]}
          placeholder="DD/MM/AAAA — ej: 15/08/2026"
          placeholderTextColor={colors.mutedForeground}
          value={dueDate}
          onChangeText={setDueDate}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />

        {/* Due time */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 20 }]}>
          HORA DE ENTREGA (OPCIONAL)
        </Text>
        <TextInput
          style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, fontFamily: 'Inter_400Regular' }]}
          placeholder="HH:MM — ej: 23:59"
          placeholderTextColor={colors.mutedForeground}
          value={dueTime}
          onChangeText={setDueTime}
          keyboardType="numbers-and-punctuation"
          maxLength={5}
        />

        {/* Delivery method */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
          FORMA DE ENTREGA
        </Text>
        <View style={styles.deliveryRow}>
          {DELIVERY_OPTIONS.map(opt => (
            <Pressable
              key={opt.value!}
              style={[
                styles.deliveryBtn,
                {
                  backgroundColor: deliveryMethod === opt.value ? opt.color + '18' : colors.card,
                  borderColor: deliveryMethod === opt.value ? opt.color : colors.border,
                  borderRadius: 14,
                },
              ]}
              onPress={() => {
                setDeliveryMethod(deliveryMethod === opt.value ? undefined : opt.value);
                Haptics.selectionAsync();
              }}
            >
              <Feather name={opt.icon as any} size={16} color={deliveryMethod === opt.value ? opt.color : colors.mutedForeground} />
              <Text style={[styles.deliveryText, { color: deliveryMethod === opt.value ? opt.color : colors.mutedForeground, fontFamily: deliveryMethod === opt.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Priority */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
          PRIORIDAD
        </Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map(p => (
            <Pressable
              key={p.value}
              style={[
                styles.priorityBtn,
                {
                  backgroundColor: priority === p.value ? p.color + '18' : colors.card,
                  borderColor: priority === p.value ? p.color : colors.border,
                  borderRadius: 14,
                },
              ]}
              onPress={() => { setPriority(p.value); Haptics.selectionAsync(); }}
            >
              <Feather name={p.icon as any} size={14} color={priority === p.value ? p.color : colors.mutedForeground} />
              <Text style={[styles.priorityLabel, { color: priority === p.value ? p.color : colors.mutedForeground, fontFamily: priority === p.value ? 'Inter_600SemiBold' : 'Inter_400Regular' }]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Note */}
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 24 }]}>
          COMENTARIO (OPCIONAL)
        </Text>
        <TextInput
          style={[styles.noteInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, fontFamily: 'Inter_400Regular' }]}
          placeholder="Instrucciones, notas extras..."
          placeholderTextColor={colors.mutedForeground}
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={400}
        />

        {/* Save */}
        <Pressable
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: title.trim() ? (pressed ? colors.primary + 'CC' : colors.primary) : colors.muted,
              borderRadius: 16,
              marginTop: 32,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={handleSave}
        >
          <Feather name="check" size={20} color={title.trim() ? '#FFF' : colors.mutedForeground} />
          <Text style={[styles.saveBtnText, { color: title.trim() ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
            Guardar tarea
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      {/* Subject picker modal */}
      <Modal visible={subjectPickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSubjectPickerVisible(false)}>
        <View style={[styles.pickerModal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Seleccionar materia</Text>
            <Pressable onPress={() => setSubjectPickerVisible(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 8 }}>
            {knownSubjects.length > 0 && (
              <>
                <Text style={[styles.pickerGroupLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                  TUS MATERIAS
                </Text>
                {knownSubjects.map((s, i) => (
                  <Pressable
                    key={s}
                    style={[styles.subjectOption, { backgroundColor: colors.card, borderColor: courseName === s ? colors.primary : colors.border, borderRadius: 14 }]}
                    onPress={() => { setCourseName(s); Haptics.selectionAsync(); setSubjectPickerVisible(false); }}
                  >
                    <View style={[styles.subjectOptionDot, { backgroundColor: ['#FFD6E8','#FFE5CC','#D6F5E3','#CCE8FF','#E8D6FF','#FFF3CC','#CCF5F0','#FFD6CC','#D6E8FF','#F5FFD6'][i % 10] }]} />
                    <Text style={[styles.subjectOptionText, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>{s}</Text>
                    {courseName === s && <Feather name="check" size={16} color={colors.primary} />}
                  </Pressable>
                ))}
              </>
            )}

            <Text style={[styles.pickerGroupLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 16 }]}>
              ESCRIBIR MANUALMENTE
            </Text>
            <TextInput
              style={[styles.fieldInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, fontFamily: 'Inter_400Regular' }]}
              placeholder="Nombre de la materia..."
              placeholderTextColor={colors.mutedForeground}
              value={!knownSubjects.includes(courseName) ? courseName : ''}
              onChangeText={v => setCourseName(v)}
              returnKeyType="done"
              onSubmitEditing={() => setSubjectPickerVisible(false)}
            />
            {!knownSubjects.includes(courseName) && courseName.trim() !== '' && (
              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14, marginTop: 8 }]}
                onPress={() => setSubjectPickerVisible(false)}
              >
                <Text style={[styles.saveBtnText, { color: '#FFF', fontFamily: 'Inter_600SemiBold' }]}>Usar "{courseName}"</Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 11, letterSpacing: 0.9, marginBottom: 10 },
  titleInput: { fontSize: 20, paddingVertical: 10, borderBottomWidth: 2, lineHeight: 26 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderWidth: 1 },
  pickerText: { fontSize: 15 },
  subjectInput: { fontSize: 14, padding: 12, borderWidth: 1, marginTop: 8 },
  quickDates: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  quickDateBtn: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  quickDateText: { fontSize: 12 },
  fieldInput: { fontSize: 15, padding: 13, borderWidth: 1 },
  deliveryRow: { gap: 8 },
  deliveryBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderWidth: 1 },
  deliveryText: { fontSize: 14 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderWidth: 1, gap: 6 },
  priorityLabel: { fontSize: 13 },
  noteInput: { fontSize: 15, lineHeight: 22, padding: 14, borderWidth: 1, minHeight: 90 },
  saveBtn: { height: 54, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  saveBtnText: { fontSize: 16 },
  pickerModal: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 22 },
  pickerGroupLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  subjectOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  subjectOptionDot: { width: 12, height: 12, borderRadius: 6 },
  subjectOptionText: { flex: 1, fontSize: 15 },
});
