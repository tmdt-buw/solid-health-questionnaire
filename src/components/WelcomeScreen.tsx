import { CATEGORY_META, CATEGORY_ORDER } from "../data/questionnaire";
import { useEffect, useRef } from "react";
import type { AppLanguage, AssessmentResult } from "../types";
import Icon from "./Icon";

export default function WelcomeScreen({
  language,
  latest,
  warning,
  onStart,
  onShowLatest,
}: {
  language: AppLanguage;
  latest: AssessmentResult | null;
  warning: string | null;
  onStart: () => void;
  onShowLatest: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const copy = language === "de"
    ? {
        eyebrow: "18 FRAGEN · ETWA 4 MINUTEN",
        title: "Wie rund fühlt sich deine Gesundheit gerade an?",
        body: "Der Check betrachtet fünf Bereiche deines Alltags. Du erhältst eine klare Übersicht, konkrete nächste Schritte und passende Hilfsangebote.",
        start: latest ? "Neuen Check starten" : "Gesundheitscheck starten",
        latest: "Letztes Ergebnis ansehen",
        categories: "Fünf Perspektiven, ein Gesamtbild",
      }
    : {
        eyebrow: "18 QUESTIONS · ABOUT 4 MINUTES",
        title: "How balanced does your health feel right now?",
        body: "The check looks at five areas of daily life. You receive a clear overview, practical next steps and suitable support.",
        start: latest ? "Start a new check" : "Start health check",
        latest: "View latest result",
        categories: "Five perspectives, one overall picture",
      };

  return (
    <section className="shq-welcome" aria-labelledby="shq-welcome-title">
      <div className="shq-welcome__copy">
        <h1 id="shq-welcome-title" ref={headingRef} tabIndex={-1}>{copy.title}</h1>
        <p>{copy.body}</p>
        <span className="shq-eyebrow">{copy.eyebrow}</span>
        {warning && <p className="shq-inline-notice" role="status"><Icon name="info" /> <span>{warning}</span></p>}
        <div className="shq-welcome__actions">
          <button className="shq-button shq-button--primary" type="button" onClick={onStart}>{copy.start}<Icon name="arrow-right" /></button>
          {latest && <button className="shq-button shq-button--ghost" type="button" onClick={onShowLatest}>{copy.latest}</button>}
        </div>
      </div>
      <div className="shq-welcome__visual" aria-label={copy.categories}>
        <div className="shq-welcome__orbit">
          <span className="shq-welcome__core"><Icon name="heart" /></span>
          {CATEGORY_ORDER.map((category, index) => (
            <span
              key={category}
              className={`shq-welcome__category shq-welcome__category--${index + 1}`}
              style={{ "--category-accent": CATEGORY_META[category].accent } as React.CSSProperties}
            >
              <Icon name={CATEGORY_META[category].icon} />
              <small>{CATEGORY_META[category].shortLabel[language]}</small>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
