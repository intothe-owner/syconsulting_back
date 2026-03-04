// ✅ apply.routes.ts (FIREBASE_SERVICE_ACCOUNT_JSON "그대로 JSON" 방식)
// - 신청 저장 성공
// - 이메일 발송
// - FCM 토큰 테이블에서 활성 토큰 조회 후 푸시 발송(실패 토큰 자동 비활성화)
// --------------------------------------------

import { Router, Request, Response } from "express";
import { sendEmail } from "../utils/mailer";
import { Apply } from "../models/Apply";

// ✅ FCM
import admin from "firebase-admin";
import { FcmToken } from "../models/FcmToken"; // ✅ 경로 맞게 수정
import { Op } from "sequelize";

const router = Router();

// ✅ 신청 폼 타입(필드명은 프론트와 맞추세요)
type ApplyBody = {
  classType?: "AI" | "CODING" | "";
  name?: string;
  phone?: string; // 하이픈 포함 가능
  district?: string; // 구/군
  neighborhoodDetail?: string; // 동네
  motivation?: string;
  howFound?: string;

  phoneDigits?: string;
  address?: string;
  recommender?:string;
  privacyAgree?: boolean;
};

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const onlyDigits = (v: any) => String(v ?? "").replace(/[^0-9]/g, "");

// ✅ Firebase Admin 초기화 (한번만)
// ✅ 환경변수: FIREBASE_SERVICE_ACCOUNT_JSON 에 "서비스계정 JSON 전체"를 그대로 넣는 방식
function ensureFirebaseAdmin() {
  if (admin.apps.length) return;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing");

  // ✅ JSON 그대로 파싱 (base64 아님)
  // ✅ private_key 내 줄바꿈이 \n 형태로 들어가 있어야 함.
  const serviceAccount = JSON.parse(raw);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// ✅ FCM 발송 유틸: 활성 토큰 전체에 멀티캐스트(최대 500개씩)
async function sendFcmToAllDevices(params: {
  title: string;
  body: string;
  url: string;
}) {
  ensureFirebaseAdmin();

  // ✅ 활성 토큰만
  const rows = await FcmToken.findAll({
    where: { isActive: true },
    attributes: ["token"],
    order: [["updatedAt", "DESC"]],
  });

  const tokens = rows.map((r: any) => r.token).filter(Boolean);

  if (!tokens.length) return { sent: 0, success: 0, failure: 0 };

  // ✅ 500개씩 자르기
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += 500) chunks.push(tokens.slice(i, i + 500));

  let totalSuccess = 0;
  let totalFailure = 0;

  for (const chunk of chunks) {
    const resp = await admin.messaging().sendEachForMulticast({
      tokens: chunk,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: {
        url: params.url, // ✅ 앱에서 push_url로 받아 WebView loadUrl 하게 연결
      },
    });

    totalSuccess += resp.successCount;
    totalFailure += resp.failureCount;

    // ✅ 실패 토큰 정리(특히 not registered)
    const invalidTokens: string[] = [];
    resp.responses.forEach((r, idx) => {
      if (!r.success) {
        const msg = r.error?.message ?? "";
        if (msg.includes("registration-token-not-registered")) {
          invalidTokens.push(chunk[idx]);
        }
      }
    });

    if (invalidTokens.length) {
      await FcmToken.update(
        { isActive: false },
        { where: { token: invalidTokens } }
      );
    }
  }

  return { sent: tokens.length, success: totalSuccess, failure: totalFailure };
}
const ALLOWED_STATUS = ["NEW", "CONTACTED", "DONE", "CANCELLED"] as const;
type ApplyStatus = (typeof ALLOWED_STATUS)[number];

function isValidStatus(v: any): v is ApplyStatus {
  return ALLOWED_STATUS.includes(v);
}

