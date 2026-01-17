import { Router } from "express";
import { z } from "zod";
import { Op } from "sequelize";
import { Notice } from "../models/Notice";
import { sequelize } from "../db/sequelize";
import { authJwt } from "../middleware/authJwt";
import { requireAdmin } from "../middleware/requireAdmin";

const r = Router();

const createSchema = z.object({
  title: z.string().min(2).max(200),
  content: z.string().min(5),
});

const updateSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  content: z.string().min(5).optional(),
});

const listSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  q: z.string().optional(), // 제목 검색
});

/**
 * ✅ 목록(공개)
 * GET /notices?page=1&pageSize=10&q=키워드
 */
r.get("/", async (req, res) => {
    console.log('공지사항');
  try {
     const parsed = listSchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ message: "Invalid query" });

  const { page, pageSize, q } = parsed.data;
  const offset = (page - 1) * pageSize;

  const where: any = {};
  if (q?.trim()) {
    where.title = { [Op.like]: `%${q.trim()}%` };
  }

  const { rows, count } = await Notice.findAndCountAll({
    where,
    order: [["createdAt", "DESC"]],
    limit: pageSize,
    offset,
    attributes: ["id", "title", "views", "createdAt"],
  });

  return res.json({
    items: rows.map((x) => ({
      id: x.id,
      title: x.title,
      views: x.views,
      date: x.createdAt, // 프론트에서 YYYY-MM-DD로 포맷
    })),
    page,
    pageSize,
    total: count,
    totalPages: Math.ceil(count / pageSize),
  });
  } catch (error) {
    console.error(error);
  }
 
});

/**
 * ✅ 상세(공개) + 조회수 +1
 * GET /notices/:id
 */
r.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

  const result = await sequelize.transaction(async (t) => {
    const notice = await Notice.findByPk(id, { transaction: t });
    if (!notice) return null;

    notice.views += 1;
    await notice.save({ transaction: t });

    return notice;
  });

  if (!result) return res.status(404).json({ message: "Not found" });

  return res.json({
    id: result.id,
    title: result.title,
    content: result.content,
    views: result.views,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  });
});

/**
 * ✅ 등록(관리자)
 * POST /notices
 */
r.post("/", authJwt, requireAdmin, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

  const { title, content } = parsed.data;

  const created = await Notice.create({ title, content, views: 0 });

  return res.status(201).json({
    id: created.id,
    title: created.title,
    content: created.content,
    views: created.views,
    createdAt: created.createdAt,
  });
});

/**
 * ✅ 수정(관리자)
 * PUT /notices/:id
 */
r.put("/:id", authJwt, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: "Invalid body" });

  const notice = await Notice.findByPk(id);
  if (!notice) return res.status(404).json({ message: "Not found" });

  if (parsed.data.title !== undefined) notice.title = parsed.data.title;
  if (parsed.data.content !== undefined) notice.content = parsed.data.content;

  await notice.save();

  return res.json({
    id: notice.id,
    title: notice.title,
    content: notice.content,
    views: notice.views,
    updatedAt: notice.updatedAt,
  });
});

/**
 * ✅ 삭제(관리자)
 * DELETE /notices/:id
 */
r.delete("/:id", authJwt, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid id" });

  const notice = await Notice.findByPk(id);
  if (!notice) return res.status(404).json({ message: "Not found" });

  await notice.destroy();

  return res.json({ ok: true });
});

export default r;
