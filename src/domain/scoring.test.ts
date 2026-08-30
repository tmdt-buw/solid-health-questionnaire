import { describe, expect, it } from "vitest";
import { QUESTIONS } from "../data/questionnaire";
import { createAssessmentResult, questionnaireComplete, trafficLightFor } from "./scoring";

const answersBy = (select: "best" | "worst") =>
  Object.fromEntries(
    QUESTIONS.map((question) => {
      const sorted = [...question.options].sort((left, right) => left.score - right.score);
      return [question.id, (select === "best" ? sorted.at(-1) : sorted[0])!.id];
    })
  );

describe("questionnaire scoring", () => {
  it("produces the Excel evaluation maxima for best-scoring answers", () => {
    const result = createAssessmentResult({
      answers: answersBy("best"),
      webId: "https://pod.example/alice/profile/card#me",
      id: "fixed-id",
      completedAt: "2026-08-28T10:00:00.000Z",
    });

    expect(result.achieved).toBe(54);
    expect(result.maximum).toBe(54);
    expect(result.percentage).toBe(100);
    expect(Object.fromEntries(result.categories.map((score) => [score.category, [score.achieved, score.maximum, score.status]]))).toEqual({
      movement: [9, 9, "green"],
      nutrition: [24, 24, "green"],
      mental: [9, 9, "green"],
      sleep: [6, 6, "green"],
      social: [6, 6, "green"],
    });
  });

  it("keeps a full reproducible answer snapshot", () => {
    const answers = answersBy("worst");
    const result = createAssessmentResult({
      answers,
      webId: "https://pod.example/alice/profile/card#me",
    });
    expect(result.answers).toEqual(answers);
    expect(result.answers).not.toBe(answers);
    expect(result.maximum).toBe(54);
  });

  it("rejects an incomplete assessment", () => {
    expect(questionnaireComplete({})).toBe(false);
    expect(() => createAssessmentResult({ answers: {}, webId: "https://pod.example/#me" })).toThrow(/incomplete/i);
  });

  it("uses documented inclusive traffic-light thresholds", () => {
    expect(trafficLightFor(100)).toBe("green");
    expect(trafficLightFor(80)).toBe("green");
    expect(trafficLightFor(79)).toBe("amber");
    expect(trafficLightFor(50)).toBe("amber");
    expect(trafficLightFor(49)).toBe("red");
    expect(trafficLightFor(0)).toBe("red");
  });
});

