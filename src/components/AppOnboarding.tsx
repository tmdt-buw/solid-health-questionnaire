import { useEffect, useMemo, useRef, useState } from "react";
import type { AppLanguage } from "../types";
import type { OnboardingContext } from "../domain/onboarding";
import Icon, { type IconName } from "./Icon";

export default function AppOnboarding({
  language,
  context,
  podRoot,
  busy,
  error,
  onComplete,
  onLogout,
}: {
  language: AppLanguage;
  context: OnboardingContext;
  podRoot: string;
  busy: boolean;
  error: string | null;
  onComplete: () => void | Promise<void>;
  onLogout?: () => void | Promise<void>;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const copy = language === "de"
    ? {
        eyebrow: "EINMALIGES APP-ONBOARDING",
        title: "Dein Gesundheitscheck gehört dir.",
        intro: "Bevor die App ihren privaten Bereich anlegt, entscheidest du bewusst, wie deine Antworten verarbeitet werden.",
        storageTitle: "Privat in deinem Pod",
        storageText: "Antworten und Ergebnisse werden ausschließlich in deinem persönlichen Solid Pod gespeichert. Es gibt keine zentrale Gesundheitsdatenbank.",
        assessmentTitle: "Selbstcheck, keine Diagnose",
        assessmentText: "Die Auswertung bietet Orientierung und ersetzt weder medizinische Diagnostik noch eine professionelle Beratung.",
        controlTitle: "Du behältst die Kontrolle",
        controlText: "Die App nutzt nur deine aktive Solid-Session und gibt keine Ergebnisse öffentlich frei.",
        standaloneTitle: "Eigenständige Anmeldung",
        standaloneText: "In der Standalone-Variante verwaltet diese App ihren eigenen OIDC-Login. Im Embed übernimmt der Dataspace Manager die Session.",
        privacyText: "Ich habe die Datenschutzerklärung zur Kenntnis genommen. Informationen zur Verarbeitung meiner personenbezogenen Daten finde ich in der Datenschutzerklärung.",
        destination: "Privater Speicherort",
        required: "Bestätige alle Punkte, um den privaten App-Bereich anzulegen.",
        submit: "Zustimmen und privaten Bereich anlegen",
        logout: "Abmelden",
      }
    : {
        eyebrow: "ONE-TIME APP ONBOARDING",
        title: "Your health check belongs to you.",
        intro: "Before the app creates its private space, you consciously choose how your answers are handled.",
        storageTitle: "Private in your Pod",
        storageText: "Answers and results are stored only in your personal Solid Pod. There is no central health database.",
        assessmentTitle: "A self-check, not a diagnosis",
        assessmentText: "The assessment offers orientation and does not replace medical diagnosis or professional advice.",
        controlTitle: "You stay in control",
        controlText: "The app only uses your active Solid session and never makes results public.",
        standaloneTitle: "Independent login",
        standaloneText: "The standalone version manages its own OIDC login. The embedded version reuses the Dataspace Manager session.",
        privacyText: "I have taken note of the privacy policy. Information about the processing of my personal data can be found in the privacy policy.",
        destination: "Private storage location",
        required: "Confirm every point to create the private app space.",
        submit: "Accept and create private space",
        logout: "Log out",
      };

  const items = useMemo(
    () => [
      { id: "storage", icon: "pod" as IconName, title: copy.storageTitle, text: copy.storageText },
      { id: "assessment", icon: "info" as IconName, title: copy.assessmentTitle, text: copy.assessmentText },
      { id: "control", icon: "lock" as IconName, title: copy.controlTitle, text: copy.controlText },
      ...(context === "standalone"
        ? [{ id: "standalone", icon: "heart" as IconName, title: copy.standaloneTitle, text: copy.standaloneText }]
        : []),
    ],
    [context, copy.assessmentText, copy.assessmentTitle, copy.controlText, copy.controlTitle, copy.standaloneText, copy.standaloneTitle, copy.storageText, copy.storageTitle]
  );
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const complete = items.every((item) => accepted[item.id]);

  return (
    <main className="shq-onboarding">
      <section className="shq-onboarding__card" aria-labelledby="shq-onboarding-title">
        <header>
          <span className="shq-onboarding__mark"><Icon name="heart" /></span>
          <div>
            <span className="shq-eyebrow">{copy.eyebrow}</span>
            <h1 id="shq-onboarding-title" ref={headingRef} tabIndex={-1}>{copy.title}</h1>
            <p>{copy.intro}</p>
          </div>
        </header>
        <div className="shq-onboarding__destination">
          <span>{copy.destination}</span>
          <code>{`${podRoot}solid-health-questionnaire/`}</code>
        </div>
        <div className="shq-onboarding__items">
          {items.map((item, index) => (
            <label key={item.id} className={accepted[item.id] ? "is-checked" : ""}>
              <input
                type="checkbox"
                checked={Boolean(accepted[item.id])}
                disabled={busy}
                onChange={(event) => setAccepted((current) => ({ ...current, [item.id]: event.target.checked }))}
              />
              <span className="shq-onboarding__item-icon"><Icon name={item.icon} /></span>
              <span className="shq-onboarding__item-copy">
                <strong><em>{String(index + 1).padStart(2, "0")}</em>{item.title}</strong>
                <small>{item.text}</small>
              </span>
            </label>
          ))}
        </div>
        <p className="shq-onboarding__privacy">{copy.privacyText}</p>
        {error && <p className="shq-form-error" role="alert">{error}</p>}
        <footer>
          <p aria-live="polite">{complete ? "" : copy.required}</p>
          <div>
            {onLogout && <button className="shq-button shq-button--ghost" type="button" disabled={busy} onClick={() => void onLogout()}>{copy.logout}</button>}
            <button className="shq-button shq-button--primary" type="button" disabled={!complete || busy} onClick={() => void onComplete()}>
              <Icon name="lock" /> {busy ? "…" : copy.submit}
            </button>
          </div>
        </footer>
      </section>
    </main>
  );
}