function toIds(raw: any): number[] {
  const ids = Array.isArray(raw) ? raw : [];
  return ids
    .map((x) => Number(x))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * ✅ 개별 삭제
 * DELETE /apply/:id
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "잘못된 id" });
    }

    const item = await Apply.findByPk(id);
    if (!item) return res.status(404).json({ message: "데이터가 없습니다." });

    await item.destroy();
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("apply delete error:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * ✅ 일괄 삭제
 * POST /apply/bulk-delete
 * body: { ids: number[] }
 */
router.post("/bulk-delete", async (req: Request, res: Response) => {
  try {
    const ids = toIds(req.body?.ids);
    if (!ids.length) return res.status(400).json({ message: "ids가 필요합니다." });

    const deleted = await Apply.destroy({ where: { id: { [Op.in]: ids } } });
    return res.status(200).json({ ok: true, deleted });
  } catch (e) {
    console.error("apply bulk-delete error:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * ✅ 개별 상태 변경
 * PATCH /apply/:id/status
 * body: { status: "NEW"|"CONTACTED"|"DONE"|"CANCELLED" }
 */
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;

    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "잘못된 id" });
    }
    if (!isValidStatus(status)) {
      return res.status(400).json({ message: "status 값이 올바르지 않습니다." });
    }

    const item = await Apply.findByPk(id);
    if (!item) return res.status(404).json({ message: "데이터가 없습니다." });

    await item.update({ status });
    return res.status(200).json({ ok: true, item });
  } catch (e) {
    console.error("apply status error:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * ✅ 일괄 상태 변경
 * PATCH /apply/bulk-status
 * body: { ids: number[], status: "NEW"|"CONTACTED"|"DONE"|"CANCELLED" }
 */
router.patch("/bulk-status", async (req: Request, res: Response) => {
  try {
    const ids = toIds(req.body?.ids);
    const status = req.body?.status;

    if (!ids.length) return res.status(400).json({ message: "ids가 필요합니다." });
    if (!isValidStatus(status)) {
      return res.status(400).json({ message: "status 값이 올바르지 않습니다." });
    }

    const [updated] = await Apply.update(
      { status },
      { where: { id: { [Op.in]: ids } } }
    );

    return res.status(200).json({ ok: true, updated });
  } catch (e) {
    console.error("apply bulk-status error:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize ?? 20)));
    const offset = (page - 1) * pageSize;

    const q = String(req.query.q ?? "").trim();
    const classType = String(req.query.classType ?? "").trim(); // AI|CODING
    const status = String(req.query.status ?? "").trim(); // NEW|...
    const district = String(req.query.district ?? "").trim();
    const order = String(req.query.order ?? "new"); // new|old
    const from = String(req.query.from ?? "").trim(); // YYYY-MM-DD
    const to = String(req.query.to ?? "").trim(); // YYYY-MM-DD

    const where: any = {};

    if (classType === "AI" || classType === "CODING") where.classType = classType;
    if (status) where.status = status;
    if (district) where.district = district;

    // 날짜 범위(createdAt)
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(`${from}T00:00:00.000Z`);
      if (to) where.createdAt[Op.lte] = new Date(`${to}T23:59:59.999Z`);
    }

    // 통합 검색
    if (q) {
      where[Op.or] = [
        { name: { [Op.like]: `%${q}%` } },
        { phone: { [Op.like]: `%${q}%` } },
        { phoneDigits: { [Op.like]: `%${q}%` } },
        { address: { [Op.like]: `%${q}%` } },
        { motivation: { [Op.like]: `%${q}%` } },
        { howFound: { [Op.like]: `%${q}%` } },
      ];
    }

    const { rows, count } = await Apply.findAndCountAll({
      where,
      offset,
      limit: pageSize,
      order: [["createdAt", order === "old" ? "ASC" : "DESC"]],
      // ✅ 목록에서는 필요한 것만 내려주기 (관리자 UI 속도)
      attributes: [
        "id",
        "classType",
        "name",
        "phone",
        "phoneDigits",
        "district",
        "neighborhoodDetail",
        "address",
        "howFound",
        "status",
        "privacyAgree",
        "recommender",
        "createdAt",
        "updatedAt",
      ],
    });

    return res.status(200).json({
      ok: true,
      page,
      pageSize,
      total: count,
      totalPages: Math.ceil(count / pageSize),
      items: rows,
    });
  } catch (error) {
    console.error("apply list error:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * ✅ 상세
 * GET /apply/:id
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: "잘못된 id" });
    }

    const item = await Apply.findByPk(id);

    if (!item) {
      return res.status(404).json({ message: "데이터가 없습니다." });
    }

    return res.status(200).json({ ok: true, item });
  } catch (error) {
    console.error("apply detail error:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
});
router.post("/", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as ApplyBody;

    // ✅ 최소 검증
    if (!body.classType || !body.name || !body.phone) {
      return res.status(400).json({ message: "필수 항목 누락" });
    }
    if (!body.district || !body.neighborhoodDetail) {
      return res
        .status(400)
        .json({ message: "사는 동네(구/군, 동/읍/면)를 입력해 주세요." });
    }
    if (!body.motivation || !String(body.motivation).trim()) {
      return res.status(400).json({ message: "지원동기를 입력해 주세요." });
    }
    if (!body.howFound) {
      return res.status(400).json({ message: "알게 된 계기를 선택해 주세요." });
    }
    if (!body.privacyAgree) {
      return res
        .status(400)
        .json({ message: "개인정보처리방침 동의가 필요합니다." });
    }

    const classLabel =
      body.classType === "AI"
        ? "AI 수업"
        : body.classType === "CODING"
        ? "코딩 수업"
        : "-";

    const phoneDigits = body.phoneDigits?.trim()
      ? onlyDigits(body.phoneDigits)
      : onlyDigits(body.phone);

    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      return res
        .status(400)
        .json({ message: "연락처는 10~11자리로 입력해 주세요." });
    }

    const address =
      body.address?.trim() ||
      [body.district, body.neighborhoodDetail].filter(Boolean).join(" ").trim();

    // ✅ 1) DB 저장
    const saved = await Apply.create({
      classType: body.classType as "AI" | "CODING",
      name: String(body.name).trim(),
      phone: String(body.phone).trim(),
      phoneDigits,
      district: String(body.district).trim(),
      neighborhoodDetail: String(body.neighborhoodDetail).trim(),
      address,
      motivation: String(body.motivation).trim(),
      howFound: body.howFound as any,
      recommender:String(body.recommender),
      privacyAgree: true,
      status: "NEW",
    });

    // --- 이메일 본문 ---
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px">수강 신청 접수</h2>
        <p style="margin:0 0 10px;color:#6b7280;font-size:12px">
          신청번호: <b>${esc(saved.id)}</b>
        </p>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb;width:160px">수업 종류</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(classLabel)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">이름</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(body.name)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">연락처</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(body.phone)}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">사는 동네</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(address || "-")}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">알게 된 계기</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(body.howFound || "-")}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">지원동기</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;white-space:pre-wrap">${esc(
                body.motivation || "-"
              )}</td>
            </tr>
            <tr>
              <td style="padding:8px 10px;border:1px solid #e5e7eb;background:#f9fafb">추천인</td>
              <td style="padding:8px 10px;border:1px solid #e5e7eb">${esc(body.recommender || "-")}</td>
            </tr>
          </tbody>
        </table>
        <p style="margin:12px 0 0;color:#6b7280;font-size:12px">
          본 메일은 수강 신청 폼 제출로 자동 발송되었습니다.
        </p>
      </div>
    `;

    // ✅ 2) 이메일 발송
    await sendEmail({
      to: "shindong1440@gmail.com",
      subject: `수강신청 - ${classLabel} (${esc(body.name)})`,
      html,
    });

    // ✅ 3) 이메일 발송 후 FCM도 같이 발송
    const pushTitle = "수강신청 접수";
    const pushBody = `${classLabel} 신청이 접수되었습니다. (${esc(body.name)})`;
    const pushUrl = "http://www.syconsulting.co.kr/admin/apply"; // ✅ 관리자 화면 URL로 수정 권장

    try {
      const result = await sendFcmToAllDevices({
        title: pushTitle,
        body: pushBody,
        url: pushUrl,
      });
      console.log("FCM result:", result);
    } catch (e) {
      console.error("FCM send error:", e);
    }

    return res.status(200).json({ ok: true, id: saved.id });
  } catch (error) {
    console.error("신청 처리 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
