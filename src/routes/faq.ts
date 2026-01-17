import { Router } from "express";
import { optionalAuthJwt } from "../middleware/optionalAuthJwt";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  listFaqs,
  createFaq,
  deleteFaq,
  reorderFaqs,
} from "../controllers/faq.controller";

const router = Router();

// ✅ 누구나 조회
router.get("/", listFaqs);

// ✅ 관리자만
router.post("/", authJwt, requireAdmin, createFaq);
router.delete("/:id", authJwt, requireAdmin, deleteFaq);
router.put("/reorder", authJwt, requireAdmin, reorderFaqs);

export default router;
