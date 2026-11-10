import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  visible: boolean;
  canSave: boolean;
  username?: string | null;
  title?: string;
  description?: string;
  saveLabel?: string;
  continueLabel?: string;
  onSave: () => void;
  onContinueWithoutSaving: () => void;
  onCancel?: () => void;
}

export function SaveCampusAccountPrompt({
  visible,
  canSave,
  username,
  title = '¿Guardar esta cuenta?',
  description,
  saveLabel = 'Guardar cuenta',
  continueLabel = 'Solo iniciar sesión',
  onSave,
  onContinueWithoutSaving,
  onCancel,
}: Props) {
  const colors = useColors();
  const body = description ?? (
    canSave
      ? 'La contraseña se guardará cifrada en este dispositivo para facilitar el cambio de cuenta y renovar la sesión del campus.'
      : 'No está disponible el almacenamiento seguro en este dispositivo. Puedes continuar sin guardar la cuenta.'
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel ?? onContinueWithoutSaving}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.icon, { backgroundColor: colors.secondary }]}>
            <Feather name="shield" size={21} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          {username ? (
            <Text style={[styles.username, { color: colors.primary }]} numberOfLines={1}>
              {username}
            </Text>
          ) : null}
          <Text style={[styles.description, { color: colors.mutedForeground }]}>{body}</Text>

          {canSave ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSave}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed ? 0.86 : 1 },
              ]}
            >
              <Feather name="lock" size={15} color={colors.primaryForeground} />
              <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{saveLabel}</Text>
            </Pressable>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onContinueWithoutSaving}
            style={({ pressed }) => [
              styles.secondaryButton,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.78 : 1 },
            ]}
          >
            <Text style={[styles.secondaryText, { color: colors.foreground }]}>{continueLabel}</Text>
          </Pressable>

          {onCancel ? (
            <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10} style={styles.cancelButton}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Volver</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: '#19162299',
  },
  card: {
    width: '100%',
    maxWidth: 390,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 21, fontWeight: '700', textAlign: 'center' },
  username: { fontSize: 13, fontWeight: '600', marginTop: 5 },
  description: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 11, marginBottom: 18 },
  primaryButton: {
    minHeight: 48,
    width: '100%',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryText: { fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    minHeight: 46,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    marginTop: 9,
  },
  secondaryText: { fontSize: 13, fontWeight: '600' },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 18, marginTop: 2 },
  cancelText: { fontSize: 12, fontWeight: '500' },
});
