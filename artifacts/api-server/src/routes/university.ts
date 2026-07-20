import { Router, type IRouter } from "express";
import {
  UniversityLoginBody,
  GetUniversityTasksQueryParams,
} from "@workspace/api-zod";
import { moodleLogin, getMoodleTasks } from "../lib/moodle";

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
  const parsed = GetUniversityTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(401).json({ error: "Session token requerido" });
    return;
  }

  const { sessionToken, sesskey } = parsed.data;
  req.log.info("Fetching university tasks");

  const tasks = await getMoodleTasks(sessionToken, sesskey);
  req.log.info({ count: tasks.length }, "University tasks fetched");

  res.json({ tasks });
});

export default router;
