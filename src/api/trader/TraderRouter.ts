import { Router } from "express";

const router = Router();

router.get("/test", (req, res) => {
  res.json({ message: "Hello, world!" });
});

export default router;
