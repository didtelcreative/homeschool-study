import {
  type ProgressByQuestion,
  type QuestionProgress,
  type SessionOutcome,
  type StudyQuestion,
  type StudySession,
  type StudySessionOptions,
} from "./study-model";

const DAY_MS = 24 * 60 * 60 * 1000;

export function createInitialProgress(questions: StudyQuestion[]): ProgressByQuestion {
  return Object.fromEntries(
    questions.map((question) => [
      question.id,
      {
        questionId: question.id,
        mastery: question.startingMastery,
        correctStreak: 0,
        needsReview: false,
        lastReviewedAt: null,
        nextReviewAt: null,
      },
    ])
  );
}

function reviewDelayDays(mastery: number, outcome: SessionOutcome) {
  if (outcome === "needs-review") return 1;
  if (outcome === "learning") return mastery >= 4 ? 3 : 2;

  if (mastery >= 5) return 14;
  if (mastery === 4) return 7;
  if (mastery === 3) return 4;
  return 2;
}

export function updateProgressAfterOutcome(
  current: QuestionProgress,
  outcome: SessionOutcome,
  reviewedAt = new Date()
): QuestionProgress {
  const mastery =
    outcome === "strong"
      ? Math.min(5, current.mastery + 1)
      : outcome === "learning"
        ? Math.min(5, current.mastery + 1)
        : Math.max(0, current.mastery - 1);

  const correctStreak =
    outcome === "strong"
      ? current.correctStreak + 1
      : outcome === "learning"
        ? Math.max(1, current.correctStreak)
        : 0;

  const nextReviewAt = new Date(
    reviewedAt.getTime() + reviewDelayDays(mastery, outcome) * DAY_MS
  ).toISOString();

  return {
    ...current,
    mastery,
    correctStreak,
    needsReview: outcome === "needs-review",
    lastReviewedAt: reviewedAt.toISOString(),
    nextReviewAt,
  };
}

function isDue(progress: QuestionProgress, now: Date) {
  if (progress.needsReview) return true;
  if (!progress.nextReviewAt) return false;
  return new Date(progress.nextReviewAt).getTime() <= now.getTime();
}

function priorityScore(
  question: StudyQuestion,
  progress: QuestionProgress,
  currentWeek: number,
  now: Date
) {
  let score = 0;

  if (progress.needsReview) score += 1000;
  if (isDue(progress, now)) score += 500;

  if (question.week === currentWeek) score += 300;
  else if (question.week < currentWeek) score += 180 - Math.min(120, (currentWeek - question.week) * 10);
  else score -= (question.week - currentWeek) * 200;

  score += (5 - progress.mastery) * 35;
  score -= progress.correctStreak * 8;

  return score;
}

export function buildStudySession(
  allQuestions: StudyQuestion[],
  progressByQuestion: ProgressByQuestion,
  options: StudySessionOptions,
  now = new Date()
): StudySession {
  const eligible = allQuestions.filter(
    (question) =>
      question.curriculumId === options.curriculumId &&
      question.levelId === options.levelId &&
      question.week <= options.currentWeek
  );

  const ranked = [...eligible].sort((a, b) => {
    const progressA = progressByQuestion[a.id];
    const progressB = progressByQuestion[b.id];

    const scoreA = priorityScore(a, progressA, options.currentWeek, now);
    const scoreB = priorityScore(b, progressB, options.currentWeek, now);

    if (scoreA !== scoreB) return scoreB - scoreA;
    if (a.week !== b.week) return b.week - a.week;
    return a.id.localeCompare(b.id);
  });

  return {
    curriculumId: options.curriculumId,
    levelId: options.levelId,
    currentWeek: options.currentWeek,
    questions: ranked.slice(0, Math.max(1, options.sessionSize)),
  };
}
