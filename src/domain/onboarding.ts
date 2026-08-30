export type OnboardingContext = "embedded" | "standalone";

export type HealthQuestionnaireOnboardingRecord = {
  schemaVersion: 1;
  app: "solid-health-questionnaire";
  privateStorageAcceptedAt: string;
  selfAssessmentAcceptedAt: string;
  appSpecificAcceptedAt: string;
  standaloneAcceptedAt?: string;
};

const validDateTime = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date.toISOString() === value;
};

export function parseOnboardingRecord(
  input: unknown
): HealthQuestionnaireOnboardingRecord | null {
  const value = input as Record<string, unknown> | null;
  const allowed = new Set([
    "schemaVersion",
    "app",
    "privateStorageAcceptedAt",
    "selfAssessmentAcceptedAt",
    "appSpecificAcceptedAt",
    "standaloneAcceptedAt",
  ]);

  if (
    !value ||
    value.schemaVersion !== 1 ||
    value.app !== "solid-health-questionnaire" ||
    !validDateTime(value.privateStorageAcceptedAt) ||
    !validDateTime(value.selfAssessmentAcceptedAt) ||
    !validDateTime(value.appSpecificAcceptedAt) ||
    (value.standaloneAcceptedAt !== undefined && !validDateTime(value.standaloneAcceptedAt)) ||
    Object.keys(value).some((key) => !allowed.has(key))
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    app: "solid-health-questionnaire",
    privateStorageAcceptedAt: value.privateStorageAcceptedAt,
    selfAssessmentAcceptedAt: value.selfAssessmentAcceptedAt,
    appSpecificAcceptedAt: value.appSpecificAcceptedAt,
    ...(value.standaloneAcceptedAt
      ? { standaloneAcceptedAt: value.standaloneAcceptedAt as string }
      : {}),
  };
}

export const onboardingCompleteFor = (
  record: HealthQuestionnaireOnboardingRecord | null,
  context: OnboardingContext
) =>
  Boolean(
    record?.privateStorageAcceptedAt &&
      record.selfAssessmentAcceptedAt &&
      record.appSpecificAcceptedAt &&
      (context === "embedded" || record.standaloneAcceptedAt)
  );

export const createOnboardingRecord = (
  current: HealthQuestionnaireOnboardingRecord | null,
  context: OnboardingContext,
  now = new Date().toISOString()
): HealthQuestionnaireOnboardingRecord => {
  if (!validDateTime(now)) throw new Error("Invalid onboarding timestamp.");

  return {
    schemaVersion: 1,
    app: "solid-health-questionnaire",
    privateStorageAcceptedAt: current?.privateStorageAcceptedAt || now,
    selfAssessmentAcceptedAt: current?.selfAssessmentAcceptedAt || now,
    appSpecificAcceptedAt: current?.appSpecificAcceptedAt || now,
    ...(context === "standalone" || current?.standaloneAcceptedAt
      ? { standaloneAcceptedAt: current?.standaloneAcceptedAt || now }
      : {}),
  };
};

