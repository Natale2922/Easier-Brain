import { load } from "cheerio";

const BASE = "http://campusvirtual.utxicotepec.edu.mx";

export interface MoodleSession {
  sessionToken: string;
  sesskey: string;
  userFullname: string;
}

export interface MoodleTask {
  id: string;
  title: string;
  courseName: string;
  dueDate: string | null;
  description: string | null;
  url: string | null;
}

function extractMoodleSession(headers: Headers): string | null {
  const cookies: string[] =
    typeof (headers as any).getSetCookie === "function"
      ? (headers as any).getSetCookie()
      : [headers.get("set-cookie") ?? ""];

  for (const cookie of cookies) {
    const m = cookie.match(/MoodleSession=([^;]+)/);
    if (m?.[1] && m[1] !== "deleted") return m[1];
  }
  return null;
}

function cleanTitle(title: string): string {
  return title
    .replace(/^(Assignment|Quiz|Forum|Task|Tarea|Actividad|Foro):\s*/i, "")
    .trim();
}

export async function moodleLogin(
  username: string,
  password: string,
): Promise<{ session: MoodleSession | null; error: string | null }> {
  try {
    // Step 1 — GET login page to obtain initial session + CSRF logintoken
    const loginPageResp = await fetch(`${BASE}/login/index.php`, {
      headers: { "User-Agent": "MisTareasApp/1.0" },
    });

    const initialSession = extractMoodleSession(loginPageResp.headers);
    if (!initialSession) {
      return {
        session: null,
        error: "No se pudo conectar con la plataforma universitaria",
      };
    }

    const loginHtml = await loginPageResp.text();
    const tokenMatch = loginHtml.match(/name="logintoken"\s+value="([^"]+)"/);
    const loginToken = tokenMatch?.[1] ?? "";

    // Step 2 — POST login credentials
    const formData = new URLSearchParams({
      logintoken: loginToken,
      username,
      password,
      anchor: "",
    });

    const postResp = await fetch(`${BASE}/login/index.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: `MoodleSession=${initialSession}`,
        "User-Agent": "MisTareasApp/1.0",
      },
      body: formData.toString(),
      redirect: "manual",
    });

    const newSession = extractMoodleSession(postResp.headers);
    let location = postResp.headers.get("location") ?? "";

    if (!newSession) {
      return { session: null, error: "Usuario o contraseña incorrectos" };
    }

    // Moodle may redirect to /login/index.php?testsession=... to verify the client
    // accepts cookies. Follow that redirect with the new session cookie; if the
    // next redirect is also to /login/ (no testsession param) the credentials failed.
    if (location.includes("/login/") && location.includes("testsession=")) {
      const testUrl = location.startsWith("http")
        ? location
        : `${BASE}${location}`;
      const testResp = await fetch(testUrl, {
        headers: {
          Cookie: `MoodleSession=${newSession}`,
          "User-Agent": "MisTareasApp/1.0",
        },
        redirect: "manual",
      });
      location = testResp.headers.get("location") ?? "";
    }

    // After testsession (or directly), a /login/ redirect means bad credentials
    if (location.includes("/login/")) {
      return { session: null, error: "Usuario o contraseña incorrectos" };
    }

    // Step 3 — Fetch the dashboard to extract sesskey + full name
    const dashResp = await fetch(`${BASE}/my/`, {
      headers: {
        Cookie: `MoodleSession=${newSession}`,
        "User-Agent": "MisTareasApp/1.0",
      },
    });
    const dashHtml = await dashResp.text();

    // Extract sesskey (needed for AJAX calls)
    let sesskey = "";
    const sesskeyPatterns = [
      /"sesskey"\s*:\s*"([a-zA-Z0-9]{10,})"/,
      /name="sesskey"\s+value="([a-zA-Z0-9]{10,})"/,
      /sesskey=([a-zA-Z0-9]{10,})/,
    ];
    for (const p of sesskeyPatterns) {
      const m = dashHtml.match(p);
      if (m?.[1]) {
        sesskey = m[1];
        break;
      }
    }

    // Extract full name
    let userFullname = username;
    const $ = load(dashHtml);
    const nameEl = $(
      ".usertext, .usermenu .username, [data-region='user-info'] .name, .loggedinas a",
    ).first();
    if (nameEl.text().trim()) {
      userFullname = nameEl.text().trim();
    } else {
      const jsonMatch = dashHtml.match(/"fullname"\s*:\s*"([^"]+)"/);
      if (jsonMatch?.[1]) userFullname = jsonMatch[1];
    }

    return {
      session: { sessionToken: newSession, sesskey, userFullname },
      error: null,
    };
  } catch {
    return {
      session: null,
      error: "Error de conexión. Verifique su conexión a internet.",
    };
  }
}

export async function getMoodleTasks(
  sessionToken: string,
  sesskey: string,
): Promise<MoodleTask[]> {
  const now = Math.floor(Date.now() / 1000);
  const future = now + 90 * 24 * 60 * 60; // 90 days

  // Primary: Moodle internal AJAX service (works even with web services disabled)
  if (sesskey) {
    try {
      const ajaxResp = await fetch(
        `${BASE}/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}&info=core_calendar_get_action_events_by_timesort`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `MoodleSession=${sessionToken}`,
            "X-Requested-With": "XMLHttpRequest",
            "User-Agent": "MisTareasApp/1.0",
          },
          body: JSON.stringify([
            {
              index: 0,
              methodname: "core_calendar_get_action_events_by_timesort",
              args: {
                limitnum: 100,
                timesortfrom: now,
                timesortto: future,
                limittononsuspendedevents: true,
              },
            },
          ]),
        },
      );

      if (ajaxResp.ok) {
        const text = await ajaxResp.text();
        let json: unknown;
        try {
          json = JSON.parse(text);
        } catch {
          json = null;
        }

        if (Array.isArray(json) && json[0] && !json[0].error) {
          const events: unknown[] = json[0].data?.events ?? [];
          if (events.length >= 0) {
            return (events as any[]).map(
              (e): MoodleTask => ({
                id: String(e.id),
                title: cleanTitle(String(e.name ?? "Sin título")),
                courseName: String(
                  e.course?.fullname ?? e.coursename ?? "",
                ),
                dueDate: e.timesort
                  ? new Date(Number(e.timesort) * 1000).toISOString()
                  : null,
                description: null,
                url: e.url ? String(e.url) : null,
              }),
            );
          }
        }
      }
    } catch {
      // Fall through to HTML scraping
    }
  }

  // Fallback: scrape the upcoming calendar page
  return scrapeUpcomingEvents(sessionToken);
}

async function scrapeUpcomingEvents(
  sessionToken: string,
): Promise<MoodleTask[]> {
  try {
    const resp = await fetch(`${BASE}/calendar/view.php?view=upcoming`, {
      headers: {
        Cookie: `MoodleSession=${sessionToken}`,
        "User-Agent": "MisTareasApp/1.0",
      },
    });

    if (resp.url.includes("/login/")) return []; // Session expired

    const html = await resp.text();
    const $ = load(html);
    const tasks: MoodleTask[] = [];

    $("[data-event-id], .event").each((_i, el) => {
      const $el = $(el);
      const id =
        $el.attr("data-event-id") ??
        String(Date.now() + Math.random() * 1000);
      const title =
        $el.find(".name a, .event-name a, h3.name a").first().text().trim() ||
        $el.find(".name, .event-name").first().text().trim();

      if (!title) return;

      const courseName = $el
        .find(".course-name, .course a, .col-11 small")
        .first()
        .text()
        .trim();
      const href =
        $el.find("a").first().attr("href") ?? null;

      tasks.push({
        id,
        title: cleanTitle(title),
        courseName,
        dueDate: null,
        description: null,
        url: href,
      });
    });

    return tasks;
  } catch {
    return [];
  }
}
