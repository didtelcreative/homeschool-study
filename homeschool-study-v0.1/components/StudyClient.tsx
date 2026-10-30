"use client";

import { useRef, useState } from "react";
import { studyQuestions } from "../lib/questions";

type AnswerResult = {
  questionId: string;
  transcript: string;
  outcome: "graded" | "hint" | "skipped";
  grade: "correct" | "almost" | "incorrect";
  attemptFound: string[];
  found: string[];
  missing: string[];
  feedback: string;
};

type SessionStatus = "strong" | "learning" | "needs-review";

type SessionQuestionResult = {
  questionId: string;
  subject: string;
  prompt: string;
  status: SessionStatus;
  mastery: number;
};

function statusLabel(status: SessionStatus) {
  if (status === "strong") return "Strong";
  if (status === "learning") return "Learning";
  return "Needs Review";
}

export default function StudyClient() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const helpCountRef = useRef(0);
  const questionHadSupportRef = useRef(false);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnswerResult | null>(null);
  const [foundSoFar, setFoundSoFar] = useState<string[]>([]);
  const [helpCount, setHelpCount] = useState(0);
  const [error, setError] = useState("");
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionResults, setSessionResults] = useState<SessionQuestionResult[]>([]);
  const [masteryByQuestion, setMasteryByQuestion] = useState<Record<string, number>>(
    () => Object.fromEntries(studyQuestions.map((q) => [q.id, q.startingMastery]))
  );

  const question = studyQuestions[questionIndex];
  const mastery = masteryByQuestion[question.id] ?? question.startingMastery;
  const progressPercent = ((questionIndex + 1) / studyQuestions.length) * 100;

  function saveSessionResult(status: SessionStatus, masteryValue: number) {
    const nextResult: SessionQuestionResult = {
      questionId: question.id,
      subject: question.subject,
      prompt: question.prompt,
      status,
      mastery: masteryValue,
    };

    setSessionResults((current) => {
      const existingIndex = current.findIndex((item) => item.questionId === question.id);
      if (existingIndex === -1) return [...current, nextResult];

      const next = [...current];
      next[existingIndex] = nextResult;
      return next;
    });
  }

  function resetQuestionState() {
    setResult(null);
    setFoundSoFar([]);
    helpCountRef.current = 0;
    setHelpCount(0);
    questionHadSupportRef.current = false;
    setError("");
  }

  async function startRecording() {
    setError("");
    setResult(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        await submitAnswer(blob);
      };

      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone access was blocked or unavailable.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function sendForm(form: FormData) {
    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/answer", {
        method: "POST",
        body: form,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Answer processing failed");

      applyResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAnswer(blob: Blob) {
    const form = new FormData();
    form.append("audio", blob, "answer.webm");
    form.append("questionId", question.id);
    form.append("priorFound", JSON.stringify(foundSoFar));
    form.append("helpCount", String(helpCountRef.current));
    await sendForm(form);
  }

  async function askForHelp() {
    const form = new FormData();
    form.append("questionId", question.id);
    form.append("priorFound", JSON.stringify(foundSoFar));
    form.append("helpCount", String(helpCountRef.current));
    form.append("intent", "dont-know");
    await sendForm(form);
  }

  function applyResult(data: AnswerResult) {
    setResult(data);

    if (data.outcome === "hint") {
      questionHadSupportRef.current = true;
      const nextHelpCount = helpCountRef.current + 1;
      helpCountRef.current = nextHelpCount;
      setHelpCount(nextHelpCount);
      return;
    }

    if (data.outcome === "skipped") {
      questionHadSupportRef.current = true;
      saveSessionResult("needs-review", mastery);
      setFoundSoFar([]);
      return;
    }

    if (data.grade === "correct") {
      const nextMastery = Math.min(5, mastery + 1);

      setMasteryByQuestion((current) => ({
        ...current,
        [question.id]: nextMastery,
      }));

      saveSessionResult(
        questionHadSupportRef.current ? "learning" : "strong",
        nextMastery
      );
      setFoundSoFar([]);
      return;
    }

    questionHadSupportRef.current = true;

    if (data.grade === "almost") {
      setFoundSoFar(data.found || []);
    }
  }

  function nextQuestion() {
    if (questionIndex >= studyQuestions.length - 1) {
      setSessionComplete(true);
      return;
    }

    setQuestionIndex((index) => index + 1);
    resetQuestionState();
  }

  function restartSession() {
    setQuestionIndex(0);
    resetQuestionState();
    setSessionComplete(false);
    setSessionResults([]);
    setRecording(false);
    setBusy(false);
  }

  const resultTitle =
    result?.outcome === "hint"
      ? "Here's a hint"
      : result?.outcome === "skipped"
        ? "We'll come back to it"
        : result?.grade === "correct"
          ? "✓ You got it"
          : result?.grade === "almost"
            ? "Keep going"
            : "Let's think about it";

  const canMoveOn = result?.grade === "correct" || result?.outcome === "skipped";

  if (sessionComplete) {
    const strongCount = sessionResults.filter((item) => item.status === "strong").length;
    const learningCount = sessionResults.filter((item) => item.status === "learning").length;
    const needsReviewCount = sessionResults.filter(
      (item) => item.status === "needs-review"
    ).length;

    return (
      <div className="card">
        <div className="eyebrow">V0.1.5 · Study session complete</div>
        <div className="question">Nice work — you finished your study session.</div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 10,
            margin: "20px 0",
          }}
        >
          <div className="panel" style={{ margin: 0, textAlign: "center" }}>
            <strong style={{ fontSize: 24 }}>{sessionResults.length}</strong>
            <div className="muted">Reviewed</div>
          </div>
          <div className="panel" style={{ margin: 0, textAlign: "center" }}>
            <strong style={{ fontSize: 24 }}>{strongCount}</strong>
            <div className="muted">Strong</div>
          </div>
          <div className="panel" style={{ margin: 0, textAlign: "center" }}>
            <strong style={{ fontSize: 24 }}>{learningCount}</strong>
            <div className="muted">Learning</div>
          </div>
          <div className="panel" style={{ margin: 0, textAlign: "center" }}>
            <strong style={{ fontSize: 24 }}>{needsReviewCount}</strong>
            <div className="muted">Needs Review</div>
          </div>
        </div>

        <div className="panel">
          <strong>Session summary</strong>

          <div style={{ marginTop: 12 }}>
            {studyQuestions.map((item) => {
              const itemResult = sessionResults.find(
                (sessionItem) => sessionItem.questionId === item.id
              );
              const itemMastery = masteryByQuestion[item.id] ?? item.startingMastery;

              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderTop: "1px solid rgba(127, 127, 127, 0.2)",
                  }}
                >
                  <div>
                    <strong>{item.subject}</strong>
                    <div className="muted" style={{ fontSize: 13 }}>
                      {itemResult ? statusLabel(itemResult.status) : "Not completed"}
                    </div>
                  </div>
                  <div style={{ whiteSpace: "nowrap" }}>Mastery {itemMastery}/5</div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="mic" onClick={restartSession} aria-label="Start session again">
          ↻
        </button>
        <p style={{ textAlign: "center" }} className="muted">
          Study again
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="eyebrow">
        {question.subject} · Question {questionIndex + 1} of {studyQuestions.length}
      </div>

      <div
        aria-label={`Study progress: question ${questionIndex + 1} of ${studyQuestions.length}`}
        style={{
          height: 8,
          width: "100%",
          borderRadius: 999,
          overflow: "hidden",
          background: "rgba(127, 127, 127, 0.18)",
          margin: "10px 0 20px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            borderRadius: 999,
            background: "currentColor",
            transition: "width 180ms ease",
          }}
        />
      </div>

      <div className="question">{question.prompt}</div>

      {!recording ? (
        <button
          className="mic"
          onClick={startRecording}
          disabled={busy || canMoveOn}
          aria-label="Start recording"
        >
          🎤
        </button>
      ) : (
        <button className="mic recording" onClick={stopRecording} aria-label="Stop recording">
          ■
        </button>
      )}

      <p style={{ textAlign: "center" }} className="muted">
        {recording
          ? "Listening… tap to finish"
          : busy
            ? "Listening to your answer…"
            : canMoveOn
              ? questionIndex === studyQuestions.length - 1
                ? "Ready to finish your session."
                : "Ready for the next question."
              : foundSoFar.length > 0
                ? "You can say just the part you still remember."
                : helpCount > 0
                  ? "Try the question again, or tell me if you still don't know."
                  : "Tap the microphone, answer naturally, then tap again."}
      </p>

      {!canMoveOn && !recording && (
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <button onClick={askForHelp} disabled={busy}>
            I don't know yet
          </button>
        </div>
      )}

      <div className="mastery">
        <strong>Mastery</strong>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`dot ${n <= mastery ? "on" : ""}`} />
        ))}
      </div>

      {result && (
        <div className="panel">
          <strong>{resultTitle}</strong>
          {result.transcript && (
            <p>
              <b>I heard:</b> “{result.transcript}”
            </p>
          )}
          <p>{result.feedback}</p>

          {canMoveOn && (
            <button onClick={nextQuestion} style={{ marginTop: 8 }}>
              {questionIndex === studyQuestions.length - 1 ? "Finish session" : "Next question"}
            </button>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  );
}
