import { Router, type IRouter } from "express";
import healthRouter from "./health";
import foldersRouter from "./folders";
import embedsRouter from "./embeds";
import statsRouter from "./stats";
import extractRouter from "./extract";

const router: IRouter = Router();

router.use(healthRouter);
router.use(foldersRouter);
router.use(embedsRouter);
router.use(statsRouter);
router.use(extractRouter);

export default router;
