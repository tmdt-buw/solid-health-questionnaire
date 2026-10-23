import LoginParticleCloud from "../standalone/LoginParticleCloud";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { UI_COPY } from "../i18n";
import type { AppLanguage } from "../types";
import Icon from "./Icon";

const PROVIDERS = [
  { label: "TMDT Solid", url: "https://solid-community-server.tmdt.info", recommended: true },
  { label: "Solid Community", url: "https://solidcommunity.net", recommended: false },
] as const;

export function normalizeSolidIssuer(value: string): string | null {
  const candidate = value.trim();
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const localHttp =
      url.protocol === "http:" &&
      new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname);
    if (
      (url.protocol !== "https:" && !localHttp) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return url.href.replace(/\/$/, "");
  } catch {
    return null;
  }
}

export default function LoginScreen({
  language,
  busy,
  error,
  onLogin,
  onLanguageChange,
}: {
  language: AppLanguage;
  busy: boolean;
  error: string | null;
  onLogin: (issuer: string) => void | Promise<void>;
  onLanguageChange: (language: AppLanguage) => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [selected, setSelected] = useState<string>(PROVIDERS[0].url);
  const [customIssuer, setCustomIssuer] = useState("");
  const customValue = customIssuer.trim();
  const normalizedCustom = useMemo(
    () => (customValue ? normalizeSolidIssuer(customValue) : null),
    [customValue]
  );
  const invalid = Boolean(customValue && !normalizedCustom);
  const issuer = customValue ? normalizedCustom : selected;
  const sharedCopy = UI_COPY[language];

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (issuer && !busy) void onLogin(issuer);
  };

  const copy = language === "de"
    ? {
        eyebrow: "DEIN CHECK. DEINE DATEN.",
        title: "Gesundheit beginnt mit einem ehrlichen Blick.",
        body: "Beantworte 18 kurze Fragen und speichere deinen persönlichen Überblick ausschließlich in deinem Solid Pod.",
        providers: "Solid-Anbieter auswählen",
        custom: "Anderen Anbieter verwenden",
        customPlaceholder: "https://dein-provider.example",
        invalid: "Gib eine gültige HTTPS-Issuer-URL ein.",
        submit: "Sicher mit Solid anmelden",
        privacy: "Die App verwendet kein zentrales Benutzerkonto und betreibt keine Gesundheitsdatenbank.",
        recommended: "Empfohlen",
      }
    : {
        eyebrow: "YOUR CHECK. YOUR DATA.",
        title: "Health starts with an honest look.",
        body: "Answer 18 short questions and keep your personal overview exclusively in your Solid Pod.",
        providers: "Choose a Solid provider",
        custom: "Use another provider",
        customPlaceholder: "https://your-provider.example",
        invalid: "Enter a valid HTTPS issuer URL.",
        submit: "Sign in securely with Solid",
        privacy: "The app has no central account and operates no health database.",
        recommended: "Recommended",
      };

  return (
    <main className="shq-login" data-standalone-login><div data-standalone-login-card>
      <section className="shq-login__story" data-standalone-login-heading aria-labelledby="shq-login-title">
        <div className="shq-login__brand" aria-hidden="true"><Icon name="heart" /></div>
        <div className="shq-login__copy">

          <h1 id="shq-login-title" ref={headingRef} tabIndex={-1}>{sharedCopy.appName}</h1>
          <p>{copy.body}</p>
        </div>
      </section>

      <LoginParticleCloud label={sharedCopy.appName} />

      <section className="shq-login__panel" data-standalone-login-form aria-label={copy.providers}>

        <div className="shq-login__panel-heading">
          <Icon name="lock" />
          <div><span>Solid OIDC</span><h2>{copy.providers}</h2></div>
        </div>
        <form onSubmit={submit} noValidate>
          <fieldset disabled={busy}>
            <legend className="shq-sr-only">{copy.providers}</legend>
            {PROVIDERS.map((provider) => {
              const active = !customValue && selected === provider.url;
              return (
                <button
                  key={provider.url}
                  type="button"
                  className={`shq-provider${active ? " is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => { setSelected(provider.url); setCustomIssuer(""); }}
                >
                  <span className="shq-provider__radio" aria-hidden="true" />
                  <span><strong>{provider.label}</strong><small>{provider.url}</small></span>
                  {provider.recommended && <em>{copy.recommended}</em>}
                </button>
              );
            })}
          </fieldset>
          <label className="shq-login__custom">
            <span>{copy.custom}</span>
            <div>
              <input
                type="url"
                value={customIssuer}
                placeholder={copy.customPlaceholder}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
                aria-invalid={invalid}
                onChange={(event) => setCustomIssuer(event.target.value)}
              />
              {customValue && <button type="button" aria-label={sharedCopy.clearProvider} onClick={() => setCustomIssuer("")}><Icon name="close" /></button>}
            </div>
          </label>
          {invalid && <p className="shq-form-error" role="alert">{copy.invalid}</p>}
          {error && !invalid && <p className="shq-form-error" role="alert">{error}</p>}
          <div data-standalone-login-actions>
            <label className="language-select shq-login-language"><select aria-label={language === "de" ? "Sprache" : "Language"} value={language} onChange={event => onLanguageChange(event.target.value === "de" ? "de" : "en")}><option value="en">{language === "de" ? "Englisch" : "English"}</option><option value="de">Deutsch</option></select></label>
          <button className="shq-button shq-button--primary shq-button--full" type="submit" disabled={!issuer || busy}>
            <Icon name="lock" /> {busy ? "…" : copy.submit}
          </button>
          </div>
        </form>
        <p className="shq-login__privacy"><Icon name="pod" /> {copy.privacy}</p>
      </section>
    </div></main>
  );
}
