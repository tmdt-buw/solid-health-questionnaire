import {
  createSolidDataset,
  getInteger,
  getStringNoLocale,
  getStringWithLocale,
  getThing,
  getUrl,
  getUrlAll,
  setInteger,
  setStringNoLocale,
  setThing,
  setUrl,
} from "@inrupt/solid-client";
import { describe, expect, it, vi } from "vitest";
import { QUESTIONS } from "../data/questionnaire";
import { createAssessmentResult } from "../domain/scoring";
import {
  AssessmentValidationError,
  buildAssessmentDataset,
  deriveCssPodRoot,
  HEALTH_QUESTIONNAIRE_VOCAB,
  normalizePodRoot,
  parseAssessmentDataset,
  resolvePodRoot,
  storageUrls,
} from "./storage";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCTERMS = "http://purl.org/dc/terms/";
const SCHEMA = "https://schema.org/";
const ownerWebId = "https://pod.example/alice/profile/card#me";
const resourceUrl =
  "https://pod.example/alice/solid-health-questionnaire/latest.ttl";

const bestAnswers = Object.fromEntries(
  QUESTIONS.map((question) => [
    question.id,
    [...question.options].sort((left, right) => right.score - left.score)[0].id,
  ])
);

const assessmentFixture = () => {
  const result = createAssessmentResult({
    answers: bestAnswers,
    webId: ownerWebId,
    id: "assessment-1",
    completedAt: "2026-08-28T12:30:00.000Z",
  });
  return {
    result,
    dataset: buildAssessmentDataset(resourceUrl, result),
  };
};

describe("Solid Pod storage resolution", () => {
  const fetcher = vi.fn() as unknown as typeof fetch;

  it("uses a declared Pod URL and preserves its trailing slash", async () => {
    const resolver = vi.fn().mockResolvedValue(["https://storage.example/alice"]);
    await expect(
      resolvePodRoot("https://id.example/alice#me", fetcher, resolver)
    ).resolves.toBe("https://storage.example/alice/");
  });

  it.each([
    ["https://storage.example/alice", "https://storage.example/alice/"],
    ["https://storage.example/alice/", "https://storage.example/alice/"],
    ["http://localhost:3000/alice", "http://localhost:3000/alice/"],
    ["http://127.0.0.1:3000/alice/", "http://127.0.0.1:3000/alice/"],
  ])("normalizes safe Pod root %s", (input, expected) => {
    expect(normalizePodRoot(input)).toBe(expected);
  });

  it.each([
    "http://storage.example/alice/",
    "ftp://storage.example/alice/",
    "https://user:secret@storage.example/alice/",
    "https://storage.example/alice/?view=all",
    "https://storage.example/alice/#private",
  ])("rejects unsafe Pod root %s", (input) => {
    expect(() => normalizePodRoot(input)).toThrow(/safe HTTPS URL/);
  });

  it("only derives the canonical CSS profile layout after an empty result", async () => {
    expect(deriveCssPodRoot("https://solid.example/alice/profile/card#me")).toBe(
      "https://solid.example/alice/"
    );
    expect(() => deriveCssPodRoot("https://id.example/alice#me")).toThrow(/No Pod storage/);
  });

  it("does not guess a Pod root after profile or network failure", async () => {
    const resolver = vi.fn().mockRejectedValue(new Error("offline"));
    await expect(
      resolvePodRoot("https://solid.example/alice/profile/card#me", fetcher, resolver)
    ).rejects.toThrow(/unavailable/);
  });

  it("keeps all private resources inside the dedicated subtree", () => {
    expect(storageUrls("https://pod.example/alice/")).toMatchObject({
      app: "https://pod.example/alice/solid-health-questionnaire/",
      assessments: "https://pod.example/alice/solid-health-questionnaire/assessments/",
      latest: "https://pod.example/alice/solid-health-questionnaire/latest.ttl",
    });
  });

  it("serializes reproducible assessment, category and answer RDF", () => {
    const { dataset, result } = assessmentFixture();

    const assessment = getThing(dataset, `${resourceUrl}#assessment`);
    const nutrition = getThing(dataset, `${resourceUrl}#category-nutrition`);
    const firstQuestion = getThing(dataset, `${resourceUrl}#question-1`);
    const firstAnswer = getThing(dataset, `${resourceUrl}#answer-1`);

    expect(assessment).not.toBeNull();
    expect(
      getUrl(assessment!, "http://purl.org/dc/terms/creator")
    ).toBe(result.webId);
    expect(
      getInteger(assessment!, `${HEALTH_QUESTIONNAIRE_VOCAB}maximumScore`)
    ).toBe(54);
    expect(
      getStringNoLocale(firstAnswer!, `${HEALTH_QUESTIONNAIRE_VOCAB}questionId`)
    ).toBe(QUESTIONS[0].id);
    expect(getUrlAll(assessment!, RDF_TYPE)).toEqual([
      `${HEALTH_QUESTIONNAIRE_VOCAB}HealthQuestionnaireAssessment`,
    ]);
    expect(getUrl(firstQuestion!, RDF_TYPE)).toBe(`${SCHEMA}Question`);
    expect(getUrl(firstAnswer!, RDF_TYPE)).toBe(`${SCHEMA}Answer`);
    expect(
      getUrl(firstAnswer!, `${HEALTH_QUESTIONNAIRE_VOCAB}answersQuestion`)
    ).toBe(`${resourceUrl}#question-1`);
    expect(getStringWithLocale(firstAnswer!, `${SCHEMA}text`, "de")).toBe(
      QUESTIONS[0].options[0].label.de
    );
    expect(
      getInteger(nutrition!, "https://schema.org/bestRating")
    ).toBe(24);
  });
});

