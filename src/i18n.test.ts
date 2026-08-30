import { describe, expect, it } from "vitest";
import { normalizeLanguage, UI_COPY } from "./i18n";

describe("questionnaire language selection", () => {
  it.each([
    [undefined, "en"],
    [null, "en"],
    ["fr-FR", "en"],
    ["en-US", "en"],
    ["de-DE", "de"],
  ] as const)("normalizes %s to %s", (input, expected) => {
    expect(normalizeLanguage(input)).toBe(expected);
  });

  it("provides localized standalone chrome in both languages", () => {
    expect(UI_COPY.en.thirdPartyLicenses).toBe("Third-party licenses");
    expect(UI_COPY.de.thirdPartyLicenses).toBe("Drittanbieter-Lizenzen");
    expect(UI_COPY.en.clearProvider).toBe("Clear provider entry");
    expect(UI_COPY.de.clearProvider).toBe("Provider-Eingabe löschen");
  });

  it("provides the personal app loading copy in both languages", () => {
    expect(UI_COPY.en.appName).toBe("Solid Health Questionnaire");
    expect(UI_COPY.de.appName).toBe("Solid Health Questionnaire");
    expect(UI_COPY.en.loading).toBe("Loading your personal health space …");
    expect(UI_COPY.de.loading).toBe(
      "Dein persönlicher Gesundheitsbereich wird geladen …"
    );
  });
});
