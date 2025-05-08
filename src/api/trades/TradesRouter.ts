import { Router } from "express";
import { TraderController } from "./TradesController";

const router = Router();

router.post("/trades", TraderController.trade);
router.post("/trades/uniV2", TraderController.tradeV2);
router.post("/trades/uniV3", TraderController.tradeV3);
router.post("/trades/uniV4", TraderController.tradeV4);

export default router;
