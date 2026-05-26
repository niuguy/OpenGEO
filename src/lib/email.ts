import nodemailer from "nodemailer";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
}

type VisibilityAlertOptions = {
  to: string;
  businessName: string;
  businessId: string;
  provider: string;
  previousScore: number;
  newScore: number;
  delta: number;
  direction: "improved" | "dropped";
  topCompetitor: string | null;
};

export async function sendVisibilityAlert(opts: VisibilityAlertOptions): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) return; // SMTP not configured — silent skip

  const from = process.env.FROM_EMAIL ?? "alerts@nearbyai.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dashboardUrl = `${appUrl}/businesses/${opts.businessId}`;

  const isDropped = opts.direction === "dropped";
  const changeWord = isDropped ? "dropped" : "improved";
  const changeSign = isDropped ? "↓" : "↑";
  const subject = `${changeSign} AI visibility ${changeWord} ${Math.abs(opts.delta)} points — ${opts.businessName}`;

  const competitorLine = opts.topCompetitor
    ? `<p style="margin:0 0 8px">Top displacing competitor: <strong>${opts.topCompetitor}</strong></p>`
    : "";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:system-ui,sans-serif;background:#f8fafc;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden">
    <div style="background:${isDropped ? "#7f1d1d" : "#14532d"};padding:20px 24px">
      <p style="margin:0;font-size:11px;color:${isDropped ? "#fca5a5" : "#86efac"};letter-spacing:1px;text-transform:uppercase">AI Visibility Alert · nearbyAI</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#fff">${opts.businessName}</h1>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px;font-size:15px;color:#0f172a">
        ChatGPT AI visibility has <strong>${changeWord}</strong> by
        <strong>${Math.abs(opts.delta)} points</strong> since the last monitoring run.
      </p>
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <div style="flex:1;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:14px;text-align:center">
          <p style="margin:0 0 4px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Previous</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:#64748b">${opts.previousScore}%</p>
        </div>
        <div style="flex:1;background:${isDropped ? "#fef2f2" : "#f0fdf4"};border:1px solid ${isDropped ? "#fecaca" : "#bbf7d0"};border-radius:6px;padding:14px;text-align:center">
          <p style="margin:0 0 4px;font-size:11px;color:${isDropped ? "#991b1b" : "#166534"};text-transform:uppercase;letter-spacing:0.5px">Now</p>
          <p style="margin:0;font-size:24px;font-weight:700;color:${isDropped ? "#991b1b" : "#166534"}">${opts.newScore}%</p>
        </div>
      </div>
      ${competitorLine}
      <a href="${dashboardUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;border-radius:6px;padding:10px 20px;font-size:14px;font-weight:600;margin-top:8px">
        View Full Report →
      </a>
      <p style="margin:20px 0 0;font-size:11px;color:#94a3b8">
        You're receiving this because monitoring is enabled for ${opts.businessName}.
        Provider: ${opts.provider} · Threshold: ±10 points
      </p>
    </div>
  </div>
</body>
</html>`;

  await transporter.sendMail({ from, to: opts.to, subject, html });
}
