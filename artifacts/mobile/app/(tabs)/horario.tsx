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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { digitizeScheduleImage, type DetectedBlock } from '@/utils/digitizeSchedule';

const STORAGE_KEY = '@horario_v1';
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
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
  day: number;
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
  subject: string; day: string;
  startHour: string; startMin: string;
  endHour: string; endMin: string;
  room: string; teacher: string;
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

  // ── Digitization state ────────────────────────────────────────────────────
  const [isDigitizing, setIsDigitizing] = useState(false);
  const [digitizeError, setDigitizeError] = useState<string | null>(null);
  const [detectedBlocks, setDetectedBlocks] = useState<DetectedBlock[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [confirmVisible, setConfirmVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(raw => { if (raw) setBlocks(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const persist = useCallback((b: ClassBlock[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(b)).catch(() => {});
  }, []);

  // ── Digitization flow ─────────────────────────────────────────────────────
  const handleDigitize = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para digitalizar el horario.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;

      setIsDigitizing(true);
      setDigitizeError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const uri = result.assets[0].uri;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const detected = await digitizeScheduleImage(base64);

      if (detected.length === 0) {
        setDigitizeError(
          'No se detectaron clases en la imagen. Asegúrate de que la imagen sea clara y muestre un horario con horarios y materias legibles.',
        );
        setIsDigitizing(false);
        return;
      }

      // Pre-select all detected blocks
      setDetectedBlocks(detected);
      setSelectedIds(new Set(detected.map((_, i) => i)));
      setIsDigitizing(false);
      setConfirmVisible(true);
    } catch (e: any) {
      setIsDigitizing(false);
      setDigitizeError(e?.message ?? 'Error al digitalizar. Intenta con otra imagen.');
    }
  };

  const confirmDigitized = () => {
    const nextColorBase = blocks.length;
    const newBlocks: ClassBlock[] = [];
    detectedBlocks.forEach((b, i) => {
      if (!selectedIds.has(i)) return;
      newBlocks.push({
        id: `${Date.now()}_${i}`,
        subject: b.subject,
        day: b.day,
        startHour: b.startHour,
        startMin: b.startMin,
        endHour: b.endHour,
        endMin: b.endMin,
        room: b.room,
        colorIdx: (nextColorBase + newBlocks.length) % PASTEL_COLORS.length,
      });
    });
    setBlocks(prev => {
      const updated = [...prev, ...newBlocks];
      persist(updated);
      return updated;
    });
    setConfirmVisible(false);
    setDetectedBlocks([]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Block form ────────────────────────────────────────────────────────────
  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); setModalVisible(true); };
  const openEdit = (block: ClassBlock) => {
    Haptics.selectionAsync();
    setEditingId(block.id);
    setForm({
      subject: block.subject, day: String(block.day),
      startHour: String(block.startHour), startMin: String(block.startMin),
      endHour: String(block.endHour), endMin: String(block.endMin),
      room: block.room ?? '', teacher: block.teacher ?? '',
    });
    setModalVisible(true);
  };

  const saveBlock = () => {
    if (!form.subject.trim()) { Alert.alert('Requerido', 'Ingresa el nombre de la materia.'); return; }
    const sh = parseInt(form.startHour) || 7, sm = parseInt(form.startMin) || 0;
    const eh = parseInt(form.endHour) || 8, em = parseInt(form.endMin) || 0;
    if (timeToMinutes(sh, sm) >= timeToMinutes(eh, em)) {
      Alert.alert('Hora inválida', 'La hora de inicio debe ser antes que la de fin.'); return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBlocks(prev => {
      let updated: ClassBlock[];
      if (editingId) {
        updated = prev.map(b => b.id === editingId
          ? { ...b, subject: form.subject.trim(), day: parseInt(form.day), startHour: sh, startMin: sm, endHour: eh, endMin: em, room: form.room.trim() || undefined, teacher: form.teacher.trim() || undefined }
          : b);
      } else {
        updated = [...prev, { id: Date.now().toString(), subject: form.subject.trim(), day: parseInt(form.day), startHour: sh, startMin: sm, endHour: eh, endMin: em, room: form.room.trim() || undefined, teacher: form.teacher.trim() || undefined, colorIdx: prev.length % PASTEL_COLORS.length }];
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
      <View style={[styles.topHeader, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Horario</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {blocks.length === 0 ? 'Sin clases' : `${blocks.length} clase${blocks.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          {/* Digitize from photo */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 14, opacity: pressed ? 0.7 : 1 }]}
            onPress={handleDigitize}
            disabled={isDigitizing}
          >
            {isDigitizing
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Feather name="camera" size={16} color={colors.primary} />}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.85 : 1 }]}
            onPress={openAdd}
          >
            <Feather name="plus" size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {/* Digitize CTA when empty */}
      {blocks.length === 0 && !isDigitizing && (
        <Pressable
          style={[styles.ctaCard, { backgroundColor: colors.card, borderColor: colors.primary + '40', borderRadius: 18 }]}
          onPress={handleDigitize}
        >
          <View style={[styles.ctaIcon, { backgroundColor: colors.primary + '15' }]}>
            <Feather name="camera" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.ctaTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Digitalizar horario
          </Text>
          <Text style={[styles.ctaSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Toma una foto de tu horario impreso y el app lo convierte automáticamente en bloques de clase digitales.
          </Text>
          <View style={[styles.ctaBtn, { backgroundColor: colors.primary, borderRadius: 12 }]}>
            <Feather name="camera" size={14} color="#FFF" />
            <Text style={[styles.ctaBtnText, { fontFamily: 'Inter_600SemiBold' }]}>Seleccionar imagen</Text>
          </View>
        </Pressable>
      )}

      {/* Digitize loading */}
      {isDigitizing && (
        <View style={[styles.loadingCard, { backgroundColor: colors.card, borderRadius: 16, borderColor: colors.border }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Digitalizando horario...
          </Text>
          <Text style={[styles.loadingSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Analizando imagen con OCR. Esto puede tardar unos segundos.
          </Text>
        </View>
      )}

      {/* OCR error */}
      {digitizeError && !isDigitizing && (
        <View style={[styles.errorCard, { backgroundColor: colors.destructive + '12', borderColor: colors.destructive + '30', borderRadius: 14 }]}>
          <Feather name="alert-circle" size={18} color={colors.destructive} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.errorTitle, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>No se pudo digitalizar</Text>
            <Text style={[styles.errorSub, { color: colors.destructive + 'CC', fontFamily: 'Inter_400Regular' }]}>{digitizeError}</Text>
          </View>
          <Pressable onPress={() => setDigitizeError(null)} hitSlop={8}>
            <Feather name="x" size={16} color={colors.destructive} />
          </Pressable>
        </View>
      )}

      {/* Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', paddingBottom: Platform.OS === 'web' ? 120 : 100 }}>
            {/* Time column */}
            <View style={[styles.timeCol, { width: TIME_COL }]}>
              <View style={{ height: 36 }} />
              {HOURS.map(h => (
                <View key={h} style={[styles.timeCell, { height: CELL_H }]}>
                  <Text style={[styles.timeText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                    {fmtTime(h, 0)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Day columns */}
            {DAYS.map((day, dayIdx) => {
              const dayBlocks = blocks
                .filter(b => b.day === dayIdx)
                .sort((a, b) => timeToMinutes(a.startHour, a.startMin) - timeToMinutes(b.startHour, b.startMin));
              return (
                <View key={day} style={[styles.dayCol, { borderLeftColor: colors.border }]}>
                  <View style={[styles.dayHeaderCell, { height: 36, borderBottomColor: colors.border }]}>
                    <Text style={[styles.dayHeader, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{day}</Text>
                  </View>
                  <View style={{ height: GRID_H, position: 'relative' }}>
                    {HOURS.map(h => (
                      <View key={h} style={[styles.hourLine, { top: (h - 7) * CELL_H, borderTopColor: colors.border }]} />
                    ))}
                    {dayBlocks.map(block => {
                      const startMin = timeToMinutes(block.startHour, block.startMin) - 7 * 60;
                      const endMin = timeToMinutes(block.endHour, block.endMin) - 7 * 60;
                      const top = (startMin / 60) * CELL_H;
                      const height = ((endMin - startMin) / 60) * CELL_H - 2;
                      const bg = PASTEL_COLORS[block.colorIdx % PASTEL_COLORS.length];
                      const fg = PASTEL_TEXT[block.colorIdx % PASTEL_TEXT.length];
                      return (
                        <Pressable key={block.id} style={[styles.classBlock, { top, height, backgroundColor: bg, borderLeftColor: fg }]} onPress={() => openEdit(block)}>
                          <Text style={[styles.blockSubject, { color: fg, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{block.subject}</Text>
                          <Text style={[styles.blockTime, { color: fg + 'BB', fontFamily: 'Inter_400Regular' }]}>{fmtTime(block.startHour, block.startMin)}–{fmtTime(block.endHour, block.endMin)}</Text>
                          {block.room ? <Text style={[styles.blockRoom, { color: fg + '99', fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>🏫 {block.room}</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ScrollView>

      {/* ── DIGITIZATION CONFIRMATION MODAL ──────────────────────────────── */}
      <Modal visible={confirmVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setConfirmVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
                Clases detectadas
              </Text>
              <Text style={[styles.modalSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
                {selectedIds.size} de {detectedBlocks.length} seleccionadas — toca para incluir/excluir
              </Text>
            </View>
            <Pressable onPress={() => setConfirmVisible(false)} hitSlop={12}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.confirmList}>
            {detectedBlocks.map((b, i) => {
              const isSelected = selectedIds.has(i);
              return (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.detectedCard,
                    {
                      backgroundColor: isSelected ? colors.primary + '12' : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                      borderRadius: 14,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedIds(prev => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i); else next.add(i);
                      return next;
                    });
                  }}
                >
                  {/* Checkbox */}
                  <View style={[styles.checkbox, { borderColor: isSelected ? colors.primary : colors.border, backgroundColor: isSelected ? colors.primary : 'transparent' }]}>
                    {isSelected && <Feather name="check" size={11} color="#FFF" />}
                  </View>

                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[styles.detectedSubject, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
                      {b.subject}
                    </Text>
                    <View style={styles.detectedMeta}>
                      <View style={[styles.metaChip, { backgroundColor: colors.primary + '14' }]}>
                        <Feather name="calendar" size={10} color={colors.primary} />
                        <Text style={[styles.metaText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
                          {DAYS_FULL[b.day] ?? `Día ${b.day}`}
                        </Text>
                      </View>
                      <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                        <Feather name="clock" size={10} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                          {fmtTime(b.startHour, b.startMin)}–{fmtTime(b.endHour, b.endMin)}
                        </Text>
                      </View>
                      {b.room && (
                        <View style={[styles.metaChip, { backgroundColor: colors.secondary }]}>
                          <Feather name="map-pin" size={10} color={colors.mutedForeground} />
                          <Text style={[styles.metaText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>{b.room}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* Bottom actions */}
          <View style={[styles.confirmFooter, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable
              style={({ pressed }) => [styles.confirmBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: pressed || selectedIds.size === 0 ? 0.7 : 1 }]}
              onPress={confirmDigitized}
              disabled={selectedIds.size === 0}
            >
              <Feather name="check" size={18} color="#FFF" />
              <Text style={[styles.confirmBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
                Agregar {selectedIds.size} clase{selectedIds.size !== 1 ? 's' : ''} al horario
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.retryBtn, { borderColor: colors.border, borderRadius: 14, opacity: pressed ? 0.7 : 1 }]}
              onPress={() => { setConfirmVisible(false); setTimeout(handleDigitize, 300); }}
            >
              <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
              <Text style={[styles.retryBtnText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                Intentar con otra imagen
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ── ADD / EDIT CLASS MODAL ─────────────────────────────────────────── */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {editingId ? 'Editar clase' : 'Agregar clase'}
            </Text>
            <Pressable onPress={() => setModalVisible(false)} hitSlop={12}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat contentContainerStyle={styles.formContent}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>MATERIA *</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]} value={form.subject} onChangeText={v => setForm(f => ({ ...f, subject: v }))} placeholder="Ej. Cálculo Diferencial" placeholderTextColor={colors.mutedForeground} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>DÍA</Text>
              <View style={styles.daySelector}>
                {DAYS.map((d, i) => (
                  <Pressable key={d} style={[styles.dayChip, { backgroundColor: form.day === String(i) ? colors.primary : colors.card, borderRadius: 10, borderColor: form.day === String(i) ? colors.primary : colors.border }]} onPress={() => setForm(f => ({ ...f, day: String(i) }))}>
                    <Text style={[styles.dayChipText, { color: form.day === String(i) ? '#FFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>INICIO</Text>
                <View style={styles.timeInputRow}>
                  <TextInput style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]} value={form.startHour} onChangeText={v => setForm(f => ({ ...f, startHour: v }))} keyboardType="number-pad" maxLength={2} placeholder="7" placeholderTextColor={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>:</Text>
                  <TextInput style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]} value={form.startMin} onChangeText={v => setForm(f => ({ ...f, startMin: v }))} keyboardType="number-pad" maxLength={2} placeholder="00" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>FIN</Text>
                <View style={styles.timeInputRow}>
                  <TextInput style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]} value={form.endHour} onChangeText={v => setForm(f => ({ ...f, endHour: v }))} keyboardType="number-pad" maxLength={2} placeholder="9" placeholderTextColor={colors.mutedForeground} />
                  <Text style={{ color: colors.mutedForeground, fontSize: 18 }}>:</Text>
                  <TextInput style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]} value={form.endMin} onChangeText={v => setForm(f => ({ ...f, endMin: v }))} keyboardType="number-pad" maxLength={2} placeholder="00" placeholderTextColor={colors.mutedForeground} />
                </View>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>AULA (OPCIONAL)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]} value={form.room} onChangeText={v => setForm(f => ({ ...f, room: v }))} placeholder="Ej. Sala 3B" placeholderTextColor={colors.mutedForeground} />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>PROFESOR (OPCIONAL)</Text>
              <TextInput style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]} value={form.teacher} onChangeText={v => setForm(f => ({ ...f, teacher: v }))} placeholder="Nombre del profesor" placeholderTextColor={colors.mutedForeground} />
            </View>

            <Pressable style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.85 : 1 }]} onPress={saveBlock}>
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>{editingId ? 'Guardar cambios' : 'Agregar clase'}</Text>
            </Pressable>

            {editingId && (
              <Pressable style={({ pressed }) => [styles.deleteBtn, { borderColor: colors.destructive, borderRadius: 14, opacity: pressed ? 0.8 : 1 }]} onPress={() => deleteBlock(editingId)}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ctaCard: { marginHorizontal: 20, marginBottom: 12, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed' },
  ctaIcon: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  ctaTitle: { fontSize: 18 },
  ctaSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  ctaBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, marginTop: 4 },
  ctaBtnText: { color: '#FFF', fontSize: 14 },
  loadingCard: { marginHorizontal: 20, marginBottom: 12, padding: 24, alignItems: 'center', gap: 10, borderWidth: 1 },
  loadingTitle: { fontSize: 15 },
  loadingSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  errorCard: { marginHorizontal: 20, marginBottom: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderWidth: 1 },
  errorTitle: { fontSize: 13 },
  errorSub: { fontSize: 12, lineHeight: 18 },
  timeCol: { alignItems: 'center' },
  timeCell: { justifyContent: 'flex-start', paddingTop: 4, alignItems: 'center' },
  timeText: { fontSize: 10 },
  dayCol: { width: 110, borderLeftWidth: 1 },
  dayHeaderCell: { alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1 },
  dayHeader: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  hourLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  classBlock: { position: 'absolute', left: 2, right: 2, borderRadius: 8, borderLeftWidth: 3, padding: 4, overflow: 'hidden' },
  blockSubject: { fontSize: 11, lineHeight: 14 },
  blockTime: { fontSize: 10, marginTop: 1 },
  blockRoom: { fontSize: 9, marginTop: 1 },
  // Modals
  modalContainer: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 20, paddingBottom: 12 },
  modalTitle: { fontSize: 20 },
  modalSub: { fontSize: 12, marginTop: 2 },
  // Confirm list
  confirmList: { paddingHorizontal: 16, gap: 10 },
  detectedCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1.5 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  detectedSubject: { fontSize: 15 },
  detectedMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  metaText: { fontSize: 11 },
  confirmFooter: { padding: 16, gap: 10, borderTopWidth: 1 },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  confirmBtnText: { color: '#FFF', fontSize: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderWidth: 1 },
  retryBtnText: { fontSize: 14 },
  // Form
  formContent: { padding: 20, gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.8 },
  input: { height: 46, paddingHorizontal: 14, borderWidth: 1, fontSize: 15 },
  daySelector: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  dayChipText: { fontSize: 13 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeInput: { width: 52, height: 46, borderWidth: 1, textAlign: 'center', fontSize: 16 },
  saveBtn: { padding: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFF', fontSize: 16 },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, borderWidth: 1, marginTop: -8 },
  deleteBtnText: { fontSize: 15 },
});
