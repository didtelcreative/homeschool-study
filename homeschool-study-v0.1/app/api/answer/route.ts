import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../lib/auth";
import { getStudyQuestion, type StudyConcept } from "../../../lib/questions";

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function phraseIsPresent(text: string, alias: string) {
  const normalizedAlias = normalize(alias);
  if (!normalizedAlias) return false;

  const pattern = normalizedAlias
    .split(" ")
    .map(escapeRegex)
    .join("\\s+");

  return new RegExp(`(?:^|\\s)${pattern}(?:$|\\s)`, "i").test(text);
}

function conceptsActuallyHeard(transcript: string, concepts: StudyConcept[]) {
  const text = normalize(transcript);

  return concepts
    .filter((concept) => concept.aliases.some((alias) => phraseIsPresent(text, alias)))
    .map((concept) => concept.id);
}

function parsePriorFound(value: FormDataEntryValue | null, allowedIds: string[]) {
  if (typeof value !== "string" || !value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return allowedIds.filter((id) => parsed.includes(id));
  } catch {
    return [];
  }
}

function parseHelpCount(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function uniqueConcepts(allowedIds: string[], ...sets: string[][]) {
  return allowedIds.filter((id) => sets.some((set) => set.includes(id)));
}

function isDontKnowIntent(text: string) {
  const value = normalize(text).replace(/'/g, "");
  const phrases = [
    "i dont know",
    "dont know",
    "i do not know",
    "do not know",
    "im not sure",
    "i am not sure",
    "not sure",
    "i cant remember",
    "i cannot remember",
    "cant remember",
    "i forgot",
    "i forget",
    "no idea",
  ];

  return phrases.some((phrase) => value === phrase || value.startsWith(`${phrase} `));
}

function helpResponse(question: ReturnType<typeof getStudyQuestion>, helpCount: number, transcript = "") {
  if (!question) {
    return NextResponse.json({ error: "Unknown study question" }, { status: 400 });
  }

  if (helpCount >= 1) {
    return NextResponse.json({
      questionId: question.id,
      transcript,
      outcome: "skipped",
      grade: "incorrect",
      attemptFound: [],
      found: [],
      missing: question.concepts.map((concept) => concept.id),
      feedback: "No problem. We'll come back to this one later.",
    });
  }

  return NextResponse.json({
    questionId: question.id,
    transcript,
    outcome: "hint",
    grade: "incorrect",
    attemptFound: [],
    found: [],
    missing: question.concepts.map((concept) => concept.id),
    feedback: question.hint,
  });
}

function extractResponseText(response: any): string {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  if (!Array.isArray(response?.output)) return "";

  const parts: string[] = [];
  for (const item of response.output) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function labelsFor(ids: string[], concepts: StudyConcept[]) {
  return ids
    .map((id) => concepts.find((concept) => concept.id === id)?.label)
    .filter(Boolean) as string[];
}

function fallbackFeedback(params: {
  grade: "correct" | "almost" | "incorrect";
  attemptFound: string[];
  found: string[];
  priorFound: string[];
  concepts: StudyConcept[];
}) {
  const { grade, attemptFound, found, priorFound, concepts } = params;
  const attemptLabels = labelsFor(attemptFound, concepts);
  const foundLabels = labelsFor(found, concepts);

  if (grade === "correct") {
    if (priorFound.length > 0 && attemptLabels.length > 0) {
      return `That's it — ${attemptLabels.join(" and ")} finishes the answer. Nice work!`;
    }
    return "Yes — you got it!";
  }

  if (grade === "almost") {
    if (foundLabels.length === 1) {
      return `Good start — you've got ${foundLabels[0]}. What else belongs in the answer?`;
    }
    return `Nice — you've got ${foundLabels.join(" and ")}. What else belongs in the answer?`;
  }

  return "Not quite yet. Think about what the question is asking and tell me what you remember.";
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await request.formData();
  const questionId = typeof form.get("questionId") === "string" ? String(form.get("questionId")) : "";
  const question = getStudyQuestion(questionId);

  if (!question) {
    return NextResponse.json({ error: "Unknown study question" }, { status: 400 });
  }

  const allowedIds = question.concepts.map((concept) => concept.id);
  const priorFound = parsePriorFound(form.get("priorFound"), allowedIds);
  const helpCount = parseHelpCount(form.get("helpCount"));
  const intent = typeof form.get("intent") === "string" ? String(form.get("intent")) : "";

  // The on-screen "I don't know yet" button uses the same behavior as saying it aloud.
  if (intent === "dont-know") {
    return helpResponse(question, helpCount);
  }

  const audio = form.get("audio");
  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "No audio received" }, { status: 400 });
  }

  if (audio.size > 5_000_000) {
    return NextResponse.json({ error: "Audio is too large" }, { status: 413 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured yet" }, { status: 503 });
  }

  const vocabulary = Array.from(
    new Set(question.concepts.flatMap((concept) => [concept.label, ...concept.aliases]))
  );

  const upstream = new FormData();
  upstream.append("file", audio, audio.name || "answer.webm");
  upstream.append("model", "gpt-transcribe");
  upstream.append(
    "prompt",
    `A child is answering this homeschool question: "${question.prompt}" Transcribe exactly what the child says. Possible vocabulary includes: ${vocabulary.join(", ")}. The child may also say that they do not know or cannot remember. Do not add words the child did not say.`
  );
  vocabulary.slice(0, 20).forEach((word) => upstream.append("keywords[]", word));
  upstream.append("languages[]", "en");

  const transcriptionResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!transcriptionResponse.ok) {
    console.error("Transcription failed:", await transcriptionResponse.text());
    return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
  }

  const transcription = await transcriptionResponse.json();
  const transcript = String(transcription.text ?? "").trim();

  if (!transcript) {
    return NextResponse.json({
      questionId: question.id,
      transcript: "",
      outcome: "graded",
      grade: "incorrect",
      attemptFound: [],
      found: priorFound,
      missing: allowedIds.filter((id) => !priorFound.includes(id)),
      feedback: "I didn't quite catch that. Say just the part you're thinking of one more time.",
    });
  }

  // Spoken uncertainty is treated as a request for help rather than an academic wrong answer.
  if (isDontKnowIntent(transcript)) {
    return helpResponse(question, helpCount, transcript);
  }

  const attemptFound = conceptsActuallyHeard(transcript, question.concepts);
  const found = uniqueConcepts(allowedIds, priorFound, attemptFound);
  const missing = allowedIds.filter((id) => !found.includes(id));

  const grade: "correct" | "almost" | "incorrect" =
    found.length === allowedIds.length ? "correct" : found.length > 0 ? "almost" : "incorrect";

  const fallback = fallbackFeedback({
    grade,
    attemptFound,
    found,
    priorFound,
    concepts: question.concepts,
  });

  const feedbackResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-6-luna",
      reasoning: { effort: "none" },
      input: [
        {
          role: "system",
          content:
            "You are a warm homeschool teacher talking directly to a child. The app's grading data is authoritative: never claim the child demonstrated a concept that was not actually heard. Do not sound like a test report. If correct, celebrate briefly and stop. If partial, acknowledge what the child has already demonstrated and ask only for what remains, without naming the missing answer. If the question requires a finite list, make sure the follow-up still points toward completing the entire original list. If incorrect but related, build on the child's idea with one small guiding question that points back toward the complete original learning target. Do not simply repeat the original question. Do not give away the answer. Keep it to one or two short, natural sentences. Do not use labels such as grade, found, missing, correct, incorrect, or almost.",
        },
        {
          role: "user",
          content: `Question: ${question.prompt}\nExpected answer: ${question.expectedAnswer}\nCurrent transcript: ${transcript}\nConcepts demonstrated before this attempt: ${labelsFor(priorFound, question.concepts).join(", ") || "none"}\nConcepts heard in this attempt: ${labelsFor(attemptFound, question.concepts).join(", ") || "none"}\nConcepts demonstrated across attempts: ${labelsFor(found, question.concepts).join(", ") || "none"}\nConcepts still missing: ${labelsFor(missing, question.concepts).join(", ") || "none"}\nApp grade: ${grade}`,
        },
      ],
    }),
  });

  let feedback = fallback;

  if (feedbackResponse.ok) {
    const response = await feedbackResponse.json();
    const generated = extractResponseText(response);
    if (generated) feedback = generated;
  } else {
    console.error("Feedback generation failed:", await feedbackResponse.text());
  }

  return NextResponse.json({
    questionId: question.id,
    transcript,
    outcome: "graded",
    grade,
    attemptFound,
    found,
    missing,
    feedback,
  });
}
