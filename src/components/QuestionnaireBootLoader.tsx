import { UI_COPY } from "../i18n";
import type { AppLanguage } from "../types";
import Icon from "./Icon";

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
          <Icon name="heart" />
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
