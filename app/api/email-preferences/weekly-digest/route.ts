import { NextResponse } from "next/server";
import { verifyWeeklyDigestPreferenceToken } from "@/src/services/digestService";
import { UserRepository } from "@/src/repositories/userRepository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const action = url.searchParams.get("action") ?? "";
  const userId = verifyWeeklyDigestPreferenceToken(token);

  if (!userId || action !== "unsubscribe") {
    return new NextResponse("This unsubscribe link is invalid or expired.", { status: 400 });
  }

  await UserRepository.updateProfile(userId, { weeklyDigestEnabled: false });

  return new NextResponse(
    `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Weekly digest unsubscribed</title>
  </head>
  <body style="font-family:Inter,Arial,sans-serif;color:#111827;background:#f9fafb;margin:0;padding:40px">
    <main style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:28px">
      <h1 style="font-size:22px;margin:0 0 12px">Weekly digest unsubscribed</h1>
      <p style="font-size:14px;line-height:1.6;margin:0 0 20px;color:#4b5563">You will no longer receive Operon weekly digest emails.</p>
      <a href="/dashboard/settings?section=notifications" style="color:#111827;font-weight:600">Open preference center</a>
    </main>
  </body>
</html>`,
    { headers: { "content-type": "text/html; charset=utf-8" } },
  );
}
