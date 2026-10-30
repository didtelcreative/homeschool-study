import { NextResponse } from "next/server";
import crypto from "crypto";
import { createSession } from "../../../lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const submitted = String(body.passcode ?? "");
  const expected = process.env.APP_PASSCODE ?? "";
  if (!expected || submitted.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(expected))) {
    return NextResponse.json({ ok: false, error: "Incorrect passcode" }, { status: 401 });
  }
  await createSession();
  return NextResponse.json({ ok: true });
}
