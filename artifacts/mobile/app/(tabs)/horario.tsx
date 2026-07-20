import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const STORAGE_KEY = '@horario_v1';
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 – 21:00

const PASTEL_COLORS = [
  '#FFD6E8', '#FFE5CC', '#D6F5E3', '#CCE8FF', '#E8D6FF',
  '#FFF3CC', '#CCF5F0', '#FFD6CC', '#D6E8FF', '#F5FFD6',
];
const PASTEL_TEXT = [
  '#C0547B', '#B8703A', '#2A8A5E', '#2563A8', '#6B3FA8',
  '#A08020', '#1A8A80', '#B85A3A', '#2A5AA8', '#5A8A20',
];

export interface ClassBlock {
  id: string;
  subject: string;
  day: number; // 0=Mon..5=Sat
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  room?: string;
  teacher?: string;
  colorIdx: number;
}

function timeToMinutes(h: number, m: number) { return h * 60 + m; }
function fmtTime(h: number, m: number) {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface BlockFormState {
  subject: string;
  day: string;
  startHour: string;
  startMin: string;
  endHour: string;
  endMin: string;
  room: string;
  teacher: string;
}

const EMPTY_FORM: BlockFormState = {
  subject: '', day: '0', startHour: '7', startMin: '0',
  endHour: '9', endMin: '0', room: '', teacher: '',
};

export default function HorarioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const [blocks, setBlocks] = useState<ClassBlock[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BlockFormState>(EMPTY_FORM);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setBlocks(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const persist = useCallback((b: ClassBlock[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(b)).catch(() => {});
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalVisible(true);
  };

  const openEdit = (block: ClassBlock) => {
    Haptics.selectionAsync();
    setEditingId(block.id);
    setForm({
      subject: block.subject,
      day: String(block.day),
      startHour: String(block.startHour),
      startMin: String(block.startMin),
      endHour: String(block.endHour),
      endMin: String(block.endMin),
      room: block.room ?? '',
      teacher: block.teacher ?? '',
    });
    setModalVisible(true);
  };

  const saveBlock = () => {
    if (!form.subject.trim()) {
      Alert.alert('Requerido', 'Ingresa el nombre de la materia.');
      return;
    }
    const sh = parseInt(form.startHour) || 7;
    const sm = parseInt(form.startMin) || 0;
    const eh = parseInt(form.endHour) || 8;
    const em = parseInt(form.endMin) || 0;
    if (timeToMinutes(sh, sm) >= timeToMinutes(eh, em)) {
      Alert.alert('Hora inválida', 'La hora de inicio debe ser antes que la de fin.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBlocks(prev => {
      let updated: ClassBlock[];
      if (editingId) {
        updated = prev.map(b =>
          b.id === editingId
            ? { ...b, subject: form.subject.trim(), day: parseInt(form.day), startHour: sh, startMin: sm, endHour: eh, endMin: em, room: form.room.trim() || undefined, teacher: form.teacher.trim() || undefined }
            : b,
        );
      } else {
        const newBlock: ClassBlock = {
          id: Date.now().toString(),
          subject: form.subject.trim(),
          day: parseInt(form.day),
          startHour: sh, startMin: sm, endHour: eh, endMin: em,
          room: form.room.trim() || undefined,
          teacher: form.teacher.trim() || undefined,
          colorIdx: prev.length % PASTEL_COLORS.length,
        };
        updated = [...prev, newBlock];
      }
      persist(updated);
      return updated;
    });
    setModalVisible(false);
  };

  const deleteBlock = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setBlocks(prev => { const u = prev.filter(b => b.id !== id); persist(u); return u; });
    setModalVisible(false);
  };

  const CELL_H = 56;
  const TIME_COL = 48;
  const GRID_H = HOURS.length * CELL_H;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 20 }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Horario
          </Text>
          <Pressable
            style={({ pressed }) => [styles.addBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1, borderRadius: 14 }]}
            onPress={openAdd}
          >
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={[styles.addBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Clase</Text>
          </Pressable>
        </View>
      </View>

      {blocks.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="calendar" size={52} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Sin horario
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Toca "+ Clase" para agregar{'\n'}tus materias y horarios.
          </Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 120 : 100 }}>
            {/* Column headers */}
            <View style={[styles.colHeaders, { marginLeft: TIME_COL }]}>
              {DAYS.map(d => (
                <View key={d} style={[styles.colHeader]}>
                  <Text style={[styles.colHeaderText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Grid */}
            <View style={{ flexDirection: 'row' }}>
              {/* Time column */}
              <View style={{ width: TIME_COL }}>
                {HOURS.map(h => (
                  <View key={h} style={[styles.timeCell, { height: CELL_H }]}>
                    <Text style={[styles.timeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                      {String(h).padStart(2, '0')}:00
                    </Text>
                  </View>
                ))}
              </View>

              {/* Day columns */}
              {DAYS.map((_, dayIdx) => (
                <View key={dayIdx} style={[styles.dayCol, { height: GRID_H, borderLeftColor: colors.border }]}>
                  {/* Hour lines */}
                  {HOURS.map(h => (
                    <View key={h} style={[styles.hourLine, { top: (h - 7) * CELL_H, borderColor: colors.border }]} />
                  ))}

                  {/* Class blocks */}
                  {blocks
                    .filter(b => b.day === dayIdx)
                    .map(block => {
                      const startMins = timeToMinutes(block.startHour, block.startMin) - 7 * 60;
                      const durationMins = timeToMinutes(block.endHour, block.endMin) - timeToMinutes(block.startHour, block.startMin);
                      const top = (startMins / 60) * CELL_H;
                      const height = (durationMins / 60) * CELL_H - 2;
                      const bg = PASTEL_COLORS[block.colorIdx % PASTEL_COLORS.length];
                      const fg = PASTEL_TEXT[block.colorIdx % PASTEL_TEXT.length];
                      return (
                        <Pressable
                          key={block.id}
                          style={({ pressed }) => [
                            styles.classBlock,
                            { top, height, backgroundColor: bg, borderLeftColor: fg, opacity: pressed ? 0.8 : 1, borderRadius: 8 },
                          ]}
                          onPress={() => openEdit(block)}
                        >
                          <Text style={[styles.blockSubject, { color: fg, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                            {block.subject}
                          </Text>
                          <Text style={[styles.blockTime, { color: fg + 'BB', fontFamily: 'Inter_400Regular' }]}>
                            {fmtTime(block.startHour, block.startMin)}–{fmtTime(block.endHour, block.endMin)}
                          </Text>
                          {block.room ? <Text style={[styles.blockRoom, { color: fg + '99', fontFamily: 'Inter_400Regular' }]}>{block.room}</Text> : null}
                        </Pressable>
                      );
                    })}
                </View>
              ))}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {/* Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {editingId ? 'Editar clase' : 'Nueva clase'}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={10}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <KeyboardAwareScrollViewCompat contentContainerStyle={styles.modalForm} showsVerticalScrollIndicator={false} bottomOffset={16}>
            {/* Subject */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>MATERIA</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, fontFamily: 'Inter_500Medium' }]}
              value={form.subject}
              onChangeText={v => setForm(f => ({ ...f, subject: v }))}
              placeholder="Nombre de la materia"
              placeholderTextColor={colors.mutedForeground}
              autoFocus
            />

            {/* Day */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 20 }]}>DÍA</Text>
            <View style={styles.dayRow}>
              {DAYS.map((d, i) => (
                <Pressable
                  key={d}
                  style={[styles.dayChip, { backgroundColor: form.day === String(i) ? colors.primary : colors.card, borderColor: form.day === String(i) ? colors.primary : colors.border, borderRadius: 10 }]}
                  onPress={() => { setForm(f => ({ ...f, day: String(i) })); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.dayChipText, { color: form.day === String(i) ? '#FFF' : colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{d}</Text>
                </Pressable>
              ))}
            </View>

            {/* Time */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 20 }]}>HORARIO</Text>
            <View style={styles.timeRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sublabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Inicio</Text>
                <View style={styles.timeInputs}>
                  <TextInput style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, fontFamily: 'Inter_600SemiBold' }]}
                    value={form.startHour} onChangeText={v => setForm(f => ({ ...f, startHour: v }))}
                    keyboardType="number-pad" maxLength={2} placeholder="HH" placeholderTextColor={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 20 }}>:</Text>
                  <TextInput style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, fontFamily: 'Inter_600SemiBold' }]}
                    value={form.startMin} onChangeText={v => setForm(f => ({ ...f, startMin: v }))}
                    keyboardType="number-pad" maxLength={2} placeholder="MM" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
              <Feather name="arrow-right" size={18} color={colors.mutedForeground} style={{ marginTop: 22 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.sublabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Fin</Text>
                <View style={styles.timeInputs}>
                  <TextInput style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, fontFamily: 'Inter_600SemiBold' }]}
                    value={form.endHour} onChangeText={v => setForm(f => ({ ...f, endHour: v }))}
                    keyboardType="number-pad" maxLength={2} placeholder="HH" placeholderTextColor={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 20 }}>:</Text>
                  <TextInput style={[styles.timeInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, fontFamily: 'Inter_600SemiBold' }]}
                    value={form.endMin} onChangeText={v => setForm(f => ({ ...f, endMin: v }))}
                    keyboardType="number-pad" maxLength={2} placeholder="MM" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            </View>

            {/* Room */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 20 }]}>AULA (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, fontFamily: 'Inter_400Regular' }]}
              value={form.room} onChangeText={v => setForm(f => ({ ...f, room: v }))}
              placeholder="Ej: Aula 3, Lab 2..." placeholderTextColor={colors.mutedForeground}
            />

            {/* Teacher */}
            <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium', marginTop: 20 }]}>DOCENTE (OPCIONAL)</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 12, fontFamily: 'Inter_400Regular' }]}
              value={form.teacher} onChangeText={v => setForm(f => ({ ...f, teacher: v }))}
              placeholder="Nombre del docente" placeholderTextColor={colors.mutedForeground}
            />

            {/* Actions */}
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.85 : 1, marginTop: 28 }]}
              onPress={saveBlock}
            >
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
                {editingId ? 'Guardar cambios' : 'Agregar clase'}
              </Text>
            </Pressable>

            {editingId && (
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, { borderColor: colors.destructive, borderRadius: 14, opacity: pressed ? 0.75 : 1 }]}
                onPress={() => { Alert.alert('Eliminar clase', '¿Seguro?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => deleteBlock(editingId!) }]); }}
              >
                <Feather name="trash-2" size={16} color={colors.destructive} />
                <Text style={[styles.deleteBtnText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>Eliminar clase</Text>
              </Pressable>
            )}
          </KeyboardAwareScrollViewCompat>
        </View>
      </Modal>
    </View>
  );
}

const COL_W = 100;
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, letterSpacing: -0.5 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9 },
  addBtnText: { color: '#FFF', fontSize: 14 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyTitle: { fontSize: 18 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  colHeaders: { flexDirection: 'row', paddingBottom: 6 },
  colHeader: { width: COL_W, alignItems: 'center' },
  colHeaderText: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeCell: { justifyContent: 'center', paddingRight: 6 },
  timeText: { fontSize: 10, textAlign: 'right' },
  dayCol: { width: COL_W, position: 'relative', borderLeftWidth: 1 },
  hourLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1, height: 1 },
  classBlock: { position: 'absolute', left: 2, right: 2, padding: 4, borderLeftWidth: 3, overflow: 'hidden' },
  blockSubject: { fontSize: 11, lineHeight: 14 },
  blockTime: { fontSize: 9, marginTop: 2 },
  blockRoom: { fontSize: 9 },
  // Modal
  modal: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  modalTitle: { fontSize: 22 },
  modalForm: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  label: { fontSize: 11, letterSpacing: 0.8, marginBottom: 8 },
  sublabel: { fontSize: 12, marginBottom: 6 },
  input: { fontSize: 15, padding: 13, borderWidth: 1 },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: { paddingHorizontal: 14, paddingVertical: 9, borderWidth: 1 },
  dayChipText: { fontSize: 13 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  timeInputs: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeInput: { width: 46, height: 44, textAlign: 'center', fontSize: 18, borderWidth: 1 },
  saveBtn: { height: 52, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontSize: 16 },
  deleteBtn: { height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, marginTop: 12, flexDirection: 'row', gap: 8 },
  deleteBtnText: { fontSize: 15 },
});
