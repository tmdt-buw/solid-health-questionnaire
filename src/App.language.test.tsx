import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import App, { type StandaloneAuthSession } from "./App";

const loggedOutSession = (): StandaloneAuthSession => ({
  info: { isLoggedIn: false, webId: null },
  fetch: vi.fn() as unknown as typeof fetch,
  login: vi.fn(),
  logout: vi.fn(),
});

describe("standalone language", () => {
  it("starts in English and switches the complete login view to German", async () => {
    const user = userEvent.setup();
    const session = loggedOutSession();

    render(
      <App
        standaloneSession={session}
        restoreStandaloneSession={vi.fn().mockResolvedValue(undefined)}
      />
    );

    await screen.findByRole("combobox", { name: "Language" });
    expect(
      screen.getByRole("heading", { name: "Health Questionnaire" })
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en");

    await user.selectOptions(screen.getByRole("combobox", { name: "Language" }), "de");

    expect(
      screen.getByRole("heading", { name: "Gesundheitsfragebogen" })
    ).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "de");
  });
});
