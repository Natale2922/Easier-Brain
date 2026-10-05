import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { AppHeader, HeaderAction } from '@/components/common/AppHeader';
import { useGrades } from '@/context/GradesContext';
import { formatGrade, type AcademicPeriod, type Subject } from '@/utils/siiGrades';

function formatUpdated(value: string | null) {
  if (!value) return 'Aún no sincronizado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Última actualización no disponible';
  return `Actualizado ${date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function GradesScreen() {
  const colors = useColors();
  const {
    snapshot,
    summary,
    isLoading,
    isSyncing,
    error,
    lastUpdatedAt,
    siiUsername,
    isSiiAuthenticated,
    loginSii,
    logoutSii,
    syncGrades,
  } = useGrades();
  const [view, setView] = useState<'grades' | 'history'>('grades');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (siiUsername) setUsername(siiUsername);
  }, [siiUsername]);

  const handleSiiLogin = async () => {
    if (await loginSii(username, password)) {
      setPassword('');
      setShowPassword(false);
    }
  };
  const handleSiiLogout = async () => {
    await logoutSii();
    setUsername('');
    setPassword('');
    setShowPassword(false);
    setSelectedPeriodId(null);
    setExpandedId(null);
  };

  const periods = snapshot?.periods ?? [];
  const selectedPeriod = useMemo<AcademicPeriod | null>(() => {
    if (!periods.length) return null;
    return periods.find(period => period.id === selectedPeriodId) ?? periods[0];
  }, [periods, selectedPeriodId]);

  const selectPeriod = (id: string) => {
    setSelectedPeriodId(id);
    setView('grades');
    setExpandedId(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Calificaciones"
        subtitle="Tu historial académico del SII, organizado por cuatrimestre."
        actions={isSiiAuthenticated ? (
          <View style={styles.headerActions}>
            <HeaderAction
              icon="refresh-cw"
              label={isSyncing ? 'Actualizando' : 'Actualizar'}
              active={isSyncing}
              onPress={syncGrades}
            />
            <HeaderAction icon="log-out" label="Salir" onPress={handleSiiLogout} />
          </View>
        ) : undefined}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ActivityIndicator color={colors.primary} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Conectando con el SII...</Text>
          </View>
        ) : !isSiiAuthenticated ? (
          <SiiLoginPanel
            username={username}
            password={password}
            showPassword={showPassword}
            isSyncing={isSyncing}
            error={error}
            onUsername={value => setUsername(value)}
            onPassword={value => setPassword(value)}
            onTogglePassword={() => setShowPassword(value => !value)}
            onSubmit={handleSiiLogin}
          />
        ) : (
          <>
        <View style={[styles.sourceRow, { backgroundColor: colors.secondary, borderColor: colors.primary + '22' }]}>
          <View style={[styles.sourceIcon, { backgroundColor: colors.primary }]}>
            <Feather name="shield" size={15} color="#FFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sourceTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Conectado al SII UTXJ</Text>
            <Text style={[styles.sourceText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{formatUpdated(lastUpdatedAt)}</Text>
          </View>
          <View style={[styles.liveDot, { backgroundColor: isSyncing ? colors.warning : colors.success }]} />
        </View>

        <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroEyebrow}>PROMEDIO ACUMULADO</Text>
              <Text style={[styles.heroValue, { fontFamily: 'Inter_700Bold' }]}>{formatGrade(summary.accumulatedAverage)}</Text>
            </View>
            <View style={styles.heroBadge}>
              <Feather name="trending-up" size={16} color="#FFF" />
              <Text style={[styles.heroBadgeText, { fontFamily: 'Inter_600SemiBold' }]}>
                {summary.completedSubjects ? `${summary.completedSubjects} materias` : 'Sin datos'}
              </Text>
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaLabel}>Carrera</Text>
              <Text style={[styles.heroMetaValue, { fontFamily: 'Inter_600SemiBold' }]}>{snapshot?.student.career ?? 'No disponible'}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaLabel}>Grupo</Text>
              <Text style={[styles.heroMetaValue, { fontFamily: 'Inter_600SemiBold' }]}>{snapshot?.student.group ?? 'No disponible'}</Text>
            </View>
            <View style={styles.heroMeta}>
              <Text style={styles.heroMetaLabel}>Generación</Text>
              <Text style={[styles.heroMetaValue, { fontFamily: 'Inter_600SemiBold' }]}>{snapshot?.student.generation ?? 'No disponible'}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.segment, { backgroundColor: colors.muted }]}>
          <Pressable onPress={() => setView('grades')} style={[styles.segmentItem, view === 'grades' && { backgroundColor: colors.card, shadowColor: '#000' }]}>
            <Feather name="bar-chart-2" size={15} color={view === 'grades' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: view === 'grades' ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Calificaciones</Text>
          </Pressable>
          <Pressable onPress={() => setView('history')} style={[styles.segmentItem, view === 'history' && { backgroundColor: colors.card, shadowColor: '#000' }]}>
            <Feather name="clock" size={15} color={view === 'history' ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.segmentText, { color: view === 'history' ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>Historial</Text>
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.messageCard, { backgroundColor: colors.card, borderColor: colors.destructive + '55' }]}>
            <Feather name="alert-circle" size={20} color={colors.destructive} />
            <Text style={[styles.messageText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>{error}</Text>
          </View>
        ) : null}

        {!snapshot || !periods.length ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
              <Feather name="book-open" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Aún no hay calificaciones</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Actualiza para consultar tus cuatrimestres directamente del SII.</Text>
            <Pressable onPress={syncGrades} disabled={isSyncing} style={[styles.primaryButton, { backgroundColor: colors.primary }]}>
              {isSyncing ? <ActivityIndicator color="#FFF" size="small" /> : <Feather name="refresh-cw" size={16} color="#FFF" />}
              <Text style={[styles.primaryButtonText, { fontFamily: 'Inter_600SemiBold' }]}>{isSyncing ? 'Consultando SII...' : 'Consultar calificaciones'}</Text>
            </Pressable>
          </View>
        ) : view === 'history' ? (
          <HistoryList periods={periods} colors={colors} onSelect={selectPeriod} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.periodTabs}>
              {periods.map(period => (
                <Pressable key={period.id} onPress={() => selectPeriod(period.id)} style={[styles.periodTab, { backgroundColor: selectedPeriod?.id === period.id ? colors.primary : colors.card, borderColor: selectedPeriod?.id === period.id ? colors.primary : colors.border }]}>
                  <Text style={[styles.periodTabText, { color: selectedPeriod?.id === period.id ? '#FFF' : colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{period.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
            {selectedPeriod ? (
              <View style={styles.periodBlock}>
                <View style={styles.periodHeading}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{selectedPeriod.label}</Text>
                    <Text style={[styles.sectionCaption, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{selectedPeriod.subjects.length} materias · promedio {formatGrade(selectedPeriod.average)}</Text>
                  </View>
                  <View style={[styles.periodAverage, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.periodAverageText, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatGrade(selectedPeriod.average)}</Text>
                  </View>
                </View>
                {selectedPeriod.subjects.map(subject => (
                  <SubjectCard
                    key={subject.id}
                    subject={subject}
                    colors={colors}
                    expanded={expandedId === subject.id}
                    onPress={() => setExpandedId(expandedId === subject.id ? null : subject.id)}
                  />
                ))}
              </View>
            ) : null}
          </>
        )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SiiLoginPanel({
  username,
  password,
  showPassword,
  isSyncing,
  error,
  onUsername,
  onPassword,
  onTogglePassword,
  onSubmit,
}: {
  username: string;
  password: string;
  showPassword: boolean;
  isSyncing: boolean;
  error: string | null;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: () => void;
}) {
  const colors = useColors();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.loginCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.loginIcon, { backgroundColor: colors.secondary }]}>
          <Feather name="award" size={23} color={colors.primary} />
        </View>
        <Text style={[styles.loginTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Entra al SII</Text>
        <Text style={[styles.loginSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
          Usa tu cuenta del Sistema Integral de Información para consultar y sincronizar tus calificaciones.
        </Text>

        <View style={[styles.loginInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="user" size={16} color={colors.mutedForeground} />
          <TextInput
            value={username}
            onChangeText={onUsername}
            placeholder="Usuario del SII"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            editable={!isSyncing}
            style={[styles.loginInputText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
            accessibilityLabel="Usuario del SII"
          />
        </View>
        <View style={[styles.loginInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Feather name="lock" size={16} color={colors.mutedForeground} />
          <TextInput
            value={password}
            onChangeText={onPassword}
            placeholder="Contraseña del SII"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            editable={!isSyncing}
            style={[styles.loginInputText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}
            accessibilityLabel="Contraseña del SII"
          />
          <Pressable onPress={onTogglePassword} hitSlop={8} accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.loginError, { backgroundColor: colors.destructive + '12' }]}>
            <Feather name="alert-circle" size={15} color={colors.destructive} />
            <Text style={[styles.loginErrorText, { color: colors.destructive, fontFamily: 'Inter_500Medium' }]}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={isSyncing || !username.trim() || !password}
          style={({ pressed }) => [
            styles.loginButton,
            { backgroundColor: colors.primary, opacity: isSyncing ? 0.72 : pressed ? 0.85 : (!username.trim() || !password ? 0.55 : 1) },
          ]}
        >
          {isSyncing ? <ActivityIndicator size="small" color="#FFF" /> : <Feather name="log-in" size={17} color="#FFF" />}
          <Text style={[styles.loginButtonText, { fontFamily: 'Inter_600SemiBold' }]}>{isSyncing ? 'Validando y leyendo calificaciones…' : 'Iniciar sesión y sincronizar'}</Text>
        </Pressable>
        <View style={[styles.securityNotice, { backgroundColor: colors.warning + '16' }]}>
          <Feather name="alert-triangle" size={14} color={colors.warning} />
          <Text style={[styles.securityNoticeText, { color: colors.foreground, fontFamily: 'Inter_400Regular' }]}>
            El portal oficial del SII sólo está disponible por HTTP sin cifrado. Evita iniciar sesión desde redes públicas.
          </Text>
        </View>
        <View style={styles.privacyHint}>
          <Feather name="shield" size={14} color={colors.success} />
          <Text style={[styles.privacyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>
            El acceso del SII es independiente del Campus Virtual. En el dispositivo se conserva de forma segura para futuras sincronizaciones.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function HistoryList({ periods, colors, onSelect }: { periods: AcademicPeriod[]; colors: ReturnType<typeof useColors>; onSelect: (id: string) => void }) {
  return (
    <View style={styles.historyList}>
      {periods.map((period, index) => (
        <Pressable key={period.id} onPress={() => onSelect(period.id)} style={({ pressed }) => [styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
          <View style={[styles.historyIndex, { backgroundColor: index === 0 ? colors.primary : colors.secondary }]}>
            <Text style={[styles.historyIndexText, { color: index === 0 ? '#FFF' : colors.primary, fontFamily: 'Inter_700Bold' }]}>{String(periods.length - index).padStart(2, '0')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.historyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{period.label}</Text>
            <Text style={[styles.historyMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{period.subjects.length} materias · {period.year ?? 'Año no disponible'}</Text>
          </View>
          <Text style={[styles.historyAverage, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{formatGrade(period.average)}</Text>
          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
        </Pressable>
      ))}
    </View>
  );
}

function SubjectCard({ subject, colors, expanded, onPress }: { subject: Subject; colors: ReturnType<typeof useColors>; expanded: boolean; onPress: () => void }) {
  return (
    <View style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.subjectHeader, { opacity: pressed ? 0.75 : 1 }]}>
        <View style={[styles.subjectMark, { backgroundColor: colors.secondary }]}>
          <Feather name="book" size={17} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subjectName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{subject.name}</Text>
          <Text style={[styles.subjectMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{subject.code ?? 'Clave no disponible'} · {subject.teacher ?? 'Docente no disponible'}</Text>
        </View>
        <View style={styles.subjectGrade}>
          <Text style={[styles.subjectGradeValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{subject.finalGradeRaw ?? formatGrade(subject.finalGrade ?? subject.weightedAverage ?? subject.average)}</Text>
          <Text style={[styles.subjectGradeLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>final</Text>
        </View>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={17} color={colors.mutedForeground} />
      </Pressable>
      {expanded ? (
        <View style={[styles.units, { borderTopColor: colors.border }]}>
          <View style={styles.unitsHeader}>
            <Text style={[styles.unitsHeaderText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>UNIDAD</Text>
            <Text style={[styles.unitsHeaderText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>CALIFICACIÓN</Text>
            <Text style={[styles.unitsHeaderText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>PESO</Text>
            <Text style={[styles.unitsHeaderText, { color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold' }]}>APORTE</Text>
          </View>
          {subject.units.length ? subject.units.map(unit => (
            <View key={`${subject.id}-${unit.number}`} style={styles.unitRow}>
              <Text style={[styles.unitName, { color: colors.foreground, fontFamily: 'Inter_500Medium' }]}>Unidad {unit.number}</Text>
              <View style={styles.unitGrade}>
                <Text style={[styles.unitGradeValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{formatGrade(unit.grade)}</Text>
                {unit.modality !== 'UNKNOWN' ? <Text style={[styles.modality, { color: colors.primary, fontFamily: 'Inter_400Regular' }]}>{unit.gradeRaw} · {unit.modalityLabel}</Text> : null}
              </View>
              <Text style={[styles.unitValue, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{unit.weight === null ? 'No disponible' : `${Math.round(unit.weight * 100)}%`}</Text>
              <Text style={[styles.unitValue, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{formatGrade(unit.contribution)}</Text>
            </View>
          )) : (
            <Text style={[styles.noData, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>No hay unidades disponibles.</Text>
          )}
          <View style={[styles.subjectFooter, { backgroundColor: colors.muted }]}>
            <Text style={[styles.subjectFooterText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Porcentaje registrado: {Math.round(subject.totalWeight * 100)}%</Text>
            <Text style={[styles.subjectFooterText, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Ponderada: {formatGrade(subject.weightedAverage)}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 110, gap: 14 },
  headerActions: { flexDirection: 'row', gap: 6 },
  loginCard: { borderRadius: 22, borderWidth: 1, padding: 20, gap: 13 },
  loginIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  loginTitle: { fontSize: 22, letterSpacing: -0.4 },
  loginSubtitle: { fontSize: 13, lineHeight: 19, marginTop: -6, marginBottom: 2 },
  loginInput: { minHeight: 49, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  loginInputText: { flex: 1, minHeight: 46, fontSize: 14, paddingVertical: 8 },
  loginError: { borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  loginErrorText: { fontSize: 12, lineHeight: 18, flex: 1 },
  loginButton: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  loginButtonText: { color: '#FFF', fontSize: 12 },
  privacyHint: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingTop: 2 },
  privacyText: { flex: 1, fontSize: 10, lineHeight: 15 },
  securityNotice: { borderRadius: 12, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  securityNoticeText: { flex: 1, fontSize: 10, lineHeight: 15 },
  sourceRow: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  sourceIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  sourceTitle: { fontSize: 12 },
  sourceText: { fontSize: 11, marginTop: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  heroCard: { borderRadius: 22, padding: 18, overflow: 'hidden' },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  heroEyebrow: { color: '#E8DEFF', fontSize: 10, letterSpacing: 1.1, fontFamily: 'Inter_600SemiBold' },
  heroValue: { color: '#FFF', fontSize: 42, letterSpacing: -1.2, marginTop: 4 },
  heroBadge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', gap: 5, alignItems: 'center', backgroundColor: '#FFFFFF20' },
  heroBadgeText: { color: '#FFF', fontSize: 11 },
  heroDivider: { height: 1, backgroundColor: '#FFFFFF25', marginVertical: 15 },
  heroMetaRow: { flexDirection: 'row', gap: 12 },
  heroMeta: { flex: 1 },
  heroMetaLabel: { color: '#D7C9FF', fontSize: 10, fontFamily: 'Inter_400Regular' },
  heroMetaValue: { color: '#FFF', fontSize: 12, marginTop: 3 },
  segment: { padding: 4, borderRadius: 14, flexDirection: 'row', gap: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: 11, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  segmentText: { fontSize: 12 },
  messageCard: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: 'row', gap: 9, alignItems: 'center' },
  messageText: { flex: 1, fontSize: 12, lineHeight: 18 },
  periodTabs: { gap: 8, paddingVertical: 2 },
  periodTab: { borderRadius: 13, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  periodTabText: { fontSize: 12 },
  periodBlock: { gap: 10 },
  periodHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.3 },
  sectionCaption: { fontSize: 11, marginTop: 3 },
  periodAverage: { minWidth: 55, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 12, alignItems: 'center' },
  periodAverageText: { fontSize: 16 },
  subjectCard: { borderRadius: 17, borderWidth: 1, overflow: 'hidden' },
  subjectHeader: { padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  subjectMark: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  subjectName: { fontSize: 13, lineHeight: 18 },
  subjectMeta: { fontSize: 10, marginTop: 3 },
  subjectGrade: { alignItems: 'flex-end', minWidth: 43 },
  subjectGradeValue: { fontSize: 17 },
  subjectGradeLabel: { fontSize: 9, marginTop: -1 },
  units: { borderTopWidth: 1, padding: 12, gap: 9 },
  unitsHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  unitsHeaderText: { fontSize: 8, letterSpacing: 0.3, flex: 1 },
  unitRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  unitName: { flex: 1, fontSize: 11 },
  unitGrade: { flex: 1.25 },
  unitGradeValue: { fontSize: 12 },
  modality: { fontSize: 9, marginTop: 2 },
  unitValue: { flex: 0.85, fontSize: 10, textAlign: 'right' },
  noData: { fontSize: 12, paddingVertical: 5 },
  subjectFooter: { borderRadius: 10, padding: 9, flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  subjectFooterText: { fontSize: 10 },
  historyList: { gap: 10 },
  historyCard: { borderWidth: 1, borderRadius: 17, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyIndex: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  historyIndexText: { fontSize: 12 },
  historyTitle: { fontSize: 13 },
  historyMeta: { fontSize: 11, marginTop: 3 },
  historyAverage: { fontSize: 17 },
  emptyCard: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10 },
  emptyIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyTitle: { fontSize: 16, textAlign: 'center' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 280 },
  primaryButton: { marginTop: 6, minHeight: 42, borderRadius: 13, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7 },
  primaryButtonText: { color: '#FFF', fontSize: 12 },
});