import { Router } from "express";
import { SystemController } from "./SystemController";

const router = Router();

router.get("/health", SystemController.health);

export default router;

