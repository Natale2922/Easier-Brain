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
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';

const STORAGE_KEY = '@horario_v1';
const IMAGE_KEY = '@horario_image_v1';
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
  const [scheduleImageUri, setScheduleImageUri] = useState<string | null>(null);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(IMAGE_KEY),
    ])
      .then(([rawBlocks, rawImage]) => {
        if (rawBlocks) setBlocks(JSON.parse(rawBlocks));
        if (rawImage) setScheduleImageUri(rawImage);
      })
      .catch(() => {});
  }, []);

  const persist = useCallback((b: ClassBlock[]) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(b)).catch(() => {});
  }, []);

  const pickScheduleImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para importar la imagen del horario.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        const uri = result.assets[0].uri;
        setScheduleImageUri(uri);
        setShowImage(true);
        AsyncStorage.setItem(IMAGE_KEY, uri).catch(() => {});
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch {
      Alert.alert('Error', 'No se pudo importar la imagen.');
    }
  };

  const clearImage = () => {
    Alert.alert('Eliminar imagen', '¿Quitar la imagen del horario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          setScheduleImageUri(null);
          setShowImage(false);
          AsyncStorage.removeItem(IMAGE_KEY).catch(() => {});
        },
      },
    ]);
  };

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
      <View style={[styles.topHeader, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <View>
          <Text style={[styles.title, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Horario
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            {blocks.length === 0 ? 'Sin clases agregadas' : `${blocks.length} clase${blocks.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <View style={styles.headerBtns}>
          {/* Image picker button */}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: scheduleImageUri ? colors.primary + '18' : colors.card, borderColor: scheduleImageUri ? colors.primary : colors.border, borderRadius: 14, opacity: pressed ? 0.7 : 1 }]}
            onPress={scheduleImageUri ? () => setShowImage(v => !v) : pickScheduleImage}
            onLongPress={scheduleImageUri ? clearImage : undefined}
          >
            <Feather name="image" size={16} color={scheduleImageUri ? colors.primary : colors.mutedForeground} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.primary, borderColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.85 : 1 }]}
            onPress={openAdd}
          >
            <Feather name="plus" size={18} color="#FFF" />
          </Pressable>
        </View>
      </View>

      {/* Schedule image banner */}
      {scheduleImageUri && showImage && (
        <View style={[styles.imageBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.imageBannerHeader}>
            <Text style={[styles.imageBannerTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              📸 Imagen del horario
            </Text>
            <View style={styles.imageBannerActions}>
              <Pressable onPress={pickScheduleImage} hitSlop={8}>
                <Feather name="refresh-cw" size={14} color={colors.primary} />
              </Pressable>
              <Pressable onPress={clearImage} hitSlop={8}>
                <Feather name="trash-2" size={14} color={colors.destructive} />
              </Pressable>
              <Pressable onPress={() => setShowImage(false)} hitSlop={8}>
                <Feather name="chevron-up" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          </View>
          <Image
            source={{ uri: scheduleImageUri }}
            style={styles.scheduleImage}
            resizeMode="contain"
          />
        </View>
      )}

      {/* Image hidden hint */}
      {scheduleImageUri && !showImage && (
        <Pressable
          style={[styles.imageHint, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}
          onPress={() => setShowImage(true)}
        >
          <Feather name="image" size={13} color={colors.primary} />
          <Text style={[styles.imageHintText, { color: colors.primary, fontFamily: 'Inter_500Medium' }]}>
            Ver imagen del horario
          </Text>
          <Feather name="chevron-down" size={13} color={colors.primary} />
        </Pressable>
      )}

      {/* Import image CTA when empty */}
      {!scheduleImageUri && blocks.length === 0 && (
        <Pressable
          style={[styles.imageImportCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: 16 }]}
          onPress={pickScheduleImage}
        >
          <Feather name="upload" size={28} color={colors.primary} />
          <Text style={[styles.imageImportTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
            Importar imagen del horario
          </Text>
          <Text style={[styles.imageImportSub, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Toma una foto de tu horario impreso y guárdala aquí para consultarla rápido
          </Text>
        </Pressable>
      )}

      {/* Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', paddingBottom: Platform.OS === 'web' ? 120 : 100 }}>
            {/* Time column */}
            <View style={[styles.timeCol, { width: TIME_COL }]}>
              <View style={[styles.dayHeaderCell, { height: 36 }]} />
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
                  {/* Day header */}
                  <View style={[styles.dayHeaderCell, { height: 36, borderBottomColor: colors.border }]}>
                    <Text style={[styles.dayHeader, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
                      {day}
                    </Text>
                  </View>

                  {/* Grid + blocks */}
                  <View style={{ height: GRID_H, position: 'relative' }}>
                    {/* Hour lines */}
                    {HOURS.map(h => (
                      <View
                        key={h}
                        style={[styles.hourLine, { top: (h - 7) * CELL_H, borderTopColor: colors.border }]}
                      />
                    ))}

                    {/* Class blocks */}
                    {dayBlocks.map(block => {
                      const startMin = timeToMinutes(block.startHour, block.startMin) - 7 * 60;
                      const endMin = timeToMinutes(block.endHour, block.endMin) - 7 * 60;
                      const top = (startMin / 60) * CELL_H;
                      const height = ((endMin - startMin) / 60) * CELL_H - 2;
                      const bg = PASTEL_COLORS[block.colorIdx % PASTEL_COLORS.length];
                      const fg = PASTEL_TEXT[block.colorIdx % PASTEL_TEXT.length];

                      return (
                        <Pressable
                          key={block.id}
                          style={[styles.classBlock, { top, height, backgroundColor: bg, borderLeftColor: fg }]}
                          onPress={() => openEdit(block)}
                        >
                          <Text style={[styles.blockSubject, { color: fg, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>
                            {block.subject}
                          </Text>
                          <Text style={[styles.blockTime, { color: fg + 'BB', fontFamily: 'Inter_400Regular' }]}>
                            {fmtTime(block.startHour, block.startMin)}–{fmtTime(block.endHour, block.endMin)}
                          </Text>
                          {block.room ? (
                            <Text style={[styles.blockRoom, { color: fg + '99', fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                              🏫 {block.room}
                            </Text>
                          ) : null}
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

      {/* Add/Edit modal */}
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

          <KeyboardAwareScrollViewCompat contentContainerStyle={styles.modalContent}>
            {/* Subject */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>MATERIA *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
                value={form.subject}
                onChangeText={v => setForm(f => ({ ...f, subject: v }))}
                placeholder="Ej. Cálculo Diferencial"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Day selector */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>DÍA</Text>
              <View style={styles.daySelector}>
                {DAYS.map((d, i) => (
                  <Pressable
                    key={d}
                    style={[styles.dayChip, { backgroundColor: form.day === String(i) ? colors.primary : colors.card, borderRadius: 10, borderColor: form.day === String(i) ? colors.primary : colors.border }]}
                    onPress={() => setForm(f => ({ ...f, day: String(i) }))}
                  >
                    <Text style={[styles.dayChipText, { color: form.day === String(i) ? '#FFF' : colors.foreground, fontFamily: 'Inter_500Medium' }]}>{d}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Time */}
            <View style={styles.timeRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>INICIO (H:M)</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]}
                    value={form.startHour}
                    onChangeText={v => setForm(f => ({ ...f, startHour: v }))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="7"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <Text style={[{ color: colors.mutedForeground, fontSize: 18 }]}>:</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]}
                    value={form.startMin}
                    onChangeText={v => setForm(f => ({ ...f, startMin: v }))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>FIN (H:M)</Text>
                <View style={styles.timeInputRow}>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]}
                    value={form.endHour}
                    onChangeText={v => setForm(f => ({ ...f, endHour: v }))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="9"
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <Text style={[{ color: colors.mutedForeground, fontSize: 18 }]}>:</Text>
                  <TextInput
                    style={[styles.timeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 10 }]}
                    value={form.endMin}
                    onChangeText={v => setForm(f => ({ ...f, endMin: v }))}
                    keyboardType="number-pad"
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </View>
              </View>
            </View>

            {/* Room */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>AULA (OPCIONAL)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
                value={form.room}
                onChangeText={v => setForm(f => ({ ...f, room: v }))}
                placeholder="Ej. Sala 3B"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Teacher */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>PROFESOR (OPCIONAL)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, borderRadius: 12 }]}
                value={form.teacher}
                onChangeText={v => setForm(f => ({ ...f, teacher: v }))}
                placeholder="Nombre del profesor"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            {/* Save */}
            <Pressable
              style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary, borderRadius: 14, opacity: pressed ? 0.85 : 1 }]}
              onPress={saveBlock}
            >
              <Text style={[styles.saveBtnText, { fontFamily: 'Inter_600SemiBold' }]}>
                {editingId ? 'Guardar cambios' : 'Agregar clase'}
              </Text>
            </Pressable>

            {editingId && (
              <Pressable
                style={({ pressed }) => [styles.deleteBtn, { borderColor: colors.destructive, borderRadius: 14, opacity: pressed ? 0.8 : 1 }]}
                onPress={() => deleteBlock(editingId)}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 28, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, marginTop: 2 },
  headerBtns: { flexDirection: 'row', gap: 8, paddingTop: 4 },
  iconBtn: { width: 38, height: 38, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  imageBanner: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  imageBannerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12 },
  imageBannerTitle: { fontSize: 13 },
  imageBannerActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  scheduleImage: { width: '100%', height: 220, backgroundColor: '#0001' },
  imageHint: { marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8, borderRadius: 10, borderWidth: 1 },
  imageHintText: { fontSize: 12 },
  imageImportCard: { marginHorizontal: 16, marginBottom: 12, padding: 24, alignItems: 'center', gap: 8, borderWidth: 1, borderStyle: 'dashed' },
  imageImportTitle: { fontSize: 15 },
  imageImportSub: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
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
  modalContainer: { flex: 1 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  modalTitle: { fontSize: 20 },
  modalContent: { padding: 20, gap: 16 },
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
