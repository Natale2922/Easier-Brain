import { Router, type IRouter } from "express";
import healthRouter from "./health";
import universityRouter from "./university";

const router: IRouter = Router();

router.use(healthRouter);
router.use(universityRouter);

export default router;
