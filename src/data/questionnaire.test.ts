import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER, QUESTIONS, QUESTIONS_BY_CATEGORY } from "./questionnaire";

describe("questionnaire definition", () => {
  it("contains the supplied 18 questions and 54 available points", () => {
    expect(QUESTIONS).toHaveLength(18);
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(18);
    expect(QUESTIONS.reduce((sum, question) => sum + question.maxScore, 0)).toBe(54);
  });

  it("matches the supplied category maxima", () => {
    const maxima = Object.fromEntries(
      CATEGORY_ORDER.map((category) => [
        category,
        QUESTIONS_BY_CATEGORY[category].reduce((sum, question) => sum + question.maxScore, 0),
      ])
    );
    expect(maxima).toEqual({
      movement: 9,
      nutrition: 24,
      mental: 9,
      sleep: 6,
      social: 6,
    });
  });

  it("preserves the exceptional meat, sleep and soft-drink scores", () => {
    const scores = (questionId: string) =>
      Object.fromEntries(
        QUESTIONS.find((question) => question.id === questionId)!.options.map((answer) => [
          answer.id,
          answer.score,
        ])
      );

    expect(scores("nutrition-meat-frequency")).toMatchObject({
      never: 3,
      "1-2-week": 3,
      "3-4-week": 2,
      "5-6-week": 1,
      daily: 0,
      "multiple-daily": 0,
    });
    expect(scores("nutrition-soft-drink-amount")).toEqual({
      never: 3,
      "under-glass": 3,
      "one-glass": 2,
      "two-glasses": 1,
      "over-two-glasses": 0,
    });
    expect(scores("sleep-duration")).toEqual({
      "under-7h": 1,
      "7-8h": 3,
      "over-8h": 2,
    });
  });
});

