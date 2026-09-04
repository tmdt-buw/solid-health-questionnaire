import {
  buildThing,
  createContainerAt,
  createSolidDataset,
  createThing,
  getDatetime,
  getInteger,
  getPodUrlAll,
  getResourceInfo,
  getSolidDataset,
  getStringNoLocale,
  getThing,
  getUrl,
  overwriteFile,
  saveSolidDatasetAt,
  setThing,
  solidDatasetAsTurtle,
  type SolidDataset,
} from "@inrupt/solid-client";
import {
  CATEGORY_ORDER,
  QUESTIONNAIRE_VERSION,
  QUESTIONS,
} from "../data/questionnaire";
import { createAssessmentResult, trafficLightFor } from "../domain/scoring";
import {
  parseOnboardingRecord,
  type HealthQuestionnaireOnboardingRecord,
} from "../domain/onboarding";
import type {
  AnswerMap,
  AssessmentResult,
  CategoryScore,
  SolidFetch,
} from "../types";
import { setOwnerOnlyResourceAccess } from "./ownerAcl";

const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";
const DCTERMS = "http://purl.org/dc/terms/";
const SCHEMA = "https://schema.org/";
export const HEALTH_QUESTIONNAIRE_VOCAB =
  "https://raw.githubusercontent.com/hoelk-f/solid-health-questionnaire/main/public/vocab.ttl#";

const errorStatus = (error: unknown): number | undefined => {
  const candidate = error as {
    statusCode?: number;
    status?: number;
    response?: { status?: number };
  };
  return candidate?.statusCode ?? candidate?.response?.status ?? candidate?.status;
};

const isLoopbackHost = (hostname: string): boolean =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]" ||
  hostname === "::1";

export function normalizePodRoot(value: string): string {
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.protocol !== "https:" &&
      !(url.protocol === "http:" && isLoopbackHost(url.hostname)))
  ) {
    throw new Error("The Pod storage URL is not a safe HTTPS URL.");
  }
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  return url.href;
}

export function deriveCssPodRoot(webId: string): string {
  const url = new URL(webId);
  if (url.username || url.password || url.search) {
    throw new Error("The WebID cannot be used to derive a Pod root.");
  }
  const path = url.pathname.replace(/\/+$/, "");
  if (!path.endsWith("/profile/card")) {
    throw new Error("No Pod storage is declared in the WebID profile.");
  }
  const podPath = path.slice(0, -"/profile/card".length);
  return normalizePodRoot(`${url.origin}${podPath || "/"}`);
}

export async function resolvePodRoot(
  webId: string,
  fetcher: SolidFetch,
  resolver: typeof getPodUrlAll = getPodUrlAll
): Promise<string> {
  let podUrls: string[];
  try {
    podUrls = await resolver(webId, { fetch: fetcher });
  } catch {
    throw new Error("The private Solid Pod is currently unavailable.");
  }
  return podUrls.length > 0 ? normalizePodRoot(podUrls[0]) : deriveCssPodRoot(webId);
}

export const storageUrls = (podRoot: string) => {
  const root = normalizePodRoot(podRoot);
  const app = new URL("solid-health-questionnaire/", root).href;
  return {
    app,
    assessments: new URL("assessments/", app).href,
    onboarding: new URL("onboarding.json", app).href,
    latest: new URL("latest.ttl", app).href,
    assessment: (id: string) =>
      new URL(`assessments/${encodeURIComponent(id)}.ttl`, app).href,
  };
};

async function hardenExistingResource(
  url: string,
  ownerWebId: string,
  fetcher: SolidFetch
): Promise<void> {
  try {
    await getResourceInfo(url, { fetch: fetcher });
  } catch (error) {
    if (errorStatus(error) === 404) return;
    throw error;
  }
  await setOwnerOnlyResourceAccess(url, ownerWebId, fetcher);
}

