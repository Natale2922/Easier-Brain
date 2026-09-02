import { load, type CheerioAPI } from "cheerio";

const BASE = "http://201.116.22.214:8080/sii2";

export interface SiiUnit {
  number: number;
  grade: number | null;
  gradeRaw: string | null;
  modality: string | null;
  weight: number | null;
}

export interface SiiSubject {
  id: string;
  name: string;
  code: string | null;
  teacher: string | null;
  finalGrade: number | null;
  finalGradeRaw: string | null;
  units: SiiUnit[];
}

export interface SiiPeriod {
  id: string;
  label: string;
  year: string | null;
  average: number | null;
  subjects: SiiSubject[];
}

export interface SiiSnapshot {
  student: {
    name: string | null;
    career: string | null;
    group: string | null;
    generation: string | null;
    overallAverage: number | null;
  };
  periods: SiiPeriod[];
  lastUpdatedAt: string;
  source: string;
}

interface SiiResponse {
  response: Response;
  html: string;
}

class SiiClient {
  private cookies = new Map<string, string>();

  private saveCookies(headers: Headers) {
    const values =
      typeof (headers as any).getSetCookie === "function"
        ? (headers as any).getSetCookie()
        : [headers.get("set-cookie") ?? ""];
    for (const value of values) {
      const match = value.match(/(?:^|,)\s*([^=;,]+)=([^;,\s]+)/);
      if (match?.[1] && match[2] !== "deleted") this.cookies.set(match[1], match[2]);
    }
  }

  private cookieHeader() {
    return Array.from(this.cookies.entries()).map(([key, value]) => `${key}=${value}`).join("; ");
  }

  async request(path: string, init: RequestInit = {}): Promise<SiiResponse> {
    const headers = new Headers(init.headers);
    headers.set("User-Agent", "Nuvo/1.0");
    if (this.cookies.size) headers.set("Cookie", this.cookieHeader());
    const response = await fetch(path.startsWith("http") ? path : `${BASE}${path}`, {
      ...init,
      headers,
      redirect: "manual",
    });
    this.saveCookies(response.headers);
    return { response, html: await response.text() };
  }
}

function hiddenValue(html: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`name=["']${escaped}["'][^>]*value=["']([^"']*)`, "i"))?.[1] ?? "";
}

