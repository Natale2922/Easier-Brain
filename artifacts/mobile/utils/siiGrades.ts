export type GradeModality = 'OR' | 'RE' | 'EX' | 'UNKNOWN';

export interface Student {
  name: string | null;
  career: string | null;
  group: string | null;
  generation: string | null;
  overallAverage: number | null;
}

export interface UnitGrade {
  number: number;
  grade: number | null;
  gradeRaw: string | null;
  level: string | null;
  modality: GradeModality;
  modalityLabel: string;
  weight: number | null;
  contribution: number | null;
}

export interface Subject {
  id: string;
  name: string;
  code: string | null;
  teacher: string | null;
  finalGrade: number | null;
  finalGradeRaw: string | null;
  units: UnitGrade[];
  average: number | null;
  weightedAverage: number | null;
  totalWeight: number;
}

export interface AcademicPeriod {
  id: string;
  label: string;
  year: string | null;
  average: number | null;
  subjects: Subject[];
}

export interface GradeSummary {
  accumulatedAverage: number | null;
  weightedAverage: number | null;
  totalSubjects: number;
  completedSubjects: number;
  latestPeriod: string | null;
}

export interface AcademicSnapshot {
  student: Student;
  periods: AcademicPeriod[];
  lastUpdatedAt: string | null;
  source?: string;
}

const modalityLabels: Record<GradeModality, string> = {
  OR: 'Ordinario',
  RE: 'Recuperación',
  EX: 'Extraordinario',
  UNKNOWN: 'No disponible',
};

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text || null;
}

function numberValue(value: unknown): number | null {
  const text = clean(value)?.replace(',', '.').replace(/[^\d.-]/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function weightValue(value: unknown): number | null {
  const parsed = numberValue(value);
  if (parsed === null) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

export function parseGradeAndModality(value: unknown) {
  const raw = clean(value);
  const modalityKey = raw?.match(/\b(OR|RE|EX)\b/i)?.[1]?.toUpperCase() as GradeModality | undefined;
  const modality = modalityKey && modalityKey in modalityLabels ? modalityKey : 'UNKNOWN';
  const level = raw?.match(/\b([A-E])\b/i)?.[1]?.toUpperCase() ?? null;
  const numeric = numberValue(raw);
  return {
    raw,
    level,
    grade: numeric,
    modality,
    modalityLabel: modalityLabels[modality],
  };
}

export function normalizeUnitGrade(raw: any, index: number): UnitGrade {
  const parsed = parseGradeAndModality(raw?.grade ?? raw?.gradeRaw ?? raw?.calificacion);
  const weight = weightValue(raw?.weight ?? raw?.percentage ?? raw?.porcentaje);
  return {
    number: Number(raw?.number ?? index + 1),
    grade: parsed.grade,
    gradeRaw: parsed.raw,
    level: parsed.level,
    modality: parsed.modality,
    modalityLabel: parsed.modalityLabel,
    weight,
    contribution: parsed.grade !== null && weight !== null ? parsed.grade * weight : null,
  };
}

export function normalizeSubject(raw: any, index: number): Subject {
  const units: UnitGrade[] = Array.isArray(raw?.units)
    ? raw.units.map((unit: any, unitIndex: number) => normalizeUnitGrade(unit, unitIndex))
    : [];
  const grades = units.map(unit => unit.grade).filter((grade): grade is number => grade !== null);
  const weightedUnits = units.filter(unit => unit.contribution !== null);
  const totalWeight = weightedUnits.reduce((total, unit) => total + (unit.weight ?? 0), 0);
  const finalGrade = numberValue(raw?.finalGrade);
  const weightedAverage = Math.abs(totalWeight - 1) < 0.001
    ? weightedUnits.reduce((total, unit) => total + (unit.contribution ?? 0), 0)
    : null;
  return {
    id: clean(raw?.id) ?? `subject-${index}`,
    name: clean(raw?.name) ?? 'Materia sin nombre',
    code: clean(raw?.code),
    teacher: clean(raw?.teacher),
    finalGrade,
    finalGradeRaw: clean(raw?.finalGradeRaw),
    units,
    average: grades.length ? grades.reduce((total, grade) => total + grade, 0) / grades.length : null,
    weightedAverage,
    totalWeight,
  };
}

export function normalizeAcademicSnapshot(raw: any): AcademicSnapshot {
  const periods = Array.isArray(raw?.periods)
    ? raw.periods.map((period: any, periodIndex: number) => ({
        id: clean(period?.id) ?? `period-${periodIndex}`,
        label: clean(period?.label) ?? 'Periodo sin nombre',
        year: clean(period?.year),
        average: numberValue(period?.average),
        subjects: Array.isArray(period?.subjects) ? period.subjects.map(normalizeSubject) : [],
      }))
    : [];
  return {
    student: {
      name: clean(raw?.student?.name),
      career: clean(raw?.student?.career),
      group: clean(raw?.student?.group),
      generation: clean(raw?.student?.generation),
      overallAverage: numberValue(raw?.student?.overallAverage),
    },
    periods,
    lastUpdatedAt: clean(raw?.lastUpdatedAt),
    source: clean(raw?.source) ?? 'UTXJ SII',
  };
}

export function getGradeSummary(snapshot: AcademicSnapshot): GradeSummary {
  const subjects = snapshot.periods.flatMap(period => period.subjects);
  const finalGrades = subjects.map(subject => subject.finalGrade ?? subject.weightedAverage ?? subject.average)
    .filter((grade): grade is number => grade !== null);
  const weighted = subjects.filter(subject => subject.weightedAverage !== null);
  return {
    accumulatedAverage: snapshot.student.overallAverage ?? (finalGrades.length ? finalGrades.reduce((total, grade) => total + grade, 0) / finalGrades.length : null),
    weightedAverage: weighted.length ? weighted.reduce((total, subject) => total + (subject.weightedAverage ?? 0), 0) / weighted.length : null,
    totalSubjects: subjects.length,
    completedSubjects: finalGrades.length,
    latestPeriod: snapshot.periods[0]?.label ?? null,
  };
}

export function formatGrade(grade: number | null) {
  return grade === null ? 'No disponible' : grade.toFixed(1);
}