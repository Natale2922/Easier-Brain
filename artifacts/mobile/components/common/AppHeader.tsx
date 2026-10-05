import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { BrandLockup } from '@/components/BrandMark';
import { displayFontFamily } from '@/theme/typography';

export function AppHeader({
  title,
  subtitle,
  actions,
  onMenu,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenu?: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userFullname } = useAuth();
  const firstName = userFullname?.trim().charAt(0).toUpperCase() || 'N';
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.wrapper, { paddingTop: topInset + 12, backgroundColor: colors.background }]}>
      <View style={styles.topRow}>
        <View style={styles.brandAndMenu}>
          <Pressable
            onPress={onMenu ?? (() => router.push('/(tabs)' as any))}
            style={({ pressed }) => [styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
            accessibilityLabel="Abrir menú"
          >
            <Feather name="menu" size={19} color={colors.foreground} />
          </Pressable>
          <BrandLockup size={30} />
        </View>
        <View style={styles.rightActions}>
          {actions}
          <View style={[styles.avatar, { backgroundColor: colors.secondary, borderColor: colors.primary + '35' }]}>
            <Text style={[styles.avatarText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{firstName}</Text>
          </View>
        </View>
      </View>
      <View style={styles.titleBlock}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: displayFontFamily }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function HeaderAction({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  label?: string;
  onPress?: () => void;
  active?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: active ? colors.secondary : colors.card, borderColor: active ? colors.primary + '35' : colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Feather name={icon} size={17} color={active ? colors.primary : colors.foreground} />
      {label ? <Text style={[styles.actionLabel, { color: active ? colors.primary : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingHorizontal: 20, paddingBottom: 16 },
  topRow: { height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandAndMenu: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  iconButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14 },
  titleBlock: { marginTop: 19 },
  title: { fontSize: 30, letterSpacing: -0.9, lineHeight: 36 },
  subtitle: { fontSize: 13, marginTop: 5 },
  actionButton: { minHeight: 40, minWidth: 40, borderRadius: 13, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 11 },
  actionLabel: { fontSize: 12 },
});