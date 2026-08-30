import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { BrandMark } from '@/components/BrandMark';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordRef = useRef<TextInput>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña');
      return;
    }

    setError(null);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await login(username.trim(), password);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Error desconocido');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View
        style={[
          styles.inner,
          { paddingTop: topPad + 32, paddingBottom: bottomPad + 24 },
        ]}
      >
        {/* Brand header */}
        <View style={styles.brandArea}>
          <BrandMark size={64} />
          <Text
            style={[
              styles.appTitle,
              { color: colors.foreground, fontFamily: 'Inter_700Bold' },
            ]}
          >
            Mis Tareas
          </Text>
          <Text
            style={[
              styles.appSubtitle,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Campus Virtual · UTXicotepec
          </Text>
        </View>

        {/* Form card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              borderRadius: colors.radius + 4,
            },
          ]}
        >
          <Text
            style={[
              styles.formTitle,
              { color: colors.foreground, fontFamily: 'Inter_600SemiBold' },
            ]}
          >
            Iniciar sesión
          </Text>
          <Text
            style={[
              styles.formSubtitle,
              { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
            ]}
          >
            Usa tus credenciales del campus virtual
          </Text>

          {/* Username */}
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="user" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[
                styles.input,
                { color: colors.foreground, fontFamily: 'Inter_400Regular' },
              ]}
              placeholder="Usuario"
              placeholderTextColor={colors.mutedForeground}
              value={username}
              onChangeText={v => { setUsername(v); setError(null); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderRadius: colors.radius,
              },
            ]}
          >
            <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              style={[
                styles.input,
                { color: colors.foreground, fontFamily: 'Inter_400Regular' },
              ]}
              placeholder="Contraseña"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={v => { setPassword(v); setError(null); }}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!isLoading}
            />
            <Pressable
              onPress={() => setShowPassword(p => !p)}
              hitSlop={8}
              style={styles.eyeBtn}
            >
              <Feather
                name={showPassword ? 'eye-off' : 'eye'}
                size={16}
                color={colors.mutedForeground}
              />
            </Pressable>
          </View>

          {/* Error */}
          {error ? (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.destructive + '14',
                  borderRadius: colors.radius,
                },
              ]}
            >
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text
                style={[
                  styles.errorText,
                  { color: colors.destructive, fontFamily: 'Inter_500Medium' },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          {/* Login button */}
          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              {
                backgroundColor: isLoading
                  ? colors.muted
                  : pressed
                  ? colors.primary + 'DD'
                  : colors.primary,
                borderRadius: colors.radius,
                opacity: pressed && !isLoading ? 0.9 : 1,
              },
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text
                style={[
                  styles.loginBtnText,
                  { fontFamily: 'Inter_600SemiBold' },
                ]}
              >
                Entrar
              </Text>
            )}
          </Pressable>
        </View>

        <Text
          style={[
            styles.hint,
            { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' },
          ]}
        >
          Tus tareas se sincronizarán automáticamente
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 20,
  },
  brandArea: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  iconBadge: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appTitle: {
    fontSize: 28,
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
  },
  card: {
    padding: 24,
    borderWidth: 1,
    gap: 14,
  },
  formTitle: {
    fontSize: 18,
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 13,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    height: 48,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  loginBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  loginBtnText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  hint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
