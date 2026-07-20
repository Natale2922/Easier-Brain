import type { AddTaskParams, Priority, DeliveryMethod } from '@/context/TasksContext';

const MONTHS_ES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

const DAYS_ES: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3,
  jueves: 4, viernes: 5, sábado: 6, sabado: 6,
};

const SUBJECT_KEYWORDS: Record<string, string> = {
  'cálculo': 'Cálculo Integral', 'calculo': 'Cálculo Integral',
  'integral': 'Cálculo Integral', 'diferencial': 'Cálculo Diferencial',
  'física': 'Física', 'fisica': 'Física',
  'álgebra': 'Álgebra Lineal', 'algebra': 'Álgebra Lineal',
  'proyecto': 'Proyecto Integrador', 'integrador': 'Proyecto Integrador',
  'base de dato': 'Base de Datos', 'bd': 'Base de Datos',
  'redes': 'Redes de Computadoras', 'red': 'Redes de Computadoras',
  'programación': 'Programación', 'programacion': 'Programación',
  'inglés': 'Inglés', 'ingles': 'Inglés',
  'ética': 'Ética', 'etica': 'Ética',
  'arancelaria': 'Clasificación Arancelaria II',
  'pensamiento': 'Desarrollo del Pensamiento',
  'química': 'Química', 'quimica': 'Química',
  'sistemas': 'Sistemas Operativos',
  'arquitectura': 'Arquitectura de Computadoras',
  'software': 'Ingeniería de Software',
  'estructuras': 'Estructura de Datos',
};

function parseDate(text: string): string | undefined {
  const lower = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Hoy
  if (/\bhoy\b/.test(lower)) {
    return today.toISOString().split('T')[0];
  }

  // Mañana
  if (/\bma[ñn]ana\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  // Pasado mañana
  if (/\bpasado\s+ma[ñn]ana\b/.test(lower)) {
    const d = new Date(today);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }

  // "el lunes", "este martes", etc.
  for (const [dayName, dayNum] of Object.entries(DAYS_ES)) {
    const re = new RegExp(`\\b(este?\\s+)?${dayName}\\b`);
    if (re.test(lower)) {
      const d = new Date(today);
      let diff = dayNum - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return d.toISOString().split('T')[0];
    }
  }

  // "el 15 de agosto", "15/08", "15-08-2026"
  const fullDate = lower.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?:\s+(?:de\s+)?(\d{4}))?/);
  if (fullDate) {
    const day = parseInt(fullDate[1]);
    const month = MONTHS_ES[fullDate[2]];
    const year = fullDate[3] ? parseInt(fullDate[3]) : today.getFullYear();
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  }

  // "15/08" or "15-08"
  const shortDate = lower.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/);
  if (shortDate) {
    const day = parseInt(shortDate[1]);
    const month = parseInt(shortDate[2]) - 1;
    const rawYear = shortDate[3] ? parseInt(shortDate[3]) : today.getFullYear();
    const year = rawYear < 100 ? 2000 + rawYear : rawYear;
    const d = new Date(year, month, day);
    return d.toISOString().split('T')[0];
  }

  // "en 3 días", "en una semana"
  const inDays = lower.match(/en\s+(\d+|una?|dos|tres|cuatro|cinco)\s+(d[íi]a|semana|mes)/);
  if (inDays) {
    const numWord: Record<string, number> = { un: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
    const raw = inDays[1];
    const n = isNaN(Number(raw)) ? (numWord[raw] ?? 1) : Number(raw);
    const unit = inDays[2];
    const d = new Date(today);
    if (unit.startsWith('d')) d.setDate(d.getDate() + n);
    else if (unit.startsWith('sem')) d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    return d.toISOString().split('T')[0];
  }

  return undefined;
}

