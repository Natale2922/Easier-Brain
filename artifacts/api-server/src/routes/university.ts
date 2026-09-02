import { Router, type IRouter } from "express";
import {
  UniversityLoginBody,
  GetUniversityTasksQueryParams,
  GetUniversityGradesBody,
} from "@workspace/api-zod";
import { moodleLogin, getMoodleTasks } from "../lib/moodle";
import { getSiiAcademicData } from "../lib/sii";

const router: IRouter = Router();

router.post("/university/login", async (req, res): Promise<void> => {
  const parsed = UniversityLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Datos de acceso inválidos",
      sessionToken: null,
      sesskey: null,
      userFullname: null,
    });
    return;
  }

  const { username, password } = parsed.data;
  req.log.info({ username }, "University login attempt");

  const { session, error } = await moodleLogin(username, password);

  if (!session) {
    req.log.warn({ username, error }, "University login failed");
    res.json({
      success: false,
      error,
      sessionToken: null,
      sesskey: null,
      userFullname: null,
    });
    return;
  }

  req.log.info({ username }, "University login successful");
  res.json({
    success: true,
    sessionToken: session.sessionToken,
    sesskey: session.sesskey,
    userFullname: session.userFullname,
    error: null,
  });
});

router.get("/university/tasks", async (req, res): Promise<void> => {
  // Never cache — Moodle sessions and task lists change constantly
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.removeHeader("ETag");

  const parsed = GetUniversityTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(401).json({ error: "Session token requerido", sessionExpired: false });
    return;
  }

  const { sessionToken, sesskey } = parsed.data;
  req.log.info("Fetching university tasks");

  try {
    const tasks = await getMoodleTasks(sessionToken, sesskey);
    req.log.info({ count: tasks.length }, "University tasks fetched");
    res.json({ tasks, sessionExpired: false });
  } catch (err) {
    if (err instanceof Error && err.message === "SESSION_EXPIRED") {
      req.log.warn("University session expired — client should re-authenticate");
      // Return 200 so generated clients don't throw; include sessionExpired flag
      res.json({ tasks: [], sessionExpired: true });
      return;
    }
    req.log.error({ err }, "Error fetching tasks");
    res.json({ tasks: [], sessionExpired: false });
  }
});

router.post("/university/grades", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.removeHeader("ETag");
  const parsed = GetUniversityGradesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Datos de acceso inválidos", data: null });
    return;
  }

  try {
    const data = await getSiiAcademicData(parsed.data.username, parsed.data.password);
    res.json({ success: true, error: null, data });
  } catch (err) {
    req.log.warn({ error: err instanceof Error ? err.message : "unknown" }, "SII grades sync failed");
    res.json({
      success: false,
      error: err instanceof Error && err.message === "SII_LOGIN_FAILED"
        ? "No se pudo iniciar sesión en el SII con tu cuenta universitaria."
        : "El SII no está disponible en este momento.",
      data: null,
    });
  }
});

export default router;
