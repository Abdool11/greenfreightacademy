import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  // Allow unauthenticated requests in development for easy testing
  if (process.env.NODE_ENV !== "development") {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await req.json();
    const { to, subject, html } = body;

    if (!to || typeof to !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'to' field" },
        { status: 400 }
      );
    }

    await sendEmail({
      from: process.env.BREVO_SMTP_LOGIN || "test@greenfreightacademy.co.za",
      fromName: "GFA Test",
      to,
      subject: subject || "Brevo test email from GFA",
      html:
        html ||
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#16a34a;">Test email from Green Freight Academy</h2>
          <p>This is a test message sent via Brevo SMTP.</p>
          <p style="color:#6b7280;font-size:12px;">Sent at ${new Date().toISOString()}</p>
        </div>`,
    });

    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[test-email] Failed:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
