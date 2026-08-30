import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import {
  useTasks,
  type Priority,
  type DeliveryMethod,
} from "@/context/TasksContext";
import { parseTaskFromText } from "@/utils/parseTask";

const DELIVERY_LABELS: Record<string, string> = {
  campus: "🖥️ Campus Virtual",
  email: "📧 Correo",
  class: "🏫 En clase",
};

const PRIORITY_LABELS: Record<Priority, string> = {
  high: "🔴 Alta",
  medium: "🟡 Media",
  low: "🟢 Baja",
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function AITaskDialog({ visible, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTask, tasks } = useTasks();

  const [step, setStep] = useState<"input" | "preview">("input");
  const [inputText, setInputText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<
    typeof parseTaskFromText
  > | null>(null);

  // Editable preview fields
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editCourse, setEditCourse] = useState("");
  const [editPriority, setEditPriority] = useState<Priority>("medium");
  const [editDelivery, setEditDelivery] = useState<DeliveryMethod | undefined>(
    undefined,
  );

  const knownCourses = [
    ...new Set(tasks.filter((t) => t.courseName).map((t) => t.courseName!)),
  ];

  const shimmer = useRef(new Animated.Value(0)).current;
  const [isParsing, setIsParsing] = useState(false);

  const startShimmer = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 700,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    ).start();
  };

  const handleParse = () => {
    if (!inputText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsParsing(true);
    startShimmer();

    // Small delay for UX feel
    setTimeout(() => {
      const result = parseTaskFromText(inputText.trim(), knownCourses);
      setParsed(result);
      setEditTitle(result.title);
      setEditNote("");
      setEditDate(result.dueDate ?? "");
      setEditTime(result.dueTime ?? "");
      setEditCourse(result.courseName ?? "");
      setEditPriority(result.priority ?? "medium");
      setEditDelivery(result.deliveryMethod ?? undefined);
      shimmer.stopAnimation();
      shimmer.setValue(0);
      setIsParsing(false);
      setStep("preview");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 600);
  };

  const handleSave = () => {
    if (!editTitle.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addTask({
      title: editTitle.trim(),
      note: editNote.trim() || undefined,
      dueDate: editDate.trim() || undefined,
      dueTime: editTime.trim() || undefined,
      courseName: editCourse.trim() || undefined,
      priority: editPriority,
      deliveryMethod: editDelivery,
    });
    handleClose();
  };

  const handleClose = () => {
    setStep("input");
    setInputText("");
    setParsed(null);
    onClose();
  };

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.zapBadge,
                { backgroundColor: colors.primary + "18" },
              ]}
            >
              <Feather name="zap" size={18} color={colors.primary} />
            </View>
            <View>
              <Text
                style={[
                  styles.title,
                  { color: colors.foreground, fontFamily: "Inter_700Bold" },
                ]}
              >
                Asistente inteligente
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                Describe la tarea en texto libre
              </Text>
            </View>
          </View>
          <Pressable onPress={handleClose} hitSlop={10}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {step === "input" ? (
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            {/* Examples */}
            <View
              style={[
                styles.examplesCard,
                { backgroundColor: colors.card, borderRadius: 16 },
              ]}
            >
              <Text
                style={[
                  styles.examplesTitle,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_500Medium",
                  },
                ]}
              >
                💡 Ejemplos
              </Text>
              {[
                "Entregar práctica 9 de Proyecto Integrador el viernes en el campus",
                "Tarea 1 de Clasificación Arancelaria para el 16 de agosto urgente",
                "Estudiar Física para el examen del martes a las 10am",
              ].map((ex, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    styles.exampleRow,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                  onPress={() => setInputText(ex)}
                >
                  <Text
                    style={[
                      styles.exampleText,
                      { color: colors.primary, fontFamily: "Inter_400Regular" },
                    ]}
                  >
                    "{ex}"
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Text input */}
            <TextInput
              style={[
                styles.bigInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: inputText ? colors.primary : colors.border,
                  borderRadius: 16,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              placeholder="Escribe aquí la tarea de manera natural. Incluye la materia, fecha, hora y cómo se entrega..."
              placeholderTextColor={colors.mutedForeground}
              value={inputText}
              onChangeText={setInputText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              autoFocus
              maxLength={500}
            />

            <Pressable
              style={({ pressed }) => [
                styles.parseBtn,
                {
                  backgroundColor: inputText.trim()
                    ? colors.primary
                    : colors.muted,
                  borderRadius: 16,
                  opacity: isParsing ? 0.8 : pressed ? 0.9 : 1,
                },
              ]}
              onPress={handleParse}
              disabled={isParsing || !inputText.trim()}
            >
              {isParsing ? (
                <Animated.View
                  style={[styles.parseBtnContent, { opacity: shimmerOpacity }]}
                >
                  <Feather name="zap" size={18} color="#FFF" />
                  <Text
                    style={[
                      styles.parseBtnText,
                      { fontFamily: "Inter_600SemiBold" },
                    ]}
                  >
                    Analizando...
                  </Text>
                </Animated.View>
              ) : (
                <View style={styles.parseBtnContent}>
                  <Feather
                    name="zap"
                    size={18}
                    color={inputText.trim() ? "#FFF" : colors.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.parseBtnText,
                      {
                        color: inputText.trim()
                          ? "#FFF"
                          : colors.mutedForeground,
                        fontFamily: "Inter_600SemiBold",
                      },
                    ]}
                  >
                    Analizar tarea
                  </Text>
                </View>
              )}
            </Pressable>
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[
                styles.successBanner,
                { backgroundColor: "#22C55E14", borderRadius: 14 },
              ]}
            >
              <Feather name="check-circle" size={16} color="#22C55E" />
              <Text
                style={[
                  styles.successText,
                  { color: "#22C55E", fontFamily: "Inter_500Medium" },
                ]}
              >
                ¡Tarea analizada! Revisa y edita si es necesario.
              </Text>
            </View>

            {/* Editable fields */}
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                },
              ]}
            >
              TÍTULO
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: 12,
                  fontFamily: "Inter_500Medium",
                },
              ]}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Título..."
              placeholderTextColor={colors.mutedForeground}
            />

            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  marginTop: 14,
                },
              ]}
            >
              MATERIA
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: 12,
                  fontFamily: "Inter_400Regular",
                },
              ]}
              value={editCourse}
              onChangeText={setEditCourse}
              placeholder="Nombre de la materia..."
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                      marginTop: 14,
                    },
                  ]}
                >
                  FECHA
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: 12,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                  value={editDate}
                  onChangeText={setEditDate}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.fieldLabel,
                    {
                      color: colors.mutedForeground,
                      fontFamily: "Inter_500Medium",
                      marginTop: 14,
                    },
                  ]}
                >
                  HORA
                </Text>
                <TextInput
                  style={[
                    styles.editInput,
                    {
                      color: colors.foreground,
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                      borderRadius: 12,
                      fontFamily: "Inter_400Regular",
                    },
                  ]}
                  value={editTime}
                  onChangeText={setEditTime}
                  placeholder="HH:MM"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            {/* Priority chips */}
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  marginTop: 14,
                },
              ]}
            >
              PRIORIDAD
            </Text>
            <View style={styles.chipRow}>
              {(["high", "medium", "low"] as Priority[]).map((p) => (
                <Pressable
                  key={p}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        editPriority === p
                          ? colors.primary + "18"
                          : colors.card,
                      borderColor:
                        editPriority === p ? colors.primary : colors.border,
                      borderRadius: 10,
                    },
                  ]}
                  onPress={() => {
                    setEditPriority(p);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          editPriority === p
                            ? colors.primary
                            : colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {PRIORITY_LABELS[p]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Delivery chips */}
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  marginTop: 14,
                },
              ]}
            >
              ENTREGA
            </Text>
            <View style={styles.chipRow}>
              {(["campus", "email", "class"] as DeliveryMethod[]).map((d) => (
                <Pressable
                  key={d!}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        editDelivery === d
                          ? colors.primary + "18"
                          : colors.card,
                      borderColor:
                        editDelivery === d ? colors.primary : colors.border,
                      borderRadius: 10,
                    },
                  ]}
                  onPress={() => {
                    setEditDelivery(editDelivery === d ? undefined : d);
                    Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      {
                        color:
                          editDelivery === d
                            ? colors.primary
                            : colors.mutedForeground,
                        fontFamily: "Inter_500Medium",
                      },
                    ]}
                  >
                    {DELIVERY_LABELS[d!]}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Note */}
            <Text
              style={[
                styles.fieldLabel,
                {
                  color: colors.mutedForeground,
                  fontFamily: "Inter_500Medium",
                  marginTop: 14,
                },
              ]}
            >
              NOTA (OPCIONAL)
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: colors.foreground,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderRadius: 12,
                  fontFamily: "Inter_400Regular",
                  minHeight: 72,
                  textAlignVertical: "top",
                },
              ]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Comentarios adicionales..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={3}
            />

            {/* Buttons */}
            <Pressable
              style={({ pressed }) => [
                styles.parseBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: 16,
                  marginTop: 20,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSave}
            >
              <View style={styles.parseBtnContent}>
                <Feather name="check" size={18} color="#FFF" />
                <Text
                  style={[
                    styles.parseBtnText,
                    { fontFamily: "Inter_600SemiBold" },
                  ]}
                >
                  Guardar tarea
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.backBtn,
                {
                  borderColor: colors.border,
                  borderRadius: 14,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
              onPress={() => setStep("input")}
            >
              <Feather
                name="arrow-left"
                size={16}
                color={colors.mutedForeground}
              />
              <Text
                style={[
                  styles.backBtnText,
                  {
                    color: colors.mutedForeground,
                    fontFamily: "Inter_400Regular",
                  },
                ]}
              >
                Volver a editar texto
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  zapBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18 },
  subtitle: { fontSize: 12, marginTop: 1 },
  body: { padding: 20, gap: 12 },
  examplesCard: { padding: 16, gap: 8 },
  examplesTitle: { fontSize: 12, letterSpacing: 0.5, marginBottom: 4 },
  exampleRow: { paddingVertical: 4 },
  exampleText: { fontSize: 13, lineHeight: 18 },
  bigInput: {
    fontSize: 15,
    lineHeight: 22,
    padding: 16,
    borderWidth: 1.5,
    minHeight: 120,
  },
  parseBtn: { height: 54, alignItems: "center", justifyContent: "center" },
  parseBtnContent: { flexDirection: "row", alignItems: "center", gap: 8 },
  parseBtnText: { fontSize: 16, color: "#FFF" },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  successText: { fontSize: 13, flex: 1 },
  fieldLabel: { fontSize: 11, letterSpacing: 0.8, marginBottom: 6 },
  editInput: { fontSize: 15, padding: 12, borderWidth: 1 },
  twoCol: { flexDirection: "row", gap: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  chipText: { fontSize: 13 },
  backBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
  },
  backBtnText: { fontSize: 14 },
});