async function ensureContainer(
  url: string,
  ownerWebId: string,
  fetcher: SolidFetch
): Promise<void> {
  try {
    await getResourceInfo(url, { fetch: fetcher });
  } catch (error) {
    if (errorStatus(error) !== 404) throw error;
    await createContainerAt(url, { fetch: fetcher });
  }
  await setOwnerOnlyResourceAccess(url, ownerWebId, fetcher, {
    includeDefault: true,
  });
}

export async function ensurePrivateStorage(
  podRoot: string,
  ownerWebId: string,
  fetcher: SolidFetch
): Promise<void> {
  const urls = storageUrls(podRoot);
  await ensureContainer(urls.app, ownerWebId, fetcher);
  await ensureContainer(urls.assessments, ownerWebId, fetcher);
  await hardenExistingResource(urls.onboarding, ownerWebId, fetcher);
  await hardenExistingResource(urls.latest, ownerWebId, fetcher);
}

export async function loadOnboarding(
  podRoot: string,
  fetcher: SolidFetch
): Promise<HealthQuestionnaireOnboardingRecord | null> {
  const response = await fetcher(storageUrls(podRoot).onboarding, {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    cache: "no-store",
    redirect: "error",
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`The private onboarding record could not be loaded (${response.status}).`);
  }
  try {
    return parseOnboardingRecord(await response.json());
  } catch {
    return null;
  }
}

export async function saveOnboarding(
  podRoot: string,
  record: HealthQuestionnaireOnboardingRecord,
  ownerWebId: string,
  fetcher: SolidFetch
): Promise<void> {
  const validated = parseOnboardingRecord(record);
  if (!validated) throw new Error("The onboarding record is invalid.");
  const url = storageUrls(podRoot).onboarding;
  await ensurePrivateStorage(podRoot, ownerWebId, fetcher);
  await hardenExistingResource(url, ownerWebId, fetcher);
  await overwriteFile(
    url,
    new Blob([`${JSON.stringify(validated, null, 2)}\n`], {
      type: "application/json",
    }),
    { contentType: "application/json", fetch: fetcher }
  );
  await setOwnerOnlyResourceAccess(url, ownerWebId, fetcher);
}

