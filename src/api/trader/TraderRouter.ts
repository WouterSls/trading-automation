import { Router } from "express";
import { TraderController } from "./TraderController";

const router = Router();

router.post("/trade", TraderController.trade);

export default router;
