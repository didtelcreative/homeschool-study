import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "study_v01_session";

function signature() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update("v0.1-private-access").digest("hex");
}

export async function isAuthenticated() {
  const expected = signature();
  if (!expected) return false;
  const store = await cookies();
  const actual = store.get(COOKIE_NAME)?.value;
  if (!actual || actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

export async function createSession() {
  const sig = signature();
  if (!sig) throw new Error("SESSION_SECRET is not configured");
  const store = await cookies();
  store.set(COOKIE_NAME, sig, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/"
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
