export type AppLanguage = "de" | "en";

export type LocalizedText = Record<AppLanguage, string>;

export type CategoryId =
  | "movement"
  | "nutrition"
  | "mental"
  | "sleep"
  | "social";

export type TrafficLight = "green" | "amber" | "red";

export type QuestionOption = {
  id: string;
  label: LocalizedText;
  score: number;
};

export type Question = {
  id: string;
  category: CategoryId;
  prompt: LocalizedText;
  hint?: LocalizedText;
  options: readonly QuestionOption[];
  maxScore: 3;
};

export type AnswerMap = Record<string, string>;

export type CategoryScore = {
  category: CategoryId;
  achieved: number;
  maximum: number;
  percentage: number;
  status: TrafficLight;
};

export type AssessmentResult = {
  id: string;
  questionnaireVersion: string;
  completedAt: string;
  webId: string;
  answers: AnswerMap;
  categories: CategoryScore[];
  achieved: number;
  maximum: number;
  percentage: number;
};

export type SolidFetch = typeof globalThis.fetch;

export type HealthQuestionnaireSession = {
  info: {
    isLoggedIn: boolean;
    webId: string | null;
  };
  fetch: SolidFetch;
};
