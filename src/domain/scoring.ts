import {
  CATEGORY_ORDER,
  QUESTIONNAIRE_VERSION,
  QUESTIONS,
} from "../data/questionnaire";
import type {
  AnswerMap,
  AssessmentResult,
  CategoryId,
  CategoryScore,
  TrafficLight,
} from "../types";

export const trafficLightFor = (percentage: number): TrafficLight => {
  if (percentage >= 80) return "green";
  if (percentage >= 50) return "amber";
  return "red";
};

export const getQuestionScore = (questionId: string, optionId: string): number => {
  const question = QUESTIONS.find((candidate) => candidate.id === questionId);
  const selected = question?.options.find((candidate) => candidate.id === optionId);
  if (!question || !selected) {
    throw new Error(`Unknown questionnaire answer: ${questionId}=${optionId}`);
  }
  return selected.score;
};

const categoryScore = (category: CategoryId, answers: AnswerMap): CategoryScore => {
  const questions = QUESTIONS.filter((question) => question.category === category);
  const maximum = questions.reduce((sum, question) => sum + question.maxScore, 0);
  const achieved = questions.reduce((sum, question) => {
    const selected = answers[question.id];
    if (!selected) throw new Error(`Missing answer for ${question.id}`);
    return sum + getQuestionScore(question.id, selected);
  }, 0);
  const percentage = Math.round((achieved / maximum) * 100);

  return {
    category,
    achieved,
    maximum,
    percentage,
    status: trafficLightFor(percentage),
  };
};

export const questionnaireComplete = (answers: AnswerMap): boolean =>
  QUESTIONS.every((question) => Boolean(answers[question.id]));

const createAssessmentId = (): string => {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `assessment-${Date.now()}`;
};

export const createAssessmentResult = ({
  answers,
  webId,
  id = createAssessmentId(),
  completedAt = new Date().toISOString(),
}: {
  answers: AnswerMap;
  webId: string;
  id?: string;
  completedAt?: string;
}): AssessmentResult => {
  if (!questionnaireComplete(answers)) {
    throw new Error("The questionnaire is incomplete.");
  }

  const categories = CATEGORY_ORDER.map((category) => categoryScore(category, answers));
  const achieved = categories.reduce((sum, category) => sum + category.achieved, 0);
  const maximum = categories.reduce((sum, category) => sum + category.maximum, 0);
  const percentage = Math.round((achieved / maximum) * 100);

  return {
    id,
    questionnaireVersion: QUESTIONNAIRE_VERSION,
    completedAt,
    webId,
    answers: Object.fromEntries(
      QUESTIONS.map((question) => [question.id, answers[question.id]])
    ),
    categories,
    achieved,
    maximum,
    percentage,
  };
};
