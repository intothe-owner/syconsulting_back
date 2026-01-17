import { Router, Request, Response } from "express";
import { sendEmail } from "../utils/mailer";

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
};

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

router.post("/", async (req: Request, res: Response) => {
  try {
    const body = (req.body ?? {}) as ApplyBody;

    // ✅ 최소 검증(필요하면 더 추가)
    if (!body.classType || !body.name || !body.phone) {
      return res.status(400).json({ message: "필수 항목 누락" });
    }

    const classLabel =
      body.classType === "AI" ? "AI 수업" : body.classType === "CODING" ? "코딩 수업" : "-";

    const address = [body.district, body.neighborhoodDetail].filter(Boolean).join(" ");

    // --- 이메일 본문 ---
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2 style="margin:0 0 12px">수강 신청 접수</h2>
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
          </tbody>
        </table>
        <p style="margin:12px 0 0;color:#6b7280;font-size:12px">
          본 메일은 수강 신청 폼 제출로 자동 발송되었습니다.
        </p>
      </div>
    `;

    await sendEmail({
      to: "shindong1440@gmail.com",
      subject: `수강신청 - ${classLabel} (${esc(body.name)})`,
      html,
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("신청 메일 전송 오류:", error);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
