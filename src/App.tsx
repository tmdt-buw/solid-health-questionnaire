import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppOnboarding from "./components/AppOnboarding";
import CategoryDetail from "./components/CategoryDetail";
import Icon from "./components/Icon";
import LoginScreen from "./components/LoginScreen";
import QuestionnaireFlow from "./components/QuestionnaireFlow";
import QuestionnaireBootLoader from "./components/QuestionnaireBootLoader";
import ResultsOverview from "./components/ResultsOverview";
import WelcomeScreen from "./components/WelcomeScreen";
import {
  createOnboardingRecord,
  onboardingCompleteFor,
  type HealthQuestionnaireOnboardingRecord,
} from "./domain/onboarding";
import { createAssessmentResult } from "./domain/scoring";
import { normalizeLanguage, UI_COPY } from "./i18n";
import {
  AssessmentValidationError,
  ensurePrivateStorage,
  loadLatestAssessment,
  loadOnboarding,
  resolvePodRoot,
  saveAssessment,
  saveOnboarding,
} from "./solid/storage";
import type {
  AnswerMap,
  AppLanguage,
  AssessmentResult,
  CategoryId,
  HealthQuestionnaireSession,
  SolidFetch,
} from "./types";
import { healthQuestionnaireVersion } from "./version";
import "./App.css";

type Screen = "welcome" | "questionnaire" | "results" | "detail";
type BootState = "loading" | "unauthenticated" | "onboarding" | "ready" | "error";
type UserFacingErrorKind = "acl" | "pod" | "connection";

export type StandaloneAuthSession = {
  info: {
    isLoggedIn: boolean;
    webId?: string | null;
  };
  fetch: SolidFetch;
  login: (options: {
    oidcIssuer: string;
    redirectUrl: string;
    clientName: string;
  }) => Promise<unknown>;
  logout: (options?: { logoutType: "app" }) => Promise<unknown>;
};

export type AppProps = {
  embedded?: boolean;
  webIdOverride?: string | null;
  language?: string | null;
  session?: HealthQuestionnaireSession | null;
  standaloneSession?: StandaloneAuthSession | null;
  restoreStandaloneSession?: (() => Promise<void>) | null;
};

const classifyUserFacingError = (reason: unknown): UserFacingErrorKind => {
  const source = reason instanceof Error ? reason.message : String(reason || "");
  if (/ACL|Control|access/i.test(source)) return "acl";
  if (/Pod|storage|profile/i.test(source)) return "pod";
  return "connection";
};

const userFacingError = (kind: UserFacingErrorKind, language: AppLanguage) => {
  if (kind === "acl") {
    return language === "de"
      ? "Der private App-Bereich konnte nicht mit exklusiven Eigentümerrechten abgesichert werden."
      : "The private app space could not be secured with owner-only access.";
  }
  if (kind === "pod") return UI_COPY[language].noPod;
  return language === "de"
    ? "Die Verbindung zu deinem Solid Pod ist fehlgeschlagen."
    : "Connecting to your Solid Pod failed.";
};

const incompatibleLatestWarning = (language: AppLanguage) =>
  language === "de"
    ? "Das zuletzt gespeicherte Ergebnis stammt aus einer anderen Fragebogenversion oder ist unvollständig. Du kannst einen neuen Check starten; dein bisheriger Verlauf bleibt im Pod erhalten."
    : "The latest saved result uses another questionnaire version or is incomplete. You can start a new check; the existing history remains in your Pod.";

