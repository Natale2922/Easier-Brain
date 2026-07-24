/**
 * OCR-based schedule digitization using OCR.space free API.
 * Sends an image to OCR, then parses the text for time blocks, days, and subjects.
 */

export interface DetectedBlock {
  subject: string;
  day: number; // 0=Mon..5=Sat
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  room?: string;
}

// ─── OCR Space API ────────────────────────────────────────────────────────────

export async function ocrImage(base64: string): Promise<string> {
  const formData = new FormData();
  formData.append('apikey', 'helloworld');
  formData.append('base64Image', `data:image/jpeg;base64,${base64}`);
  formData.append('language', 'spa');
  formData.append('isTable', 'true');
  formData.append('scale', 'true');
  formData.append('OCREngine', '2');
  formData.append('detectOrientation', 'true');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) throw new Error(`OCR API error: ${res.status}`);

  const json = await res.json();
  if (json.IsErroredOnProcessing) {
    throw new Error(json.ParsedResults?.[0]?.ErrorMessage ?? 'OCR falló');
  }

  return (json.ParsedResults ?? [])
    .map((r: any) => r.ParsedText ?? '')
    .join('\n');
}

// ─── Text parser ──────────────────────────────────────────────────────────────

const DAY_MAP: Record<string, number> = {
  lun: 0, lunes: 0, 'lun.': 0,
  mar: 1, martes: 1, 'mar.': 1,
  mie: 2, mié: 2, miercoles: 2, miércoles: 2, 'mie.': 2, 'mié.': 2,
  jue: 3, jueves: 3, 'jue.': 3,
  vie: 4, viernes: 4, 'vie.': 4,
  sab: 5, sáb: 5, sabado: 5, sábado: 5, 'sab.': 5, 'sáb.': 5,
};

// Matches: 7:00-9:00  07:00 - 09:00  7:00–9:00  7:00 a 9:00
const TIME_RANGE_RE = /(\d{1,2}):(\d{2})\s*[-–a]\s*(\d{1,2}):(\d{2})/i;
// Matches single time: 7:00
const TIME_SINGLE_RE = /^(\d{1,2}):(\d{2})$/;
// Room patterns: Salón A3, Aula 3B, Lab 2, A-103
const ROOM_RE = /(?:sal[oó]n|aula|lab\.?|laboratorio|sala)\s*[\w-]+/i;

/** Skip lines that are clearly not subject names */
function looksLikeSubject(line: string): boolean {
  if (!line || line.length < 3) return false;
  if (TIME_RANGE_RE.test(line)) return false;
  if (TIME_SINGLE_RE.test(line.trim())) return false;
  if (/^\d+$/.test(line)) return false;
  // Skip pure day-name lines
  const lower = line.toLowerCase().trim();
  if (Object.keys(DAY_MAP).includes(lower)) return false;
  // Skip common table headers
  if (/^(hora|horario|tiempo|semana|materia|asignatura|periodo)$/i.test(lower)) return false;
  return true;
}

export function parseScheduleText(text: string): DetectedBlock[] {
  const lines = text
    .split(/[\n\r]+/)
    .map(l => l.replace(/\t/g, ' ').trim())
    .filter(Boolean);

  const blocks: DetectedBlock[] = [];

  // Current context
  let currentDays: number[] = [0]; // default Monday
  let currentStart = { h: 7, m: 0 };
  let currentEnd = { h: 9, m: 0 };
  let hasTime = false;
  let pendingSubject: string | null = null;
  let pendingRoom: string | undefined;

  const flushPending = () => {
    if (pendingSubject && hasTime) {
      for (const day of currentDays) {
        blocks.push({
          subject: pendingSubject,
          day,
          startHour: currentStart.h,
          startMin: currentStart.m,
          endHour: currentEnd.h,
          endMin: currentEnd.m,
          room: pendingRoom,
        });
      }
    }
    pendingSubject = null;
    pendingRoom = undefined;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const lower = line.toLowerCase();

    // Detect day names in the line (can be multiple: "Lun Mar Mié")
    const foundDays: number[] = [];
    for (const [dayStr, dayNum] of Object.entries(DAY_MAP)) {
      if (lower.includes(dayStr)) foundDays.push(dayNum);
    }
    if (foundDays.length > 0) {
      flushPending();
      currentDays = [...new Set(foundDays)].sort();
    }

    // Detect time range
    const rangeMatch = line.match(TIME_RANGE_RE);
    if (rangeMatch) {
      flushPending();
      currentStart = { h: parseInt(rangeMatch[1]), m: parseInt(rangeMatch[2]) };
      currentEnd = { h: parseInt(rangeMatch[3]), m: parseInt(rangeMatch[4]) };
      hasTime = true;
      continue;
    }

    // Detect room
    const roomMatch = line.match(ROOM_RE);
    if (roomMatch) {
      pendingRoom = roomMatch[0];
      continue;
    }

    // Detect subject name
    if (looksLikeSubject(line) && foundDays.length === 0) {
      if (pendingSubject) {
        // Could be continuation of previous subject name, or a new one
        // Heuristic: if it looks like proper words, append; if all caps or new style, flush
        if (line === line.toUpperCase() && line.length > 4) {
          flushPending();
          pendingSubject = line;
        } else {
          pendingSubject = `${pendingSubject} ${line}`;
        }
      } else {
        pendingSubject = line;
      }
    }
  }

  flushPending();

  // De-duplicate: same subject+day+time
  const seen = new Set<string>();
  return blocks.filter(b => {
    const key = `${b.subject}|${b.day}|${b.startHour}:${b.startMin}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function digitizeScheduleImage(base64: string): Promise<DetectedBlock[]> {
  const text = await ocrImage(base64);
  return parseScheduleText(text);
}
