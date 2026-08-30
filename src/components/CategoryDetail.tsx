import { useEffect, useRef } from "react";
import { CATEGORY_CONTENT } from "../data/content";
import { CATEGORY_META } from "../data/questionnaire";
import { UI_COPY } from "../i18n";
import type { AppLanguage, CategoryScore } from "../types";
import CategoryArtwork from "./CategoryArtwork";
import Icon from "./Icon";

export default function CategoryDetail({
  language,
  score,
  onBack,
}: {
  language: AppLanguage;
  score: CategoryScore;
  onBack: () => void;
}) {
  const meta = CATEGORY_META[score.category];
  const content = CATEGORY_CONTENT[score.category];
  const copy = UI_COPY[language];
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [score.category]);

  return (
    <article
      className="shq-detail"
      style={{ "--category-accent": meta.accent } as React.CSSProperties}
      aria-labelledby="shq-detail-title"
    >
      <header className="shq-detail__topbar">
        <button type="button" className="shq-icon-button" onClick={onBack} aria-label={copy.back}><Icon name="arrow-left" /></button>
        <span>{language === "de" ? "Kategorie-Details" : "Category details"}</span>
      </header>
      <CategoryArtwork category={score.category} />
      <section className="shq-detail__intro">
        <span className="shq-detail__category"><Icon name={meta.icon} /> {meta.label[language]}</span>
        <h1 id="shq-detail-title" ref={headingRef} tabIndex={-1}>{copy.result}: {score.percentage}%</h1>
        <div className={`shq-scorebar shq-scorebar--${score.status}`}><span style={{ width: `${score.percentage}%` }} /></div>
        <p>{content.summary[language]}</p>
        {score.status !== "green" && <p className="shq-detail__lead">{content.lowScoreLead[language]}</p>}
      </section>

      <section className="shq-detail__section">
        <div className="shq-section-heading"><h2>{copy.quickWins}</h2><span /></div>
        <p>{language === "de" ? "Starte mit einer kleinen Gewohnheit, die zu deinem Alltag passt:" : "Start with one small habit that fits your day:"}</p>
        <ul className="shq-quick-wins">
          {content.quickWins.map((item) => <li key={item[language]}><span><Icon name="check" /></span>{item[language]}</li>)}
        </ul>
      </section>

      <section className="shq-detail__section">
        <div className="shq-section-heading"><h2>{copy.useful}</h2><span /></div>
        <div className="shq-resource-list">
          {content.resources.map((resource) => (
            <a key={resource.href} href={resource.href} target="_blank" rel="noreferrer">
              <span><strong>{resource.title[language]}</strong><small>{resource.description[language]}</small></span>
              <Icon name="external" />
            </a>
          ))}
        </div>
      </section>

      <section className="shq-detail__section">
        <div className="shq-section-heading"><h2>{copy.offers}</h2><span /></div>
        <div className="shq-offer-list">
          {content.offers.map((offer) => (
            <a key={offer.href} href={offer.href} target="_blank" rel="noreferrer">
              <span className="shq-offer-list__image"><Icon name={meta.icon} /></span>
              <span><small>{offer.provider[language]}</small><strong>{offer.title[language]}</strong><em>{offer.label[language]}</em></span>
              <Icon name="arrow-right" />
            </a>
          ))}
        </div>
      </section>

      {score.category === "mental" && (
        <aside className="shq-crisis-note">
          <Icon name="info" />
          <p>{language === "de" ? "Bei akuter Selbst- oder Fremdgefährdung rufe 112. Bei dringenden, nicht lebensbedrohlichen Problemen hilft 116117. Die TelefonSeelsorge erreichst du kostenlos unter 0800 1110111, 0800 1110222 oder 116 123." : "For an immediate risk of harm to yourself or others, call 112. For urgent, non-life-threatening problems in Germany, call 116117. Telephone Counselling is free on 0800 1110111, 0800 1110222 or 116 123."}</p>
        </aside>
      )}
      <p className="shq-disclaimer"><Icon name="info" /> {copy.disclaimer}</p>
    </article>
  );
}
