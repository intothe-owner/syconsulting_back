import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "crypto"; // ✅ 변경
import { putObjectToS3 } from "../services/s3";
import { Gallery } from "../models/Gallery";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

function ensureImage(file: Express.Multer.File) {
  if (!file.mimetype.startsWith("image/")) {
    const err: any = new Error("이미지 파일만 업로드 가능합니다.");
    err.status = 400;
    throw err;
  }
}

const THUMB_SIZE = 320;

router.post(
  "/upload",
  upload.array("files", 10),
  async (req, res, next) => {
    try {
      const files = (req.files as Express.Multer.File[]) ?? [];
      if (files.length === 0) {
        return res.status(400).json({ message: "업로드 파일이 없습니다." });
      }

      const createdBy = (req as any).user?.id ?? null;
      const results: any[] = [];

      for (const file of files) {
        ensureImage(file);

        const meta = await sharp(file.buffer).metadata();

        const thumbBuffer = await sharp(file.buffer)
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: "cover" })
          .webp({ quality: 82 })
          .toBuffer();

        const ext = (file.originalname.split(".").pop() || "jpg").toLowerCase();
        const baseId = randomUUID(); // ✅ 변경

        const imageKey = `gallery/original/${baseId}.${ext}`;
        const thumbKey = `gallery/thumb/${baseId}.webp`;

        const uploadedOriginal = await putObjectToS3({
          key: imageKey,
          body: file.buffer,
          contentType: file.mimetype,
        });

        const uploadedThumb = await putObjectToS3({
          key: thumbKey,
          body: thumbBuffer,
          contentType: "image/webp",
        });

        const row = await Gallery.create({
          title: null,
          description: null,
          imageUrl: uploadedOriginal.url,
          thumbUrl: uploadedThumb.url,
          imageKey,
          thumbKey,
          originalName: file.originalname,
          mimeType: file.mimetype,
          fileSize: file.size,
          width: meta.width ?? null,
          height: meta.height ?? null,
          sortOrder: 0,
          isPublished: true,
          createdBy,
        });

        results.push(row);
      }

      return res.json({ message: "ok", items: results });
    } catch (e: any) {
    console.error("[gallery/upload] error:", e); // ✅ 서버 콘솔 출력

    const status =
      e?.status || (e?.code === "LIMIT_FILE_SIZE" ? 413 : 500);

    return res.status(status).json({
      ok: false,
      message: e?.message ,
      code: e?.code,          // multer 등에서 유용
      name: e?.name,
    });
  }
  }
);

router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(60, Math.max(1, Number(req.query.pageSize ?? 24)));
    const offset = (page - 1) * pageSize;

    const { rows, count } = await Gallery.findAndCountAll({
      where: { isPublished: true },
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
      limit: pageSize,
      offset,
    });

    res.json({
      page,
      pageSize,
      total: count,
      items: rows.map((r) => ({
        id: String(r.id),
        title: r.title,
        thumbUrl: r.thumbUrl,
        imageUrl: r.imageUrl,
      })),
    });
  } catch (e) {
    next(e);
  }
});

export default router;