export default function App({
  embedded = false,
  webIdOverride = null,
  language: languageOverride = null,
  session: hostSession = null,
  standaloneSession = null,
  restoreStandaloneSession = null,
}: AppProps) {
  const [language, setLanguage] = useState<AppLanguage>(() =>
    normalizeLanguage(languageOverride)
  );
  const [bootState, setBootState] = useState<BootState>("loading");
  const [screen, setScreen] = useState<Screen>("welcome");
  const [webId, setWebId] = useState<string | null>(null);
  const [podRoot, setPodRoot] = useState<string | null>(null);
  const [solidFetch, setSolidFetch] = useState<SolidFetch | null>(null);
  const [onboardingRecord, setOnboardingRecord] =
    useState<HealthQuestionnaireOnboardingRecord | null>(null);
  const [latestResult, setLatestResult] = useState<AssessmentResult | null>(null);
  const [activeResult, setActiveResult] = useState<AssessmentResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "failed">("saved");
  const [errorKind, setErrorKind] = useState<UserFacingErrorKind | null>(null);
  const [latestWarningVisible, setLatestWarningVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const authRevision = useRef(0);
  const saveRevision = useRef(0);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const hostSessionRef = useRef(hostSession);
  const standaloneSessionRef = useRef(standaloneSession);
  const embeddedIsLoggedIn = hostSession?.info?.isLoggedIn === true;
  const embeddedWebId = hostSession?.info?.webId || null;
  const embeddedFetch = hostSession?.fetch || null;

  hostSessionRef.current = hostSession;
  standaloneSessionRef.current = standaloneSession;

  useEffect(() => {
    if (languageOverride != null) {
      setLanguage(normalizeLanguage(languageOverride));
    } else if (embedded) {
      setLanguage("en");
    }
  }, [embedded, languageOverride]);

  useEffect(() => {
    if (embedded) return;
    document.title = UI_COPY[language].appName;
    document.documentElement.lang = language;
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute("content", UI_COPY[language].metaDescription);
  }, [embedded, language]);

  const error = errorKind ? userFacingError(errorKind, language) : null;
  const latestWarning = latestWarningVisible
    ? incompatibleLatestWarning(language)
    : null;

  const resetPrivateState = useCallback(() => {
    saveRevision.current += 1;
    saveQueue.current = Promise.resolve();
    setWebId(null);
    setPodRoot(null);
    setSolidFetch(null);
    setOnboardingRecord(null);
    setLatestResult(null);
    setActiveResult(null);
    setActiveCategory(null);
    setScreen("welcome");
    setBusy(false);
    setSaveState("saved");
    setLatestWarningVisible(false);
  }, []);

  useEffect(() => {
    const revision = ++authRevision.current;
    let disposed = false;

    const stillCurrent = () => !disposed && revision === authRevision.current;

    const initializeIdentity = async (
      authenticatedWebId: string,
      fetcher: SolidFetch
    ) => {
      const identityFetch: SolidFetch = async (input, init) => {
        if (!stillCurrent()) throw new Error("The authenticated identity changed.");
        const currentHostSession = hostSessionRef.current;
        const currentStandaloneSession = standaloneSessionRef.current;
        const currentWebId = embedded
          ? currentHostSession?.info?.webId
          : currentStandaloneSession?.info?.webId;
        const isLoggedIn = embedded
          ? currentHostSession?.info?.isLoggedIn === true
          : currentStandaloneSession?.info?.isLoggedIn === true;
        if (!isLoggedIn || !currentWebId || currentWebId !== authenticatedWebId) {
          throw new Error("The authenticated identity changed.");
        }
        return fetcher(input, init);
      };

      resetPrivateState();
      setBootState("loading");
      setErrorKind(null);
      try {
        const root = await resolvePodRoot(authenticatedWebId, identityFetch);
        if (!stillCurrent()) return;
        const record = await loadOnboarding(root, identityFetch);
        if (!stillCurrent()) return;

        setWebId(authenticatedWebId);
        setPodRoot(root);
        setSolidFetch(() => identityFetch);
        setOnboardingRecord(record);

        const context = embedded ? "embedded" : "standalone";
        if (!onboardingCompleteFor(record, context)) {
          setBootState("onboarding");
          return;
        }

        await ensurePrivateStorage(root, authenticatedWebId, identityFetch);
        if (!stillCurrent()) return;
        let latest: AssessmentResult | null = null;
        try {
          latest = await loadLatestAssessment(
            root,
            identityFetch,
            authenticatedWebId
          );
        } catch (reason) {
          if (!(reason instanceof AssessmentValidationError)) throw reason;
          setLatestWarningVisible(true);
        }
        if (!stillCurrent()) return;
        setLatestResult(latest);
        setActiveResult(latest);
        setBootState("ready");
        setScreen("welcome");
      } catch (reason) {
        if (!stillCurrent()) return;
        resetPrivateState();
        setErrorKind(classifyUserFacingError(reason));
        setBootState("error");
      }
    };

    const boot = async () => {
      try {
        if (embedded) {
          if (webIdOverride && webIdOverride !== embeddedWebId) {
            throw new Error("The host WebID and authenticated session identity differ.");
          }
          if (
            !embeddedIsLoggedIn ||
            !embeddedWebId ||
            !embeddedFetch
          ) {
            if (!stillCurrent()) return;
            resetPrivateState();
            setBootState("unauthenticated");
            return;
          }
          const sessionAtBoot = hostSessionRef.current;
          await initializeIdentity(
            embeddedWebId,
            embeddedFetch.bind(sessionAtBoot)
          );
          return;
        }

        if (!standaloneSessionRef.current || !restoreStandaloneSession) {
          throw new Error("The standalone authentication adapter is unavailable.");
        }
        await restoreStandaloneSession();
        if (!stillCurrent()) return;
        const activeStandaloneSession = standaloneSessionRef.current;
        if (
          !activeStandaloneSession?.info.isLoggedIn ||
          !activeStandaloneSession.info.webId
        ) {
          resetPrivateState();
          setBootState("unauthenticated");
          return;
        }
        await initializeIdentity(
          activeStandaloneSession.info.webId,
          activeStandaloneSession.fetch.bind(activeStandaloneSession)
        );
      } catch (reason) {
        if (!stillCurrent()) return;
        resetPrivateState();
        setErrorKind(classifyUserFacingError(reason));
        setBootState("error");
      }
    };

    void boot();
    return () => {
      disposed = true;
      authRevision.current += 1;
    };
  }, [
    embedded,
    embeddedFetch,
    embeddedIsLoggedIn,
    embeddedWebId,
    resetPrivateState,
    restoreStandaloneSession,
    retryKey,
    standaloneSession,
    webIdOverride,
  ]);

  const startLogin = async (issuer: string) => {
    setBusy(true);
    setErrorKind(null);
    try {
      if (!standaloneSession) {
        throw new Error("The standalone authentication adapter is unavailable.");
      }
      await standaloneSession.login({
        oidcIssuer: issuer,
        redirectUrl: `${window.location.origin}/solid-health-questionnaire/`,
        clientName: UI_COPY[language].appName,
      });
    } catch (reason) {
      setErrorKind(classifyUserFacingError(reason));
      setBusy(false);
    }
  };

  const logout = async () => {
    authRevision.current += 1;
    setBusy(true);
    try {
      await standaloneSession?.logout({ logoutType: "app" });
    } finally {
      resetPrivateState();
      setBootState("unauthenticated");
      setBusy(false);
    }
  };

  const completeOnboarding = async () => {
    if (!podRoot || !webId || !solidFetch) return;
    const revision = authRevision.current;
    setBusy(true);
    setErrorKind(null);
    try {
      const context = embedded ? "embedded" : "standalone";
      const record = createOnboardingRecord(onboardingRecord, context);
      await ensurePrivateStorage(podRoot, webId, solidFetch);
      if (revision !== authRevision.current) return;
      await saveOnboarding(podRoot, record, webId, solidFetch);
      if (revision !== authRevision.current) return;
      let latest: AssessmentResult | null = null;
      try {
        latest = await loadLatestAssessment(podRoot, solidFetch, webId);
      } catch (reason) {
        if (!(reason instanceof AssessmentValidationError)) throw reason;
        setLatestWarningVisible(true);
      }
      if (revision !== authRevision.current) return;
      setOnboardingRecord(record);
      setLatestResult(latest);
      setActiveResult(latest);
      setBootState("ready");
      setScreen("welcome");
    } catch (reason) {
      if (revision === authRevision.current) {
        setErrorKind(classifyUserFacingError(reason));
      }
    } finally {
      if (revision === authRevision.current) setBusy(false);
    }
  };

  const persistResult = useCallback(async (result: AssessmentResult) => {
    if (!podRoot || !solidFetch || !webId) return;
    const revision = authRevision.current;
    if (result.webId !== webId) {
      setErrorKind("connection");
      setSaveState("failed");
      return;
    }
    const generation = ++saveRevision.current;
    setSaveState("saving");
    setErrorKind(null);
    const queuedSave = saveQueue.current
      .catch(() => undefined)
      .then(() => saveAssessment(podRoot, result, solidFetch));
    saveQueue.current = queuedSave.then(
      () => undefined,
      () => undefined
    );
    try {
      await queuedSave;
      if (
        revision !== authRevision.current ||
        generation !== saveRevision.current
      ) return;
      setLatestResult(result);
      setLatestWarningVisible(false);
      setSaveState("saved");
    } catch (reason) {
      if (
        revision !== authRevision.current ||
        generation !== saveRevision.current
      ) return;
      setErrorKind(classifyUserFacingError(reason));
      setSaveState("failed");
    }
  }, [language, podRoot, solidFetch, webId]);

  const finishQuestionnaire = (answers: AnswerMap) => {
    if (!webId) return;
    const result = createAssessmentResult({ answers, webId });
    setActiveResult(result);
    setActiveCategory(null);
    setScreen("results");
    void persistResult(result);
  };

  const activeScore = useMemo(
    () => activeResult?.categories.find((score) => score.category === activeCategory) || null,
    [activeCategory, activeResult]
  );

  const embeddedNeedsHostLogin =
    embedded && (!embeddedIsLoggedIn || !embeddedWebId);
  const identityTransitionLoading =
    (embedded && Boolean(webIdOverride) && webIdOverride !== embeddedWebId) ||
    (!embeddedNeedsHostLogin &&
      (bootState === "loading" ||
        (embedded && Boolean(webId) && webId !== embeddedWebId)));

  if (identityTransitionLoading) {
    return (
      <QuestionnaireBootLoader embedded={embedded} language={language} />
    );
  }

  const content = (() => {
    if (embedded && (!embeddedIsLoggedIn || !embeddedWebId)) {
      return <main className="shq-state-screen"><span className="shq-loader-mark"><Icon name="lock" /></span><h1>{UI_COPY[language].solidLogin}</h1><p>{UI_COPY[language].hostLogin}</p></main>;
    }

    if (bootState === "unauthenticated") {
      if (embedded) {
        return <main className="shq-state-screen"><span className="shq-loader-mark"><Icon name="lock" /></span><h1>{UI_COPY[language].solidLogin}</h1><p>{UI_COPY[language].hostLogin}</p></main>;
      }
      return <LoginScreen language={language} busy={busy} error={error} onLogin={startLogin} onLanguageChange={setLanguage} />;
    }

    if (bootState === "error") {
      return (
        <main className="shq-state-screen" role="alert">
          <span className="shq-loader-mark shq-loader-mark--error"><Icon name="info" /></span>
          <h1>{language === "de" ? "Pod-Verbindung nicht möglich" : "Pod connection unavailable"}</h1>
          <p>{error}</p>
          <button className="shq-button shq-button--primary" type="button" onClick={() => setRetryKey((value) => value + 1)}>{UI_COPY[language].retry}</button>
        </main>
      );
    }

    if (bootState === "onboarding" && podRoot) {
      return (
        <AppOnboarding
          language={language}
          context={embedded ? "embedded" : "standalone"}
          podRoot={podRoot}
          busy={busy}
          error={error}
          onComplete={completeOnboarding}
          onLogout={embedded ? undefined : logout}
        />
      );
    }

    if (screen === "questionnaire") {
      return <QuestionnaireFlow language={language} onCancel={() => setScreen("welcome")} onComplete={finishQuestionnaire} />;
    }

    if (screen === "detail" && activeScore) {
      return <CategoryDetail language={language} score={activeScore} onBack={() => setScreen("results")} />;
    }

    if (screen === "results" && activeResult) {
      return (
        <ResultsOverview
          language={language}
          result={activeResult}
          saveState={saveState}
          saveError={error}
          onRetrySave={() => void persistResult(activeResult)}
          onRepeat={() => setScreen("questionnaire")}
          onCategory={(category) => { setActiveCategory(category); setScreen("detail"); }}
        />
      );
    }

    return (
      <WelcomeScreen
        language={language}
        latest={latestResult}
        warning={latestWarning}
        onStart={() => setScreen("questionnaire")}
        onShowLatest={() => { setActiveResult(latestResult); setScreen("results"); setSaveState("saved"); }}
      />
    );
  })();

  return (
    <div className={`solid-health-questionnaire solid-health-questionnaire--${embedded ? "embedded" : "standalone"}`} lang={language} translate="no">
      {!embedded && bootState !== "unauthenticated" && (
        <header className="shq-standalone-header">
          <a href="/solid-health-questionnaire/" className="shq-standalone-header__brand"><Icon name="heart" /><span>{UI_COPY[language].appName}</span></a>
          <div>
            {webId && <span className="shq-standalone-header__pod"><Icon name="pod" /> {language === "de" ? "Mein Pod" : "My Pod"}</span>}
            <div className="shq-language" role="group" aria-label={language === "de" ? "Sprache" : "Language"}>
              <button type="button" aria-pressed={language === "de"} className={language === "de" ? "is-active" : ""} onClick={() => setLanguage("de")}>DE</button>
              <button type="button" aria-pressed={language === "en"} className={language === "en" ? "is-active" : ""} onClick={() => setLanguage("en")}>EN</button>
            </div>
            {webId && <button type="button" className="shq-button shq-button--ghost shq-button--small" onClick={() => void logout()}>{UI_COPY[language].logout}</button>}
          </div>
        </header>
      )}
      <div className="shq-app-stage">{content}</div>
      {!embedded && bootState !== "unauthenticated" && (
        <footer className="shq-standalone-footer">
          <span>© 2026 TMDT</span><span>{UI_COPY[language].appName} {healthQuestionnaireVersion}</span><span><Icon name="lock" /> {UI_COPY[language].podFirst}</span>
          <span className="shq-standalone-footer__legal"><a href="/solid-health-questionnaire/LICENSE.txt">{UI_COPY[language].license}</a><a href="/solid-health-questionnaire/NOTICE.txt">{UI_COPY[language].notice}</a><a href="/solid-health-questionnaire/THIRD_PARTY_NOTICES.txt">{UI_COPY[language].thirdPartyLicenses}</a></span>
        </footer>
      )}
    </div>
  );
}