export function buildAssessmentDataset(
  resourceUrl: string,
  result: AssessmentResult
) {
  const assessmentUrl = `${resourceUrl}#assessment`;
  let dataset = createSolidDataset();
  let assessment = buildThing(createThing({ url: assessmentUrl }))
    .addUrl(RDF_TYPE, `${HEALTH_QUESTIONNAIRE_VOCAB}HealthQuestionnaireAssessment`)
    .addUrl(`${DCTERMS}creator`, result.webId)
    .addDatetime(`${DCTERMS}created`, new Date(result.completedAt))
    .addStringNoLocale(`${DCTERMS}identifier`, result.id)
    .addStringNoLocale(
      `${HEALTH_QUESTIONNAIRE_VOCAB}questionnaireVersion`,
      result.questionnaireVersion
    )
    .addInteger(`${HEALTH_QUESTIONNAIRE_VOCAB}achievedScore`, result.achieved)
    .addInteger(`${HEALTH_QUESTIONNAIRE_VOCAB}maximumScore`, result.maximum)
    .addInteger(`${HEALTH_QUESTIONNAIRE_VOCAB}percentage`, result.percentage)
    .addStringNoLocale(
      `${HEALTH_QUESTIONNAIRE_VOCAB}trafficLight`,
      trafficLightFor(result.percentage)
    );

  result.categories.forEach((category) => {
    const categoryUrl = `${resourceUrl}#category-${category.category}`;
    assessment = assessment.addUrl(
      `${HEALTH_QUESTIONNAIRE_VOCAB}hasCategoryScore`,
      categoryUrl
    );
    const categoryThing = buildThing(createThing({ url: categoryUrl }))
      .addUrl(RDF_TYPE, `${SCHEMA}Rating`)
      .addStringNoLocale(
        `${HEALTH_QUESTIONNAIRE_VOCAB}categoryId`,
        category.category
      )
      .addInteger(`${SCHEMA}ratingValue`, category.achieved)
      .addInteger(`${SCHEMA}bestRating`, category.maximum)
      .addInteger(`${SCHEMA}worstRating`, 0)
      .addInteger(`${HEALTH_QUESTIONNAIRE_VOCAB}percentage`, category.percentage)
      .addStringNoLocale(
        `${HEALTH_QUESTIONNAIRE_VOCAB}trafficLight`,
        category.status
      )
      .build();
    dataset = setThing(dataset, categoryThing);
  });

  QUESTIONS.forEach((question, index) => {
    const optionId = result.answers[question.id];
    const selected = question.options.find((candidate) => candidate.id === optionId);
    if (!selected) throw new Error(`Cannot serialize answer for ${question.id}.`);
    const questionUrl = `${resourceUrl}#question-${index + 1}`;
    const answerUrl = `${resourceUrl}#answer-${index + 1}`;
    assessment = assessment.addUrl(
      `${HEALTH_QUESTIONNAIRE_VOCAB}hasQuestion`,
      questionUrl
    );
    assessment = assessment.addUrl(
      `${HEALTH_QUESTIONNAIRE_VOCAB}hasAnswer`,
      answerUrl
    );
    const questionThing = buildThing(createThing({ url: questionUrl }))
      .addUrl(RDF_TYPE, `${SCHEMA}Question`)
      .addInteger(`${SCHEMA}position`, index + 1)
      .addStringNoLocale(`${HEALTH_QUESTIONNAIRE_VOCAB}questionId`, question.id)
      .addStringWithLocale(`${SCHEMA}text`, question.prompt.de, "de")
      .addStringWithLocale(`${SCHEMA}text`, question.prompt.en, "en")
      .build();
    const answer = buildThing(createThing({ url: answerUrl }))
      .addUrl(RDF_TYPE, `${SCHEMA}Answer`)
      .addInteger(`${SCHEMA}position`, index + 1)
      .addStringNoLocale(`${HEALTH_QUESTIONNAIRE_VOCAB}questionId`, question.id)
      .addStringNoLocale(`${HEALTH_QUESTIONNAIRE_VOCAB}optionId`, selected.id)
      .addUrl(`${HEALTH_QUESTIONNAIRE_VOCAB}answersQuestion`, questionUrl)
      .addStringWithLocale(`${SCHEMA}text`, selected.label.de, "de")
      .addStringWithLocale(`${SCHEMA}text`, selected.label.en, "en")
      .addInteger(`${HEALTH_QUESTIONNAIRE_VOCAB}achievedScore`, selected.score)
      .addInteger(`${HEALTH_QUESTIONNAIRE_VOCAB}maximumScore`, question.maxScore)
      .build();
    dataset = setThing(dataset, questionThing);
    dataset = setThing(dataset, answer);
  });

  return setThing(dataset, assessment.build());
}

function assessmentResultsMatch(
  stored: AssessmentResult,
  expected: AssessmentResult
): boolean {
  if (
    stored.id !== expected.id ||
    stored.questionnaireVersion !== expected.questionnaireVersion ||
    stored.completedAt !== expected.completedAt ||
    stored.webId !== expected.webId ||
    stored.achieved !== expected.achieved ||
    stored.maximum !== expected.maximum ||
    stored.percentage !== expected.percentage ||
    stored.categories.length !== expected.categories.length
  ) {
    return false;
  }

  const answersMatch = QUESTIONS.every(
    (question) => stored.answers[question.id] === expected.answers[question.id]
  );
  const categoriesMatch = CATEGORY_ORDER.every((category) => {
    const storedCategory = stored.categories.find(
      (entry) => entry.category === category
    );
    const expectedCategory = expected.categories.find(
      (entry) => entry.category === category
    );
    if (!storedCategory || !expectedCategory) return false;
    return (
      storedCategory.achieved === expectedCategory.achieved &&
      storedCategory.maximum === expectedCategory.maximum &&
      storedCategory.percentage === expectedCategory.percentage &&
      storedCategory.status === expectedCategory.status
    );
  });
  return answersMatch && categoriesMatch;
}