describe("saved assessment integrity", () => {
  it("classifies malformed RDF as an assessment validation error", () => {
    expect(() =>
      parseAssessmentDataset(createSolidDataset(), resourceUrl, ownerWebId)
    ).toThrow(AssessmentValidationError);
  });

  it("round-trips a valid dataset and binds it to the current WebID", () => {
    const { dataset, result } = assessmentFixture();
    expect(parseAssessmentDataset(dataset, resourceUrl, ownerWebId)).toEqual(result);
    expect(() =>
      parseAssessmentDataset(
        dataset,
        resourceUrl,
        "https://pod.example/mallory/profile/card#me"
      )
    ).toThrow(/different WebID/);
  });

  it("rejects a manipulated per-answer score", () => {
    const { dataset } = assessmentFixture();
    const answerUrl = `${resourceUrl}#answer-1`;
    const answer = getThing(dataset, answerUrl)!;
    const manipulated = setThing(
      dataset,
      setInteger(answer, `${HEALTH_QUESTIONNAIRE_VOCAB}achievedScore`, 0)
    );

    expect(() => parseAssessmentDataset(manipulated, resourceUrl, ownerWebId)).toThrow(
      new RegExp(`answer for ${QUESTIONS[0].id} is inconsistent`)
    );
  });

  it("rejects manipulated category and aggregate scores even when answers are intact", () => {
    const { dataset } = assessmentFixture();
    const categoryUrl = `${resourceUrl}#category-nutrition`;
    const category = getThing(dataset, categoryUrl)!;
    const categoryManipulated = setThing(
      dataset,
      setInteger(category, `${SCHEMA}ratingValue`, 0)
    );
    expect(() =>
      parseAssessmentDataset(categoryManipulated, resourceUrl, ownerWebId)
    ).toThrow(/scores are inconsistent/);

    const assessmentUrl = `${resourceUrl}#assessment`;
    const assessment = getThing(dataset, assessmentUrl)!;
    const aggregateManipulated = setThing(
      dataset,
      setInteger(assessment, `${HEALTH_QUESTIONNAIRE_VOCAB}achievedScore`, 0)
    );
    expect(() =>
      parseAssessmentDataset(aggregateManipulated, resourceUrl, ownerWebId)
    ).toThrow(/scores are inconsistent/);
  });

  it("rejects a forged creator and unsupported questionnaire version", () => {
    const { dataset } = assessmentFixture();
    const assessmentUrl = `${resourceUrl}#assessment`;
    const assessment = getThing(dataset, assessmentUrl)!;
    const foreignCreator = setThing(
      dataset,
      setUrl(
        assessment,
        `${DCTERMS}creator`,
        "https://pod.example/mallory/profile/card#me"
      )
    );
    expect(() => parseAssessmentDataset(foreignCreator, resourceUrl, ownerWebId)).toThrow(
      /different WebID/
    );

    const unsupportedVersion = setThing(
      dataset,
      setStringNoLocale(
        assessment,
        `${HEALTH_QUESTIONNAIRE_VOCAB}questionnaireVersion`,
        "1900-01-01"
      )
    );
    expect(() =>
      parseAssessmentDataset(unsupportedVersion, resourceUrl, ownerWebId)
    ).toThrow(/unsupported questionnaire version/);
  });
});
