"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(e: FormEvent) {
    e.preventDefault(); setError("");
    const r = await fetch("/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ passcode }) });
    if (!r.ok) { setError("That passcode didn't work."); return; }
    router.replace("/"); router.refresh();
  }
  return <main><form className="card" onSubmit={submit}>
    <div className="eyebrow">Private prototype</div>
    <h1>Homeschool Study</h1>
    <p className="muted">V0.1 is restricted while we test voice grading and AI usage.</p>
    <label htmlFor="passcode">Prototype passcode</label>
    <input id="passcode" type="password" autoFocus value={passcode} onChange={e=>setPasscode(e.target.value)} />
    {error && <div className="error">{error}</div>}
    <div style={{marginTop:16}}><button type="submit">Enter</button></div>
  </form></main>;
}
