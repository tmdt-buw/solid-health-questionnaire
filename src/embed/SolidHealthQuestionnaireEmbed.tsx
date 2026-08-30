import App from "../App";
import type { AppLanguage, HealthQuestionnaireSession } from "../types";

export type SolidHealthQuestionnaireEmbedProps = {
  webId?: string | null;
  language?: AppLanguage | string | null;
  session?: HealthQuestionnaireSession | null;
};

export default function SolidHealthQuestionnaireEmbed({
  webId = null,
  language = null,
  session = null,
}: SolidHealthQuestionnaireEmbedProps) {
  return (
    <App
      embedded
      webIdOverride={webId}
      language={language}
      session={session}
    />
  );
}