async function saveImmutableAssessmentAt(
  url: string,
  result: AssessmentResult,
  fetcher: SolidFetch
): Promise<void> {
  await hardenExistingResource(url, result.webId, fetcher);
  try {
    await saveSolidDatasetAt(url, buildAssessmentDataset(url, result), { fetch: fetcher });
  } catch (error) {
    if (errorStatus(error) !== 409 && errorStatus(error) !== 412) throw error;
    const stored = parseAssessmentDataset(
      await getSolidDataset(url, { fetch: fetcher }),
      url,
      result.webId
    );
    if (!assessmentResultsMatch(stored, result)) {
      throw new AssessmentValidationError(
        "An immutable assessment with this identifier already contains different data.",
        error
      );
    }
  }
  await setOwnerOnlyResourceAccess(url, result.webId, fetcher);
}

async function overwriteLatestAssessmentAt(
  url: string,
  result: AssessmentResult,
  fetcher: SolidFetch
): Promise<void> {
  await hardenExistingResource(url, result.webId, fetcher);
  const turtle = await solidDatasetAsTurtle(buildAssessmentDataset(url, result));
  await overwriteFile(url, new Blob([turtle], { type: "text/turtle" }), {
    contentType: "text/turtle",
    fetch: fetcher,
  });
  await setOwnerOnlyResourceAccess(url, result.webId, fetcher);
}

export async function saveAssessment(
  podRoot: string,
  result: AssessmentResult,
  fetcher: SolidFetch
): Promise<void> {
  await ensurePrivateStorage(podRoot, result.webId, fetcher);
  const urls = storageUrls(podRoot);
  await saveImmutableAssessmentAt(urls.assessment(result.id), result, fetcher);
  await overwriteLatestAssessmentAt(urls.latest, result, fetcher);
}

function requiredInteger(value: number | null, field: string): number {
  if (value === null || !Number.isFinite(value)) {
    throw new Error(`The saved assessment has no valid ${field}.`);
  }
  return value;
}

export class AssessmentValidationError extends Error {
  readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "AssessmentValidationError";
    this.cause = cause;
  }
}

