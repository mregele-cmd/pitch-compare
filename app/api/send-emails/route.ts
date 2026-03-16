import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use the service role key if available (bypasses RLS), otherwise fall back to anon key.
// For this route we only need read access so the anon key is fine for now.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function buildEmailHtml(studentName: string, magicLink: string): string {
  const firstName = studentName.split(" ")[0];
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Pitch Grading Assignments</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#4f46e5;padding:28px 36px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">
                🎬 PitchCompare
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;">
                Hi ${firstName}, your pitch comparisons are ready!
              </h1>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#475569;">
                Your professor has assigned you a set of business pitch videos to evaluate.
                Watch each pair and vote for the stronger pitch — the whole process takes about
                <strong>10–15 minutes</strong>.
              </p>

              <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Here's how it works:</p>
              <ul style="margin:0 0 28px;padding-left:20px;font-size:14px;line-height:1.8;color:#475569;">
                <li>You'll be shown two pitches side-by-side.</li>
                <li>Watch both videos, then click <strong>Choose this pitch</strong> for the stronger one.</li>
                <li>Your unique link below will load your assignments automatically — no login needed.</li>
              </ul>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td style="background:#4f46e5;border-radius:10px;">
                    <a href="${magicLink}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Start Grading →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#94a3b8;">
                Or copy and paste this link into your browser:<br />
                <a href="${magicLink}" style="color:#4f46e5;word-break:break-all;">${magicLink}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 36px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                This email was sent by your professor via PitchCompare. If you believe this
                was sent in error, please contact your instructor.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  // Derive the app's base URL from the incoming request (works for localhost and production)
  const baseUrl = new URL(request.url).origin;

  // 1. Find all students who have at least one pending assignment
  const { data: pendingRows, error: pendingErr } = await supabase
    .from("assignments")
    .select("student_id")
    .eq("status", "pending");

  if (pendingErr) {
    return NextResponse.json({ error: pendingErr.message }, { status: 500 });
  }

  if (!pendingRows?.length) {
    return NextResponse.json(
      { error: "No students have pending assignments. Generate assignments first." },
      { status: 400 }
    );
  }

  // Deduplicate student IDs
  const studentIds = [...new Set(pendingRows.map((r) => r.student_id))];

  // 2. Fetch those students' names and emails
  const { data: students, error: studentsErr } = await supabase
    .from("students")
    .select("id, name, email")
    .in("id", studentIds);

  if (studentsErr || !students?.length) {
    return NextResponse.json(
      { error: studentsErr?.message ?? "Could not fetch student records." },
      { status: 500 }
    );
  }

  // 3. Build magic links for all students and log them to the terminal.
  //    TESTING MODE: only one real email is sent (to Resend's sandbox address).
  //    Resend's free tier rejects all recipients except `delivered@resend.dev`.
  //    TODO: replace TEST_RECIPIENT with s.email and remove the [0] slice once
  //          a verified sending domain is configured in the Resend dashboard.
  const TEST_RECIPIENT = "mregele@gmail.com";

  const allStudentsWithLinks = students.map((s) => ({
    ...s,
    magicLink: `${baseUrl}/vote?studentId=${s.id}`,
  }));

  // Log every student's magic link so you can test the voting UI without sending emails
  console.log("\n[send-emails] Magic links for all students with pending assignments:");
  allStudentsWithLinks.forEach((s) => {
    console.log(`  ${s.name} <${s.email}>\n    ${s.magicLink}`);
  });
  console.log("");

  // Send a real email only for the first student
  const first = allStudentsWithLinks[0];
  console.log(`[send-emails] Sending test email to ${TEST_RECIPIENT} on behalf of ${first.name}…`);

  const { data: sendData, error: resendErr } = await resend.emails.send({
    from:    "onboarding@resend.dev",
    to:      TEST_RECIPIENT,
    subject: `[For ${first.name}] Your Pitch Grading Assignments`,
    html:    buildEmailHtml(first.name, first.magicLink),
  });

  if (resendErr) {
    console.error("[send-emails] Resend error:", JSON.stringify(resendErr, null, 2));
    return NextResponse.json({ error: resendErr.message }, { status: 500 });
  }

  console.log("[send-emails] Resend response:", JSON.stringify(sendData, null, 2));

  return NextResponse.json({
    sent: 1,
    total: students.length,
  });
}
