import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUESTIONS } from "./data/questionnaire";
import { createAssessmentResult } from "./domain/scoring";

const storageMocks = vi.hoisted(() => ({
  ensurePrivateStorage: vi.fn(),
  loadLatestAssessment: vi.fn(),
  loadOnboarding: vi.fn(),
  resolvePodRoot: vi.fn(),
  saveAssessment: vi.fn(),
  saveOnboarding: vi.fn(),
}));

vi.mock("./solid/storage", () => ({
  AssessmentValidationError: class AssessmentValidationError extends Error {},
  ...storageMocks,
}));

import App from "./App";
import type { HealthQuestionnaireSession } from "./types";

const acceptedOnboarding = {
  schemaVersion: 1 as const,
  app: "solid-health-questionnaire" as const,
  privateStorageAcceptedAt: "2026-08-28T10:00:00.000Z",
  selfAssessmentAcceptedAt: "2026-08-28T10:00:00.000Z",
  appSpecificAcceptedAt: "2026-08-28T10:00:00.000Z",
};

const resultFor = (webId: string, highest: boolean) => {
  const answers = Object.fromEntries(
    QUESTIONS.map((question) => {
      const sorted = [...question.options].sort((left, right) =>
        highest ? right.score - left.score : left.score - right.score
      );
      return [question.id, sorted[0].id];
    })
  );
  return createAssessmentResult({
    answers,
    webId,
    id: highest ? "assessment-a" : "assessment-b",
    completedAt: highest
      ? "2026-08-28T10:30:00.000Z"
      : "2026-08-28T11:30:00.000Z",
  });
};

describe("embedded identity isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storageMocks.resolvePodRoot.mockImplementation(async (webId: string) =>
      webId.includes("alice")
        ? "https://pod.example/alice/"
        : "https://pod.example/bob/"
    );
    storageMocks.loadOnboarding.mockResolvedValue(acceptedOnboarding);
    storageMocks.ensurePrivateStorage.mockResolvedValue(undefined);
    storageMocks.loadLatestAssessment.mockImplementation(
      async (_root: string, _fetcher: typeof fetch, expectedWebId: string) =>
        resultFor(expectedWebId, expectedWebId.includes("alice"))
    );
  });

  it("fails closed when one mutable host session logs out and changes user", async () => {
    const user = userEvent.setup();
    const session: HealthQuestionnaireSession = {
      info: {
        isLoggedIn: true,
        webId: "https://pod.example/alice/profile/card#me",
      },
      fetch: vi.fn() as unknown as typeof fetch,
    };
    const { rerender } = render(
      <App embedded session={session} language="de" />
    );

    await user.click(
      await screen.findByRole("button", { name: "Letztes Ergebnis ansehen" })
    );
    expect(screen.getByText("Gesamtwert")).toBeInTheDocument();

    session.info.isLoggedIn = false;
    session.info.webId = null;
    rerender(<App embedded session={session} language="de" />);

    expect(screen.queryByText("Gesamtwert")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Bitte melde dich zuerst im Solid Dataspace an/)
    ).toBeInTheDocument();

    session.info.isLoggedIn = true;
    session.info.webId = "https://pod.example/bob/profile/card#me";
    rerender(<App embedded session={session} language="de" />);

    expect(screen.queryByText("Gesamtwert")).not.toBeInTheDocument();
    await waitFor(() =>
      expect(storageMocks.loadLatestAssessment).toHaveBeenLastCalledWith(
        "https://pod.example/bob/",
        expect.any(Function),
        "https://pod.example/bob/profile/card#me"
      )
    );
    expect(
      await screen.findByRole("button", { name: "Letztes Ergebnis ansehen" })
    ).toBeInTheDocument();
  });

  it("hides loaded results synchronously while the asserted WebID disagrees", async () => {
    const user = userEvent.setup();
    const session: HealthQuestionnaireSession = {
      info: {
        isLoggedIn: true,
        webId: "https://pod.example/alice/profile/card#me",
      },
      fetch: vi.fn() as unknown as typeof fetch,
    };
    const { rerender } = render(
      <App
        embedded
        session={session}
        webIdOverride={session.info.webId}
        language="de"
      />
    );

    await user.click(
      await screen.findByRole("button", { name: "Letztes Ergebnis ansehen" })
    );
    expect(screen.getByText("Gesamtwert")).toBeInTheDocument();

    rerender(
      <App
        embedded
        session={session}
        webIdOverride="https://pod.example/bob/profile/card#me"
        language="de"
      />
    );

    expect(screen.queryByText("Gesamtwert")).not.toBeInTheDocument();
    expect(screen.getByText(/persönlicher Gesundheitsbereich/)).toBeInTheDocument();
  });

  it("relocalizes an already visible Pod access error", async () => {
    storageMocks.resolvePodRoot.mockRejectedValueOnce(
      new Error("ACL access control could not be established")
    );
    const session: HealthQuestionnaireSession = {
      info: {
        isLoggedIn: true,
        webId: "https://pod.example/alice/profile/card#me",
      },
      fetch: vi.fn() as unknown as typeof fetch,
    };
    const { rerender } = render(
      <App embedded session={session} language="en" />
    );

    expect(
      await screen.findByText(/secured with owner-only access/)
    ).toBeInTheDocument();

    rerender(<App embedded session={session} language="de" />);

    expect(
      screen.getByText(/mit exklusiven Eigentümerrechten abgesichert/)
    ).toBeInTheDocument();
    expect(screen.queryByText(/secured with owner-only access/)).not.toBeInTheDocument();
  });
});
