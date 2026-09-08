import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AppOnboarding from "./AppOnboarding";

const privacyCopy = {
  de: "Ich habe die Datenschutzerklärung zur Kenntnis genommen. Informationen zur Verarbeitung meiner personenbezogenen Daten finde ich in der Datenschutzerklärung.",
  en: "I have taken note of the privacy policy. Information about the processing of my personal data can be found in the privacy policy.",
};

describe("AppOnboarding privacy placeholder", () => {
  for (const language of ["de", "en"] as const) {
    for (const context of ["embedded", "standalone"] as const) {
      it(`shows plain ${language} text without adding consent requirements in ${context} mode`, async () => {
        const user = userEvent.setup();
        const onComplete = vi.fn();
        render(
          <AppOnboarding
            language={language}
            context={context}
            podRoot="https://pod.example/alice/"
            busy={false}
            error={null}
            onComplete={onComplete}
          />
        );

        const privacy = screen.getByText(privacyCopy[language]);
        expect(privacy.tagName).toBe("P");
        expect(privacy).toHaveClass("shq-onboarding__privacy");
        expect(privacy.closest("label, a")).toBeNull();
        expect(screen.queryByRole("link")).not.toBeInTheDocument();

        const checkboxes = screen.getAllByRole("checkbox");
        expect(checkboxes).toHaveLength(context === "embedded" ? 3 : 4);
        const submit = screen.getByRole("button", {
          name: language === "de"
            ? "Zustimmen und privaten Bereich anlegen"
            : "Accept and create private space",
        });
        expect(submit).toBeDisabled();
        expect(onComplete).not.toHaveBeenCalled();

        for (const checkbox of checkboxes) await user.click(checkbox);
        expect(submit).toBeEnabled();
        await user.click(submit);
        expect(onComplete).toHaveBeenCalledExactlyOnceWith();
      });
    }
  }
});