function cleanText(value: string | undefined | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function toNumber(value: string | undefined | null): number | null {
  const normalized = cleanText(value).replace(",", ".").replace(/[^\d.-]/g, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toWeight(value: string | undefined | null): number | null {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return parsed > 1 ? parsed / 100 : parsed;
}

function parseGradeCell(value: string) {
  const raw = cleanText(value);
  const modality = raw.match(/\b(OR|RE|EX)\b/i)?.[1]?.toUpperCase() ?? null;
  const level = raw.match(/\b([A-E])\b/i)?.[1]?.toUpperCase();
  const grade = toNumber(level ?? raw);
  return { grade, raw: raw || null, modality };
}

function linkCandidates($: CheerioAPI, html: string) {
  const links: string[] = [];
  $("a[href]").each((_index, element) => {
    const text = cleanText($(element).text());
    const href = $(element).attr("href") ?? "";
    if (/calific|historial|kardex|boleta|evaluac|escolar/i.test(`${text} ${href}`)) {
      links.push(href);
    }
  });
  const absolute = html.match(/(?:href|url)=["']([^"']*(?:calific|historial|kardex|boleta)[^"']*)["']/gi) ?? [];
  for (const value of absolute) links.push(value.replace(/^.*?["']/, "").replace(/["'].*$/, ""));
  return Array.from(new Set(links)).filter(Boolean);
}

function normalizeLink(link: string) {
  if (link.startsWith("http")) return link;
  if (link.startsWith("/")) return `http://201.116.22.214:8080${link}`;
  return `${BASE}/${link.replace(/^.\//, "")}`;
}

function parseSubjectTables(html: string): SiiPeriod[] {
  const $ = load(html);
  const subjects: SiiSubject[] = [];
  let periodLabel = cleanText($("h1, h2, h3, .ui-panel-title, .card-title").first().text());
  const bodyText = cleanText($("body").text());
  const periodMatch = bodyText.match(/(?:periodo|cuatrimestre|semestre)\s*[:\-]?\s*([A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s–-]{4,50})/i);
  if (periodMatch?.[1]) periodLabel = cleanText(periodMatch[1]);

  $("table").each((tableIndex, table) => {
    const rows = $(table).find("tr").toArray().map(row =>
      $(row).find("th,td").toArray().map(cell => cleanText($(cell).text())).filter(Boolean),
    ).filter(row => row.length);
    if (rows.length < 2) return;
    const header = rows[0].map(cell => cell.toLowerCase());
    const subjectIndex = header.findIndex(cell => /materia|asignatura|curso/.test(cell));
    const teacherIndex = header.findIndex(cell => /docente|profesor|maestro/.test(cell));
    const codeIndex = header.findIndex(cell => /clave|c[oó]digo/.test(cell));
    const finalIndex = header.findIndex(cell => /final|promedio/.test(cell));
    const unitIndexes = header.map((cell, index) => ({ cell, index })).filter(item => /unidad\s*[1-9]|u\s*[1-9]/i.test(item.cell));
    rows.slice(1).forEach((row, rowIndex) => {
      const name = cleanText(row[subjectIndex >= 0 ? subjectIndex : 0]);
      if (!name || /materia|asignatura|total|promedio/i.test(name)) return;
      const units: SiiUnit[] = unitIndexes.map(({ cell, index }) => {
        const number = Number(cell.match(/(?:unidad|u)\s*([1-9])/i)?.[1] ?? index + 1);
        const parsed = parseGradeCell(row[index] ?? "");
        const weight = toWeight(row[index + 1] ?? "");
        return { number, grade: parsed.grade, gradeRaw: parsed.raw, modality: parsed.modality, weight };
      }).filter(unit => unit.grade !== null || unit.gradeRaw);
      if (!units.length) return;
      subjects.push({
        id: `${tableIndex}_${rowIndex}_${name.toLowerCase().replace(/\W+/g, "_")}`,
        name,
        code: codeIndex >= 0 ? row[codeIndex] ?? null : null,
        teacher: teacherIndex >= 0 ? row[teacherIndex] ?? null : null,
        finalGrade: finalIndex >= 0 ? toNumber(row[finalIndex]) : null,
        finalGradeRaw: finalIndex >= 0 ? row[finalIndex] ?? null : null,
        units,
      });
    });
  });

  const unique = Array.from(new Map(subjects.map(subject => [subject.name.toLowerCase(), subject])).values());
  const finalValues = unique
    .map(subject => subject.finalGrade)
    .filter((value): value is number => value !== null);
  const average = finalValues.length
    ? finalValues.reduce((total, value) => total + value, 0) / finalValues.length
    : null;
  return unique.length
    ? [{ id: "current", label: periodLabel || "Periodo actual", year: periodLabel.match(/\b20\d{2}\b/)?.[0] ?? null, average: Number.isFinite(average ?? NaN) ? average : null, subjects: unique }]
    : [];
}

export async function getSiiAcademicData(username: string, password: string): Promise<SiiSnapshot> {
  const client = new SiiClient();
  const loginPage = await client.request("/login.xhtml");
  const viewState = hiddenValue(loginPage.html, "javax.faces.ViewState");
  const body = new URLSearchParams({
    "javax.faces.partial.ajax": "true",
    "javax.faces.source": "frmLogin:btnLogin",
    "javax.faces.partial.execute": "frmLogin",
    "javax.faces.partial.render": "frmLogin",
    "frmLogin": "frmLogin",
    "frmLogin:login": username,
    "frmLogin:password": password,
    "frmLogin:btnLogin": "frmLogin:btnLogin",
    "javax.faces.ViewState": viewState,
  });
  const loginResponse = await client.request("/login.xhtml", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Faces-Request": "partial/ajax",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: body.toString(),
  });
  if (/login__input|frmLogin:password|Usuario o Trabajador/i.test(loginResponse.html) && !/<redirect\b/i.test(loginResponse.html)) {
    throw new Error("SII_LOGIN_FAILED");
  }

  const redirectUrl = loginResponse.html.match(/<redirect[^>]+url="([^"]+)"/i)?.[1];
  const dashboard = await client.request(redirectUrl ? normalizeLink(redirectUrl) : "/index.xhtml");
  if (/login\.xhtml|frmLogin:password/i.test(dashboard.response.url || "") || /frmLogin:password/i.test(dashboard.html)) {
    throw new Error("SII_LOGIN_FAILED");
  }

  const pages = [dashboard.html, ...linkCandidates(load(dashboard.html), dashboard.html).map(normalizeLink)];
  let gradeHtml = dashboard.html;
  for (const page of pages.slice(0, 8)) {
    if (page === dashboard.html) continue;
    try {
      const candidate = await client.request(page);
      if (/unidad|calific|promedio|evaluaci/i.test(candidate.html)) {
        gradeHtml = candidate.html;
        break;
      }
    } catch {
      // Try the next institutional menu target.
    }
  }

  const $ = load(gradeHtml);
  const bodyText = cleanText($("body").text());
  const studentName = cleanText($(".user-name, .username, [class*='nombre']").first().text()) || null;
  const career = bodyText.match(/(?:carrera|programa)\s*[:\-]\s*([^|]{3,80})/i)?.[1] ?? null;
  const group = bodyText.match(/(?:grupo)\s*[:\-]\s*([^|]{1,30})/i)?.[1] ?? null;
  const generation = bodyText.match(/(?:generaci[oó]n)\s*[:\-]\s*([^|]{1,30})/i)?.[1] ?? null;
  const periods = parseSubjectTables(gradeHtml);
  const values = periods.flatMap(period => period.subjects)
    .map(subject => subject.finalGrade)
    .filter((value): value is number => value !== null);
  return {
    student: {
      name: studentName,
      career: cleanText(career) || null,
      group: cleanText(group) || null,
      generation: cleanText(generation) || null,
      overallAverage: values.length ? values.reduce((total, value) => total + value, 0) / values.length : null,
    },
    periods,
    lastUpdatedAt: new Date().toISOString(),
    source: "UTXJ SII",
  };
}