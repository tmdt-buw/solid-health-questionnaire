import { UI_COPY } from "../i18n";
import type { AppLanguage } from "../types";
import { faClipboardCheck } from "@fortawesome/free-solid-svg-icons";

const [iconWidth, iconHeight, , , iconPath] = faClipboardCheck.icon;

type QuestionnaireBootLoaderProps = {
  embedded: boolean;
  language: AppLanguage;
};

export default function QuestionnaireBootLoader({
  embedded,
  language,
}: QuestionnaireBootLoaderProps) {
  const copy = UI_COPY[language];

  return (
    <div
      className={`solid-health-questionnaire solid-health-questionnaire--loading solid-health-questionnaire--${
        embedded ? "embedded" : "standalone"
      }`}
      lang={language}
    >
      <main className="shq-boot-loader" aria-busy="true">
        <span className="shq-boot-loader__mark" aria-hidden="true">
          <svg viewBox={`0 0 ${iconWidth} ${iconHeight}`} fill="currentColor" focusable="false" data-icon={faClipboardCheck.iconName}>
            {(Array.isArray(iconPath) ? iconPath : [iconPath]).map((d, index) => <path key={index} d={d} />)}
          </svg>
        </span>
        <h1>{copy.appName}</h1>
        <p role="status" aria-live="polite">{copy.loading}</p>
        <span
          className="shq-boot-loader__rail"
          role="progressbar"
          aria-label={copy.loading}
        >
          <span />
        </span>
      </main>
    </div>
  );
}
