import { useEffect, useRef } from "react";
import { CATEGORY_CONTENT } from "../data/content";
import { CATEGORY_META } from "../data/questionnaire";
import { UI_COPY } from "../i18n";
import type { AppLanguage, AssessmentResult, CategoryId, TrafficLight } from "../types";
import CategoryArtwork from "./CategoryArtwork";
import HealthWheel from "./HealthWheel";
import Icon from "./Icon";

const statusLabel = (status: TrafficLight, language: AppLanguage) => {
  const copy = UI_COPY[language];
  return status === "green"
    ? copy.statusGreen
    : status === "amber"
      ? copy.statusAmber
      : copy.statusRed;
};

export default function ResultsOverview({
  language,
  result,
  saveState,
  saveError,
  onRetrySave,
  onRepeat,
  onCategory,
}: {
  language: AppLanguage;
  result: AssessmentResult;
  saveState: "saved" | "saving" | "failed";
  saveError: string | null;
  onRetrySave: () => void;
  onRepeat: () => void;
  onCategory: (category: CategoryId) => void;
}) {
  const copy = UI_COPY[language];
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sorted = [...result.categories].sort((a, b) => a.percentage - b.percentage);
  const priority = sorted[0];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="shq-results" aria-labelledby="shq-results-title">
      <header className="shq-results__hero">
        <div>
          <h1 id="shq-results-title" ref={headingRef} tabIndex={-1}>{language === "de" ? "Rundum gesund" : "Whole-health check"}</h1>
          <p className="shq-disclaimer shq-disclaimer--top"><Icon name="info" /> {copy.disclaimer}</p>
        </div>
        {saveState !== "saved" && (
          <div className={`shq-save-state shq-save-state--${saveState}`} role="status">
            {saveState === "saving" && <><span className="shq-spinner" /> {copy.saving}</>}
            {saveState === "failed" && <><Icon name="info" /> <span>{copy.saveFailed}{saveError ? ` ${saveError}` : ""}</span><button type="button" onClick={onRetrySave}>{copy.retry}</button></>}
          </div>
        )}
      </header>

      <div className="shq-results__summary">
        <HealthWheel scores={result.categories} language={language} />
        <div className="shq-results__score">
          <span>{language === "de" ? "Gesamtwert" : "Overall score"}</span>
          <strong>{result.percentage}<small>%</small></strong>
          <p>{language === "de" ? `${result.achieved} von ${result.maximum} Punkten` : `${result.achieved} out of ${result.maximum} points`}</p>
          <button className="shq-button shq-button--outline" type="button" disabled={saveState === "saving"} onClick={onRepeat}><Icon name="restart" /> {copy.repeat}</button>
        </div>
      </div>

      <div className="shq-section-heading">
        <div><span className="shq-eyebrow">{language === "de" ? "FÜNF BEREICHE" : "FIVE AREAS"}</span><h2>{copy.recommendations}</h2></div>
        <span />
      </div>

      <div className="shq-results__cards">
        {sorted.map((score, index) => {
          const meta = CATEGORY_META[score.category];
          const highlighted = index === 0;
          const titleId = `shq-result-${score.category}-title`;
          const statusId = `shq-result-${score.category}-status`;
          const scoreId = `shq-result-${score.category}-score`;
          const insightId = `shq-result-${score.category}-insight`;
          return (
            <button
              key={score.category}
              type="button"
              className={`shq-result-card${highlighted ? " shq-result-card--priority" : ""}`}
              style={{ "--category-accent": meta.accent } as React.CSSProperties}
              onClick={() => onCategory(score.category)}
              aria-labelledby={titleId}
              aria-describedby={`${statusId} ${scoreId}${highlighted ? ` ${insightId}` : ""}`}
            >
              <CategoryArtwork category={score.category} compact={!highlighted} />
              <span className="shq-result-card__body">
                <span className="shq-result-card__title"><strong id={titleId}>{meta.label[language]}</strong><Icon name="arrow-right" /></span>
                <span id={statusId} className={`shq-status shq-status--${score.status}`}>{statusLabel(score.status, language)}</span>
                <span id={scoreId} className="shq-score-line"><span>{copy.result}: {score.percentage}%</span><span>{score.achieved}/{score.maximum}</span></span>
                <span className={`shq-scorebar shq-scorebar--${score.status}`}><span style={{ width: `${score.percentage}%` }} /></span>
                {highlighted && (
                  <span id={insightId} className="shq-result-card__insight">
                    <strong>{language === "de" ? "Hier liegt dein größtes Potenzial." : "This is your biggest opportunity."}</strong>
                    <span>{CATEGORY_CONTENT[priority.category].lowScoreLead[language]}</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