function parseAssessmentDatasetUnchecked(
  dataset: SolidDataset,
  url: string,
  expectedWebId?: string
): AssessmentResult {
  const assessment = getThing(dataset, `${url}#assessment`);
  if (!assessment) throw new Error("The saved assessment is incomplete.");

  const id = getStringNoLocale(assessment, `${DCTERMS}identifier`);
  const questionnaireVersion = getStringNoLocale(
    assessment,
    `${HEALTH_QUESTIONNAIRE_VOCAB}questionnaireVersion`
  );
  const completedAt = getDatetime(assessment, `${DCTERMS}created`);
  const webId = getUrl(assessment, `${DCTERMS}creator`);
  if (!id || !questionnaireVersion || !completedAt || !webId) {
    throw new Error("The saved assessment metadata is incomplete.");
  }
  if (questionnaireVersion !== QUESTIONNAIRE_VERSION) {
    throw new Error("The saved assessment uses an unsupported questionnaire version.");
  }
  if (expectedWebId && webId !== expectedWebId) {
    throw new Error("The saved assessment belongs to a different WebID.");
  }

  const categories: CategoryScore[] = CATEGORY_ORDER.map((category) => {
    const thing = getThing(dataset, `${url}#category-${category}`);
    if (!thing) throw new Error(`The saved ${category} score is missing.`);
    const achieved = requiredInteger(getInteger(thing, `${SCHEMA}ratingValue`), "rating");
    const maximum = requiredInteger(getInteger(thing, `${SCHEMA}bestRating`), "maximum");
    const percentage = requiredInteger(
      getInteger(thing, `${HEALTH_QUESTIONNAIRE_VOCAB}percentage`),
      "percentage"
    );
    const status = trafficLightFor(percentage);
    const storedStatus = getStringNoLocale(
      thing,
      `${HEALTH_QUESTIONNAIRE_VOCAB}trafficLight`
    );
    if (storedStatus !== status) {
      throw new Error(`The saved ${category} status is inconsistent.`);
    }
    return {
      category,
      achieved,
      maximum,
      percentage,
      status,
    };
  });

  const answers: AnswerMap = {};
  QUESTIONS.forEach((question, index) => {
    const answer = getThing(dataset, `${url}#answer-${index + 1}`);
    const questionId = answer
      ? getStringNoLocale(answer, `${HEALTH_QUESTIONNAIRE_VOCAB}questionId`)
      : null;
    const optionId = answer
      ? getStringNoLocale(answer, `${HEALTH_QUESTIONNAIRE_VOCAB}optionId`)
      : null;
    const selected = question.options.find((option) => option.id === optionId);
    const achievedScore = answer
      ? getInteger(answer, `${HEALTH_QUESTIONNAIRE_VOCAB}achievedScore`)
      : null;
    const maximumScore = answer
      ? getInteger(answer, `${HEALTH_QUESTIONNAIRE_VOCAB}maximumScore`)
      : null;
    if (
      questionId !== question.id ||
      !selected ||
      achievedScore !== selected.score ||
      maximumScore !== question.maxScore
    ) {
      throw new Error(`The saved answer for ${question.id} is inconsistent.`);
    }
    answers[questionId] = selected.id;
  });

  const recalculated = createAssessmentResult({
    id,
    completedAt: completedAt.toISOString(),
    webId,
    answers,
  });
  const storedAchieved = requiredInteger(
    getInteger(assessment, `${HEALTH_QUESTIONNAIRE_VOCAB}achievedScore`),
    "score"
  );
  const storedMaximum = requiredInteger(
    getInteger(assessment, `${HEALTH_QUESTIONNAIRE_VOCAB}maximumScore`),
    "maximum"
  );
  const storedPercentage = requiredInteger(
    getInteger(assessment, `${HEALTH_QUESTIONNAIRE_VOCAB}percentage`),
    "percentage"
  );
  const storedTrafficLight = getStringNoLocale(
    assessment,
    `${HEALTH_QUESTIONNAIRE_VOCAB}trafficLight`
  );
  const categoriesMatch = categories.every((storedCategory, index) => {
    const expected = recalculated.categories[index];
    return (
      storedCategory.category === expected.category &&
      storedCategory.achieved === expected.achieved &&
      storedCategory.maximum === expected.maximum &&
      storedCategory.percentage === expected.percentage &&
      storedCategory.status === expected.status
    );
  });
  if (
    storedAchieved !== recalculated.achieved ||
    storedMaximum !== recalculated.maximum ||
    storedPercentage !== recalculated.percentage ||
    storedTrafficLight !== trafficLightFor(recalculated.percentage) ||
    !categoriesMatch
  ) {
    throw new Error("The saved assessment scores are inconsistent.");
  }

  return recalculated;
}

export function parseAssessmentDataset(
  dataset: SolidDataset,
  url: string,
  expectedWebId?: string
): AssessmentResult {
  try {
    return parseAssessmentDatasetUnchecked(dataset, url, expectedWebId);
  } catch (error) {
    if (error instanceof AssessmentValidationError) throw error;
    const message =
      error instanceof Error
        ? error.message
        : "The saved assessment is invalid or incompatible.";
    throw new AssessmentValidationError(message, error);
  }
}

export async function loadLatestAssessment(
  podRoot: string,
  fetcher: SolidFetch,
  expectedWebId?: string
): Promise<AssessmentResult | null> {
  const url = storageUrls(podRoot).latest;
  let dataset: SolidDataset;
  try {
    dataset = await getSolidDataset(url, { fetch: fetcher });
  } catch (error) {
    if (errorStatus(error) === 404) return null;
    throw error;
  }
  return parseAssessmentDataset(dataset, url, expectedWebId);
}
