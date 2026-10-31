export type GradingMode = "key-concepts";

export type StudyConcept = {
  id: string;
  label: string;
  aliases: string[];
};

export type StudyQuestion = {
  id: string;
  curriculumId: string;
  curriculumLabel: string;
  levelId: string;
  levelLabel: string;
  lessonId: string;
  lessonLabel: string;
  week: number;
  subject: string;
  prompt: string;
  expectedAnswer: string;
  hint: string;
  gradingMode: GradingMode;
  concepts: StudyConcept[];
  startingMastery: number;
};

export type QuestionProgress = {
  questionId: string;
  mastery: number;
  correctStreak: number;
  needsReview: boolean;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
};

export type ProgressByQuestion = Record<string, QuestionProgress>;

export type SessionOutcome = "strong" | "learning" | "needs-review";

export type StudySessionOptions = {
  curriculumId: string;
  levelId: string;
  currentWeek: number;
  sessionSize: number;
};

export type StudySession = {
  curriculumId: string;
  levelId: string;
  currentWeek: number;
  questions: StudyQuestion[];
};
