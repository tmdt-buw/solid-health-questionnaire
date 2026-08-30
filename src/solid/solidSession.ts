import { Session, handleIncomingRedirect } from "@inrupt/solid-client-authn-browser";

const STORAGE_PREFIX = "solid-health-questionnaire:";
const storageKey = (key: string) => `${STORAGE_PREFIX}${key}`;

const sessionStorageWrapper = {
  get: async (key: string) =>
    typeof window === "undefined"
      ? undefined
      : window.sessionStorage.getItem(storageKey(key)) ?? undefined,
  set: async (key: string, value: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey(key), value);
    }
  },
  delete: async (key: string) => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(storageKey(key));
    }
  },
};

type BrowserSession = InstanceType<typeof Session> & {
  handleIncomingRedirect?: (
    options?: string | { url?: string; restorePreviousSession?: boolean }
  ) => Promise<unknown>;
};

let currentSession: BrowserSession = new Session(
  {
    secureStorage: sessionStorageWrapper,
    insecureStorage: sessionStorageWrapper,
  },
  "solid-health-questionnaire"
);
let restorePromise: Promise<void> | null = null;

export const getSession = (): BrowserSession => currentSession;

export const setSession = (session: BrowserSession): void => {
  if (!session) return;
  currentSession = session;
  restorePromise = null;
};

export async function restoreSession(): Promise<void> {
  if (typeof window === "undefined") return;
  if (restorePromise) return restorePromise;

  restorePromise = (async () => {
    if (typeof currentSession.handleIncomingRedirect === "function") {
      await currentSession.handleIncomingRedirect({
        url: window.location.href,
        restorePreviousSession: true,
      });
      return;
    }
    await handleIncomingRedirect({ restorePreviousSession: true });
  })();

  try {
    await restorePromise;
  } finally {
    restorePromise = null;
  }
}

