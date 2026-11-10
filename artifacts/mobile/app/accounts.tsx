import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { useTasks } from '@/context/TasksContext';
import { useAcademic } from '@/context/AcademicContext';
import { useGrades } from '@/context/GradesContext';
import { AppHeader } from '@/components/common/AppHeader';
import { KeyboardAwareScrollViewCompat } from '@/components/common/KeyboardAwareScrollViewCompat';
import { SaveCampusAccountPrompt } from '@/components/auth/SaveCampusAccountPrompt';
import {
  isCampusCredentialStorageAvailable,
  loadCampusCredentials,
  loadSavedCampusAccounts,
  removeSavedCampusAccount,
  type SavedCampusAccount,
} from '@/utils/campusCredentialVault';

type ConfirmAction =
  | { type: 'logout' }
  | { type: 'remove'; account: SavedCampusAccount }
  | null;

function getInitial(label: string) {
  return label.trim().charAt(0).toUpperCase() || 'N';
}

export default function AccountsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { username, userFullname, login, logout } = useAuth();
  const { clearUniversityTasks } = useTasks();
  const { clearCampusData } = useAcademic();
  const { logoutSii } = useGrades();

  const [accounts, setAccounts] = useState<SavedCampusAccount[]>([]);
  const [canSaveCredentials, setCanSaveCredentials] = useState(Platform.OS !== 'web');
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workingAccountId, setWorkingAccountId] = useState<string | null>(null);
  const [consentVisible, setConsentVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  const currentName = userFullname?.trim() || username || 'Cuenta actual';
  const currentSavedAccount = useMemo(
    () => accounts.find(account => account.username.toLowerCase() === username?.toLowerCase()),
    [accounts, username],
  );
  const otherAccounts = useMemo(
    () => accounts.filter(account => account.username.toLowerCase() !== username?.toLowerCase()),
    [accounts, username],
  );

  const refreshAccounts = async () => {
    setAccounts(await loadSavedCampusAccounts());
  };

  useEffect(() => {
    let active = true;
    Promise.all([loadSavedCampusAccounts(), isCampusCredentialStorageAvailable()])
      .then(([saved, storageAvailable]) => {
        if (!active) return;
        setAccounts(saved);
        setCanSaveCredentials(storageAvailable);
      })
      .catch(() => {
        if (active) setCanSaveCredentials(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const clearCampusAccountData = async () => {
    await Promise.allSettled([
      clearUniversityTasks(),
      clearCampusData(),
    ]);
  };

  const switchToAccount = async (account: SavedCampusAccount) => {
    if (isWorking) return;
    setScreenError(null);
    setWorkingAccountId(account.id);
    setIsWorking(true);
    const credentials = await loadCampusCredentials(account.id);
    if (!credentials) {
      setIsWorking(false);
      setWorkingAccountId(null);
      await refreshAccounts();
      setScreenError('No se encontró la contraseña segura de esta cuenta. Puedes quitarla y volver a iniciar sesión.');
      return;
    }

    const result = await login(credentials.username, credentials.password, false);
    if (!result.success) {
      setIsWorking(false);
      setWorkingAccountId(null);
      setScreenError(result.error ?? 'No se pudo cambiar de cuenta.');
      return;
    }

    await clearCampusAccountData();
    router.replace('/(tabs)');
  };

  const startAddingAccount = () => {
    if (!addUsername.trim() || !addPassword) {
      setAddError('Escribe el usuario y la contraseña del campus.');
      return;
    }
    setAddError(null);
    setConsentVisible(true);
  };

  const completeAddAccount = async (saveCredentials: boolean) => {
    if (!addUsername.trim() || !addPassword || isWorking) return;
    setConsentVisible(false);
    setIsWorking(true);
    const result = await login(addUsername.trim(), addPassword, saveCredentials);
    if (!result.success) {
      setIsWorking(false);
      setAddError(result.error ?? 'No se pudo iniciar sesión con esta cuenta.');
      return;
    }

    await clearCampusAccountData();
    setAddPassword('');
    setAddUsername('');
    setAddFormOpen(false);
    setIsWorking(false);
    await refreshAccounts();
    setScreenError(result.saveError ?? null);
  };

  const confirmPendingAction = async () => {
    if (!confirmAction || isWorking) return;
    const action = confirmAction;
    setConfirmAction(null);
    setIsWorking(true);

    if (action.type === 'remove') {
      try {
        await removeSavedCampusAccount(action.account.id);
        await refreshAccounts();
        setScreenError(null);
      } catch {
        setScreenError('No se pudo quitar la cuenta guardada.');
      }
      setIsWorking(false);
      return;
    }

    await clearCampusAccountData();
    await logoutSii();
    logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Tus cuentas"
        subtitle="Cambia de cuenta o agrega una nueva"
        onBack={() => router.back()}
        showAvatar={false}
      />

      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        <View style={[styles.currentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.currentAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.currentInitial, { color: colors.primaryForeground, fontFamily: 'Inter_700Bold' }]}>
              {getInitial(currentName)}
            </Text>
          </View>
          <View style={styles.currentInfo}>
            <Text style={[styles.currentName, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]} numberOfLines={1}>
              {currentName}
            </Text>
            <Text style={[styles.currentUsername, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
              {username || 'Sesión activa'}
            </Text>
            <View style={[styles.activeBadge, { backgroundColor: colors.success + '18' }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.activeText, { color: colors.success, fontFamily: 'Inter_600SemiBold' }]}>
                Cuenta actual
              </Text>
            </View>
          </View>
          <Feather name="chevron-up" size={21} color={colors.mutedForeground} />
        </View>

        {currentSavedAccount ? (
          <View style={styles.savedInfoRow}>
            <Text style={[styles.savedNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Esta cuenta está guardada de forma cifrada en este dispositivo.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dejar de guardar esta cuenta"
              onPress={() => setConfirmAction({ type: 'remove', account: currentSavedAccount })}
              hitSlop={8}
            >
              <Text style={[styles.removeCurrentText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
                Quitar
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.savedNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            Esta cuenta no está guardada. Puedes guardarla la próxima vez que inicies sesión.
          </Text>
        )}

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
            Cuentas guardadas
          </Text>
          <Text style={[styles.sectionCount, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>
            {accounts.length}
          </Text>
        </View>

        {otherAccounts.length === 0 && !addFormOpen ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={20} color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Aún no hay otras cuentas guardadas. Agrega una para cambiar de perfil rápidamente.
            </Text>
          </View>
        ) : null}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.accountGrid}
          keyboardShouldPersistTaps="handled"
        >
          {otherAccounts.map(account => (
            <View key={account.id} style={styles.accountTileWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Cambiar a ${account.displayName}`}
                testID={`switch-account-${account.id}`}
                disabled={isWorking}
                onPress={() => switchToAccount(account)}
                style={({ pressed }) => [
                  styles.accountTile,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed || isWorking ? 0.76 : 1 },
                ]}
              >
                {workingAccountId === account.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <View style={[styles.accountAvatar, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.accountInitial, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>
                      {getInitial(account.displayName)}
                    </Text>
                  </View>
                )}
                <Text style={[styles.accountName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>
                  {account.displayName}
                </Text>
                <Text style={[styles.accountUsername, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
                  {account.username}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Quitar cuenta ${account.displayName}`}
                disabled={isWorking}
                onPress={() => setConfirmAction({ type: 'remove', account })}
                style={[styles.removeButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                hitSlop={6}
              >
                <Feather name="x" size={14} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Agregar cuenta del campus"
            testID="add-campus-account"
            onPress={() => { setAddFormOpen(open => !open); setAddError(null); }}
            disabled={isWorking}
            style={({ pressed }) => [
              styles.addTile,
              { backgroundColor: colors.secondary, borderColor: colors.border, opacity: pressed ? 0.76 : 1 },
            ]}
          >
            <View style={[styles.addIcon, { backgroundColor: colors.card }]}>
              <Feather name={addFormOpen ? 'x' : 'plus'} size={22} color={colors.primary} />
            </View>
            <Text style={[styles.accountName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              {addFormOpen ? 'Cancelar' : 'Agregar cuenta'}
            </Text>
          </Pressable>
        </ScrollView>

        {addFormOpen ? (
          <View style={[styles.addForm, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>
              Iniciar sesión con otra cuenta
            </Text>
            <TextInput
              value={addUsername}
              onChangeText={value => { setAddUsername(value); setAddError(null); }}
              placeholder="Usuario del campus"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isWorking}
              returnKeyType="next"
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderColor: colors.border }]}
            />
            <View style={[styles.passwordInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <TextInput
                value={addPassword}
                onChangeText={value => { setAddPassword(value); setAddError(null); }}
                placeholder="Contraseña"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!isWorking}
                returnKeyType="go"
                onSubmitEditing={startAddingAccount}
                style={[styles.passwordTextInput, { color: colors.foreground }]}
              />
              <Pressable onPress={() => setShowPassword(value => !value)} hitSlop={10}>
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={17} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {addError ? (
              <Text style={[styles.formError, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>{addError}</Text>
            ) : null}
            <Text style={[styles.formHint, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              Antes de iniciar sesión podrás elegir si quieres guardar esta cuenta.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={startAddingAccount}
              disabled={isWorking}
              testID="submit-add-campus-account"
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: colors.primary, opacity: pressed || isWorking ? 0.8 : 1 },
              ]}
            >
              {isWorking ? <ActivityIndicator color={colors.primaryForeground} /> : <Feather name="log-in" size={16} color={colors.primaryForeground} />}
              <Text style={[styles.primaryButtonText, { color: colors.primaryForeground, fontFamily: 'Inter_600SemiBold' }]}>
                {isWorking ? 'Iniciando sesión…' : 'Continuar'}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {screenError ? (
          <View style={[styles.errorCard, { backgroundColor: colors.destructive + '12' }]}>
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>{screenError}</Text>
          </View>
        ) : null}

        {!canSaveCredentials ? (
          <Text style={[styles.webNote, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            El almacenamiento seguro no está disponible; las contraseñas no se guardarán en este dispositivo.
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          testID="account-logout"
          disabled={isWorking}
          onPress={() => setConfirmAction({ type: 'logout' })}
          style={({ pressed }) => [
            styles.logoutButton,
            { backgroundColor: colors.destructive + '10', borderColor: colors.destructive + '30', opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Feather name="log-out" size={17} color={colors.destructive} />
          <Text style={[styles.logoutText, { color: colors.destructive, fontFamily: 'Inter_600SemiBold' }]}>
            Cerrar sesión
          </Text>
        </Pressable>
      </KeyboardAwareScrollViewCompat>

      <SaveCampusAccountPrompt
        visible={consentVisible}
        canSave={canSaveCredentials}
        username={addUsername.trim()}
        onSave={() => completeAddAccount(true)}
        onContinueWithoutSaving={() => completeAddAccount(false)}
        onCancel={() => setConsentVisible(false)}
      />

      <Modal
        visible={!!confirmAction}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmAction(null)}
      >
        <View style={styles.confirmBackdrop}>
          <View style={[styles.confirmCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.confirmIcon, { backgroundColor: colors.destructive + '14' }]}>
              <Feather name={confirmAction?.type === 'remove' ? 'trash-2' : 'log-out'} size={20} color={colors.destructive} />
            </View>
            <Text style={[styles.confirmTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>
              {confirmAction?.type === 'remove' ? '¿Quitar cuenta guardada?' : '¿Cerrar sesión?'}
            </Text>
            <Text style={[styles.confirmDescription, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
              {confirmAction?.type === 'remove'
                ? `Se eliminará la contraseña cifrada de ${confirmAction.account.displayName} de este dispositivo.`
                : 'Tus cuentas guardadas permanecerán disponibles para el próximo inicio de sesión.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={confirmPendingAction}
              style={({ pressed }) => [styles.confirmButton, { backgroundColor: colors.destructive, opacity: pressed ? 0.84 : 1 }]}
            >
              <Text style={[styles.confirmButtonText, { color: colors.destructiveForeground, fontFamily: 'Inter_600SemiBold' }]}>
                {confirmAction?.type === 'remove' ? 'Quitar cuenta' : 'Cerrar sesión'}
              </Text>
            </Pressable>
            <Pressable onPress={() => setConfirmAction(null)} style={styles.cancelButton} hitSlop={10}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground, fontFamily: 'Inter_500Medium' }]}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 18 },
  currentCard: {
    minHeight: 136,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 14,
  },
  currentAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  currentInitial: { fontSize: 32 },
  currentInfo: { flex: 1, minWidth: 0, gap: 3 },
  currentName: { fontSize: 19 },
  currentUsername: { fontSize: 13 },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginTop: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontSize: 10 },
  savedInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -10, marginHorizontal: 3 },
  savedNote: { flex: 1, fontSize: 11, lineHeight: 16 },
  removeCurrentText: { fontSize: 11 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 16 },
  sectionCount: { fontSize: 11 },
  emptyCard: { minHeight: 74, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 15, gap: 11 },
  emptyText: { flex: 1, fontSize: 12, lineHeight: 18 },
  accountGrid: { flexDirection: 'row', gap: 10, paddingVertical: 2 },
  accountTileWrap: { width: 112, position: 'relative' },
  accountTile: { minHeight: 122, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 16, paddingHorizontal: 8, paddingVertical: 12, gap: 6 },
  accountAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accountInitial: { fontSize: 21 },
  accountName: { maxWidth: '100%', fontSize: 11, textAlign: 'center' },
  accountUsername: { maxWidth: '100%', fontSize: 9, textAlign: 'center' },
  removeButton: { position: 'absolute', top: 5, right: 5, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1 },
  addTile: { width: 112, minHeight: 122, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 16, padding: 9, gap: 9 },
  addIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  addForm: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 11 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, fontSize: 14 },
  passwordInput: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 13, paddingHorizontal: 13, gap: 10 },
  passwordTextInput: { flex: 1, minHeight: 46, fontSize: 14 },
  formError: { fontSize: 12 },
  formHint: { fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 13, gap: 8 },
  primaryButtonText: { fontSize: 14 },
  errorCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 13, gap: 8 },
  errorText: { flex: 1, fontSize: 12, lineHeight: 17 },
  webNote: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginHorizontal: 5 },
  logoutButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 15, gap: 9, marginTop: 2 },
  logoutText: { fontSize: 14 },
  confirmBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22, backgroundColor: '#19162299' },
  confirmCard: { width: '100%', maxWidth: 390, alignItems: 'center', borderWidth: 1, borderRadius: 22, padding: 22 },
  confirmIcon: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 15, marginBottom: 13 },
  confirmTitle: { fontSize: 19, textAlign: 'center' },
  confirmDescription: { fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 9, marginBottom: 18 },
  confirmButton: { width: '100%', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  confirmButtonText: { fontSize: 13 },
  cancelButton: { paddingVertical: 11, paddingHorizontal: 18, marginTop: 3 },
  cancelText: { fontSize: 12 },
});
