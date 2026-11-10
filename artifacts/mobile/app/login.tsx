import React, { useEffect, useState, useRef } from 'react';
import {
  Alert,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { BrandMark } from '@/components/BrandMark';
import { displayFontFamily } from '@/theme/typography';
import { KeyboardAwareScrollViewCompat } from '@/components/common/KeyboardAwareScrollViewCompat';
import { SaveCampusAccountPrompt } from '@/components/auth/SaveCampusAccountPrompt';
import {
  isCampusCredentialStorageAvailable,
  loadCampusCredentials,
  loadSavedCampusAccounts,
  type SavedCampusAccount,
} from '@/utils/campusCredentialVault';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [savedAccounts, setSavedAccounts] = useState<SavedCampusAccount[]>([]);
  const [canSaveCredentials, setCanSaveCredentials] = useState(Platform.OS !== 'web');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    let active = true;
    Promise.all([loadSavedCampusAccounts(), isCampusCredentialStorageAvailable()])
      .then(([accounts, storageAvailable]) => {
        if (!active) return;
        setSavedAccounts(accounts);
        setCanSaveCredentials(storageAvailable);
      })
      .catch(() => {
        if (active) setCanSaveCredentials(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const startLogin = () => {
    if (!username.trim() || !password) {
      setError('Ingresa tu usuario y contraseña');
      return;
    }
    setError(null);
    setConsentVisible(true);
  };

  const completeLogin = async (saveCredentials: boolean) => {
    if (!username.trim() || !password) return;
    setConsentVisible(false);
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await login(username.trim(), password, saveCredentials);
    setIsLoading(false);

    if (!result.success) {
      setError(result.error ?? 'Error desconocido');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (result.saveError) Alert.alert('Cuenta iniciada', result.saveError);
    }
  };

  const loginWithSavedAccount = async (account: SavedCampusAccount) => {
    if (isLoading) return;
    setError(null);
    setIsLoading(true);
    const credentials = await loadCampusCredentials(account.id);
    if (!credentials) {
      setIsLoading(false);
      setSavedAccounts(await loadSavedCampusAccounts());
      setError('No se pudo abrir esta cuenta guardada. Inicia sesión de nuevo.');
      return;
    }

    const result = await login(credentials.username, credentials.password, false);
    setIsLoading(false);
    if (!result.success) {
      setError(result.error ?? 'No se pudo iniciar sesión con esta cuenta.');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <KeyboardAwareScrollViewCompat
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.inner,
        { paddingTop: topPad + 24, paddingBottom: bottomPad + 24 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bottomOffset={24}
    >
        {/* Brand header */}
        <View style={styles.brandArea}>
          <BrandMark size={64} />
          <Text
            style={[
              styles.appTitle,
              { color: colors.foreground, fontFamily: displayFontFamily },
            ]}
          >
            Nuvo<Text style={{ color: colors.primary }}>.</Text>
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

        {savedAccounts.length > 0 ? (
          <View style={styles.savedSection}>
            <Text style={[styles.savedLabel, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>
              CUENTAS GUARDADAS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.savedAccountsRow}
              keyboardShouldPersistTaps="handled"
            >
              {savedAccounts.map(account => (
                <Pressable
                  key={account.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Iniciar sesión como ${account.displayName}`}
                  testID={`saved-account-${account.id}`}
                  disabled={isLoading}
                  onPress={() => loginWithSavedAccount(account)}
                  style={({ pressed }) => [
                    styles.savedAccountCard,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || isLoading ? 0.75 : 1 },
                  ]}
                >
                  <View style={[styles.savedAvatar, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.savedInitial, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                      {(account.displayName || account.username).trim().charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.savedName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                    {account.displayName}
                  </Text>
                  <Text style={[styles.savedUsername, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                    {account.username}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar otra cuenta"
                onPress={() => usernameRef.current?.focus()}
                style={({ pressed }) => [
                  styles.addAccountCard,
                  { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <View style={[styles.addAccountIcon, { backgroundColor: colors.card }]}>
                  <Feather name="plus" size={21} color={colors.primary} />
                </View>
                <Text style={[styles.savedName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                  Agregar cuenta
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        ) : null}

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
              ref={usernameRef}
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
              onSubmitEditing={startLogin}
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
            onPress={startLogin}
            disabled={isLoading}
            testID="campus-login-submit"
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
        <SaveCampusAccountPrompt
          visible={consentVisible}
          canSave={canSaveCredentials}
          username={username.trim()}
          onSave={() => completeLogin(true)}
          onContinueWithoutSaving={() => completeLogin(false)}
          onCancel={() => setConsentVisible(false)}
        />
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flexGrow: 1,
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
    fontSize: 31,
    lineHeight: 37,
    letterSpacing: -0.8,
  },
  appSubtitle: {
    fontSize: 14,
  },
  savedSection: { gap: 9, marginBottom: 2 },
  savedLabel: { fontSize: 10, letterSpacing: 1, marginLeft: 2 },
  savedAccountsRow: { gap: 9, paddingVertical: 2 },
  savedAccountCard: {
    width: 112,
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 5,
  },
  savedAvatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  savedInitial: { fontSize: 19 },
  savedName: { maxWidth: '100%', fontSize: 11, textAlign: 'center' },
  savedUsername: { maxWidth: '100%', fontSize: 9, textAlign: 'center' },
  addAccountCard: {
    width: 112,
    minHeight: 116,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    gap: 9,
  },
  addAccountIcon: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
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