function parseTime(text: string): string | undefined {
  const lower = text.toLowerCase();

  // "a las 10:30", "a las 2pm", "10:30 am"
  const withAmPm = lower.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (withAmPm) {
    let h = parseInt(withAmPm[1]);
    const m = withAmPm[2] ? parseInt(withAmPm[2]) : 0;
    if (withAmPm[3] === 'pm' && h !== 12) h += 12;
    if (withAmPm[3] === 'am' && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const colon = lower.match(/\ba\s+las\s+(\d{1,2})(?::(\d{2}))?\b/);
  if (colon) {
    const h = parseInt(colon[1]);
    const m = colon[2] ? parseInt(colon[2]) : 0;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  const plain = lower.match(/\b(\d{1,2}):(\d{2})\b/);
  if (plain) {
    return `${plain[1].padStart(2, '0')}:${plain[2]}`;
  }

  return undefined;
}

function parsePriority(text: string): Priority {
  const lower = text.toLowerCase();
  if (/\b(urgente|urgentemente|crítico|critico|muy\s+importante|para\s+hoy|asap)\b/.test(lower)) return 'high';
  if (/\b(importante|pronto|rápido|rapido|antes\s+de)\b/.test(lower)) return 'medium';
  if (/\b(cuando\s+pueda|sin\s+prisa|baja\s+prioridad|opcional)\b/.test(lower)) return 'low';
  return 'medium';
}

function parseDelivery(text: string): DeliveryMethod | undefined {
  const lower = text.toLowerCase();
  if (/\b(campus|plataforma|moodle|campus\s+virtual|en\s+l[íi]nea|online|subir|subiendo)\b/.test(lower)) return 'campus';
  if (/\b(correo|email|mail|enviar\s+por|mandar\s+por)\b/.test(lower)) return 'email';
  if (/\b(clase|presencial|en\s+persona|imprimir|impreso|traer|entregar\s+en\s+clase|f[íi]sico)\b/.test(lower)) return 'class';
  return undefined;
}

function parseCourseName(text: string, knownCourses: string[]): string | undefined {
  const lower = text.toLowerCase();

  // Check against known courses first (exact/partial match)
  for (const course of knownCourses) {
    if (lower.includes(course.toLowerCase().substring(0, 8))) return course;
  }

  // Check keyword dictionary
  for (const [keyword, subject] of Object.entries(SUBJECT_KEYWORDS)) {
    if (lower.includes(keyword)) return subject;
  }

  return undefined;
}

function cleanTitle(text: string): string {
  // Remove date/time expressions
  let t = text
    .replace(/\b(hoy|ma[ñn]ana|pasado\s+ma[ñn]ana)\b/gi, '')
    .replace(/\b(este?\s+)?(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi, '')
    .replace(/el\s+\d{1,2}\s+de\s+\w+/gi, '')
    .replace(/\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?/g, '')
    .replace(/\ba\s+las\s+\d{1,2}(:\d{2})?\s*(am|pm)?\b/gi, '')
    .replace(/\b\d{1,2}:\d{2}\s*(am|pm)?\b/gi, '')
    .replace(/\ben\s+(\d+|una?)\s+(d[íi]as?|semanas?|meses?)\b/gi, '')
    // Remove delivery method words
    .replace(/\b(en|por|a\s+trav[eé]s\s+de)?\s*(campus|plataforma|moodle|correo|email|clase|presencial)\b/gi, '')
    // Remove priority words
    .replace(/\b(urgente|importante|opcional|baja\s+prioridad)\b/gi, '')
    // Remove filler words
    .replace(/\b(de|la|el|los|las|un|una|hay\s+que|tengo\s+que|necesito|debo|entregar)\b\s*/gi, (m, p1) => {
      // Only remove if at start
      return m;
    })
    .replace(/\s+/g, ' ')
    .trim();

  // Capitalize first letter
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function parseTaskFromText(
  text: string,
  knownCourses: string[] = [],
): Partial<AddTaskParams> & { title: string } {
  const dueDate = parseDate(text);
  const dueTime = parseTime(text);
  const priority = parsePriority(text);
  const deliveryMethod = parseDelivery(text);
  const courseName = parseCourseName(text, knownCourses);

  // Title: try to extract the core action from the text
  // Remove leading action verbs
  let title = text.trim();
  title = title
    .replace(/^(entregar|hacer|completar|terminar|subir|enviar|traer|preparar|estudiar|revisar|leer)\s+/i, (_, verb) => {
      // Keep the verb in title
      return verb.charAt(0).toUpperCase() + verb.slice(1) + ' ';
    });

  // Shorten to max 100 chars
  if (title.length > 100) title = title.substring(0, 97) + '...';

  return {
    title,
    priority,
    dueDate,
    dueTime,
    deliveryMethod,
    courseName,
  };
}
