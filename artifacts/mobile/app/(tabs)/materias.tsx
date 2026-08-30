import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useTasks, type Task } from '@/context/TasksContext';
import { useAcademic, type AcademicSubject } from '@/context/AcademicContext';
import { TaskItem } from '@/components/tasks/TaskItem';
import { TaskDetail } from '@/components/tasks/TaskDetail';
import { AppHeader, HeaderAction } from '@/components/common/AppHeader';

function SubjectCard({
  subject,
  tasks,
  schedule,
  index,
  onSelectTask,
}: {
  subject: AcademicSubject;
  tasks: Task[];
  schedule: ReturnType<typeof useAcademic>['schedule'];
  index: number;
  onSelectTask: (task: Task) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const pending = tasks.filter(task => !task.completed);
  const completed = tasks.filter(task => task.completed);
  const progress = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
  const classInfo = schedule.find(entry => entry.subject.trim().toLowerCase() === subject.name.trim().toLowerCase());
  const pastel = colors.pastel[subject.colorIndex % colors.pastel.length];
  const pastelText = colors.pastelText[subject.colorIndex % colors.pastelText.length];

  return (
    <View style={[styles.subjectCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable onPress={() => setExpanded(value => !value)} style={styles.subjectContent}>
        <View style={[styles.subjectIcon, { backgroundColor: pastel }]}>
          <Feather name={index % 3 === 0 ? 'grid' : index % 3 === 1 ? 'globe' : 'book-open'} size={20} color={pastelText} />
        </View>
        <View style={styles.subjectMain}>
          <View style={styles.subjectTitleRow}>
            <Text style={[styles.subjectName, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={2}>{subject.name}</Text>
            <Feather name="more-vertical" size={17} color={colors.mutedForeground} />
          </View>
          <Text style={[styles.teacher, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            {subject.teacher || classInfo?.teacher || 'Docente por agregar'}
          </Text>
          <Text style={[styles.classMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={1}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} /> {subject.room || classInfo?.room || 'Aula pendiente'}
          </Text>
        </View>
      </Pressable>
      <View style={styles.progressBlock}>
        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Progreso del curso</Text>
          <Text style={[styles.progressValue, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>{progress}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${Math.max(progress, tasks.length ? 5 : 0)}%`, backgroundColor: pastelText }]} />
        </View>
      </View>
      <View style={[styles.subjectFooter, { borderTopColor: colors.border }]}>
        <View style={styles.footerStat}>
          <Feather name="check-square" size={15} color={pending.length ? pastelText : colors.success} />
          <View>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Tareas</Text>
            <Text style={[styles.footerValue, { color: pending.length ? pastelText : colors.success, fontFamily: 'Inter_600SemiBold' }]}>
              {pending.length} pendiente{pending.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <View style={[styles.footerDivider, { backgroundColor: colors.border }]} />
        <View style={styles.footerStat}>
          <Feather name="calendar" size={15} color={pastelText} />
          <View>
            <Text style={[styles.footerLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Próximo evento</Text>
            <Text style={[styles.footerValue, { color: pastelText, fontFamily: 'Inter_600SemiBold' }]}>
              {classInfo ? `${String(classInfo.startHour).padStart(2, '0')}:${String(classInfo.startMin).padStart(2, '0')}` : 'Sin fecha'}
            </Text>
          </View>
        </View>
      </View>
      {expanded && (
        <View style={styles.expandedTasks}>
          <View style={[styles.expandedDivider, { backgroundColor: colors.border }]} />
          {tasks.length ? tasks.sort((a, b) => Number(a.completed) - Number(b.completed)).map(task => (
            <TaskItem key={task.id} task={task} onPress={() => onSelectTask(task)} />
          )) : (
            <Text style={[styles.noTasks, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Aún no hay tareas para esta materia.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function MateriasScreen() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const { tasks } = useTasks();
  const { subjects, schedule, lastUpdatedAt } = useAcademic();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const taskSubjects = useMemo(() => Array.from(new Set(tasks.map(task => task.courseName?.trim()).filter(Boolean) as string[])), [tasks]);
  const subjectRecords = useMemo(() => {
    const saved = new Map(subjects.map(subject => [subject.name.toLowerCase(), subject]));
    return taskSubjects.map((name, index) => saved.get(name.toLowerCase()) ?? {
      id: `temp_${name}`,
      name,
      colorIndex: index,
      updatedAt: lastUpdatedAt ?? new Date().toISOString(),
    });
  }, [subjects, taskSubjects, lastUpdatedAt]);
  const allSubjects = subjectRecords.length ? subjectRecords : subjects;
  const filteredSubjects = allSubjects.filter(subject => subject.name.toLowerCase().includes(query.trim().toLowerCase()));
  const activeTasks = tasks.filter(task => !task.completed);
  const completedTasks = tasks.filter(task => task.completed);
  const upcoming = activeTasks.filter(task => task.dueDate && new Date(`${task.dueDate}T12:00:00`).getTime() >= Date.now()).length;
  const averageProgress = allSubjects.length
    ? Math.round(allSubjects.reduce((total, subject) => {
      const related = tasks.filter(task => task.courseName?.toLowerCase() === subject.name.toLowerCase());
      return total + (related.length ? (related.filter(task => task.completed).length / related.length) * 100 : 0);
    }, 0) / allSubjects.length)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Materias"
        subtitle="Tu semestre  ·  Mayo – Agosto 2025"
        actions={
          <>
            {searchOpen && (
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar"
                placeholderTextColor={colors.mutedForeground}
                style={[styles.searchInput, { color: colors.foreground, backgroundColor: colors.card, borderColor: colors.border, fontFamily: 'Inter_400Regular' }]}
              />
            )}
            <HeaderAction icon={searchOpen ? 'x' : 'search'} onPress={() => { setSearchOpen(value => !value); if (searchOpen) setQuery(''); }} />
            <HeaderAction icon="sliders" label="Filtrar" active={!!query} onPress={() => setSearchOpen(true)} />
          </>
        }
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SummaryStat icon="book-open" value={String(allSubjects.length)} label="Materias activas" color={colors.primary} colors={colors} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryStat icon="check-square" value={String(activeTasks.length)} label="Tareas pendientes" color={colors.success} colors={colors} />
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <SummaryStat icon="calendar" value={String(upcoming)} label="Próximos" color={colors.warning} colors={colors} />
          <View style={[styles.averageBox, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.averageLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Progreso general</Text>
            <Text style={[styles.averageValue, { color: colors.primary, fontFamily: 'Inter_700Bold' }]}>{averageProgress}%</Text>
            <Text style={[styles.averageTrend, { color: colors.success, fontFamily: 'Inter_500Medium' }]}>↗ {completedTasks.length} completadas</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Tus materias</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Toca una tarjeta para ver sus tareas</Text>
          </View>
          <Text style={[styles.countText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>{filteredSubjects.length} activas</Text>
        </View>

        {filteredSubjects.length ? (
          <View style={[styles.grid, { gap: 12 }]}>
            {filteredSubjects.map((subject, index) => (
              <View key={subject.id} style={{ width: width >= 560 ? '48.5%' : '100%' }}>
                <SubjectCard subject={subject} tasks={tasks.filter(task => task.courseName?.toLowerCase() === subject.name.toLowerCase())} schedule={schedule} index={index} onSelectTask={setSelectedTask} />
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book-open" size={30} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]}>Sin materias todavía</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>Sincroniza el campus para llenar tu información académica.</Text>
          </View>
        )}

        {tasks.length > 0 && (
          <View style={styles.recentSection}>
            <View style={styles.sectionHeading}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>Recientes</Text>
              <Text style={[styles.countText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Ver todo ›</Text>
            </View>
            <View style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.recentIcon, { backgroundColor: colors.secondary }]}><Feather name="file-text" size={17} color={colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.recentTitle, { color: colors.foreground, fontFamily: 'Inter_600SemiBold' }]} numberOfLines={1}>{tasks[0].title}</Text>
                <Text style={[styles.recentMeta, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]}>{tasks[0].courseName || 'Sin materia'}  ·  {tasks[0].completed ? 'Completada' : 'Pendiente'}</Text>
              </View>
              <Pressable onPress={() => setSelectedTask(tasks[0])} style={[styles.continueButton, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.continueText, { color: colors.primary, fontFamily: 'Inter_600SemiBold' }]}>Abrir</Text>
                <Feather name="arrow-right" size={13} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
      <TaskDetail task={selectedTask} onClose={() => setSelectedTask(null)} />
    </View>
  );
}

function SummaryStat({ icon, value, label, color, colors }: { icon: keyof typeof Feather.glyphMap; value: string; label: string; color: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.summaryStat}>
      <View style={[styles.summaryIcon, { backgroundColor: color + '16' }]}><Feather name={icon} size={17} color={color} /></View>
      <Text style={[styles.summaryValue, { color: colors.foreground, fontFamily: 'Inter_700Bold' }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground, fontFamily: 'Inter_400Regular' }]} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchInput: { width: 80, height: 40, borderRadius: 13, borderWidth: 1, paddingHorizontal: 10, fontSize: 12 },
  summaryCard: { marginHorizontal: 20, borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#332262', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  summaryStat: { flex: 1, minWidth: 58 },
  summaryIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  summaryValue: { fontSize: 21, lineHeight: 24 },
  summaryLabel: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  summaryDivider: { height: 58, width: 1 },
  averageBox: { width: 112, borderRadius: 14, padding: 11 },
  averageLabel: { fontSize: 9 },
  averageValue: { fontSize: 24, marginTop: 2 },
  averageTrend: { fontSize: 9, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontSize: 18, letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 11, marginTop: 3 },
  countText: { fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 20 },
  subjectCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden', shadowColor: '#332262', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  subjectContent: { flexDirection: 'row', padding: 14, gap: 11 },
  subjectIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  subjectMain: { flex: 1 },
  subjectTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  subjectName: { flex: 1, fontSize: 14, lineHeight: 19 },
  teacher: { fontSize: 11, marginTop: 3 },
  classMeta: { fontSize: 10, marginTop: 5 },
  progressBlock: { paddingHorizontal: 14, paddingBottom: 13 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 10 },
  progressValue: { fontSize: 11 },
  progressTrack: { height: 5, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  subjectFooter: { borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  footerStat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerDivider: { width: 1, height: 30 },
  footerLabel: { fontSize: 9 },
  footerValue: { fontSize: 10, marginTop: 2 },
  expandedTasks: { paddingHorizontal: 10, paddingBottom: 10, gap: 8 },
  expandedDivider: { height: 1, marginBottom: 2 },
  noTasks: { fontSize: 11, paddingVertical: 8 },
  emptyCard: { marginHorizontal: 20, minHeight: 150, borderRadius: 18, borderWidth: 1, padding: 22, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyTitle: { fontSize: 16 },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 280 },
  recentSection: { marginTop: 4 },
  recentCard: { marginHorizontal: 20, borderRadius: 17, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  recentIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  recentTitle: { fontSize: 12 },
  recentMeta: { fontSize: 10, marginTop: 4 },
  continueButton: { borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 4 },
  continueText: { fontSize: 10 },
});