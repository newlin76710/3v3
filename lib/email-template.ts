import { BANK_INFO } from "@/lib/utils";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// 將後台輸入的純文字內容轉換為協會信件版型的 HTML
export function buildBroadcastEmailHtml(subject: string, plainTextContent: string): string {
  const bodyHtml = escapeHtml(plainTextContent).replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Microsoft JhengHei',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <tr>
            <td style="background-color:#111827;padding:20px 24px;">
              <span style="color:#ffffff;font-size:16px;font-weight:bold;">${escapeHtml(BANK_INFO.accountName)}</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;">
              <h1 style="margin:0 0 16px;font-size:18px;color:#111827;">${escapeHtml(subject)}</h1>
              <div style="font-size:14px;line-height:1.8;color:#374151;">${bodyHtml}</div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">此信件由 ${escapeHtml(BANK_INFO.accountName)} 系統發送，請勿直接回覆。</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
