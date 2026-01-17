import { Router } from "express";
import {
  listQna,
  readQna,
  createQna,
  updateQna,
  deleteQna,
  verifyQnaPassword,
} from "../controllers/qna.controller";
import { optionalAuthJwt } from "../middleware/optionalAuthJwt";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";

const router = Router();

router.get("/", listQna);
router.get("/:id", optionalAuthJwt, readQna); // ✅ 상세: 관리자 토큰이면 비번 없이

router.post("/", createQna);
router.post("/:id/verify", verifyQnaPassword);
// ✅ 수정/삭제는 관리자 전용
router.put("/:id", updateQna);
router.delete("/:id",  deleteQna);

export default router;
