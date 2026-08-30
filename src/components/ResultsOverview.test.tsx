import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AssessmentResult } from "../types";
import ResultsOverview from "./ResultsOverview";

const result: AssessmentResult = {
  id: "assessment-1",
  questionnaireVersion: "test",
  completedAt: "2026-08-29T06:22:00.000Z",
  webId: "https://pod.example/alice/profile/card#me",
  answers: {},
  categories: [
    { category: "movement", achieved: 3, maximum: 9, percentage: 33, status: "red" },
    { category: "nutrition", achieved: 20, maximum: 24, percentage: 83, status: "green" },
    { category: "mental", achieved: 7, maximum: 9, percentage: 78, status: "amber" },
    { category: "sleep", achieved: 6, maximum: 6, percentage: 100, status: "green" },
    { category: "social", achieved: 6, maximum: 6, percentage: 100, status: "green" },
  ],
  achieved: 42,
  maximum: 54,
  percentage: 78,
};

const renderResults = (
  saveState: "saved" | "saving" | "failed" = "saved",
  saveError: string | null = null
) => {
  const onRetrySave = vi.fn();
  const view = render(
    <ResultsOverview
      language="en"
      result={result}
      saveState={saveState}
      saveError={saveError}
      onRetrySave={onRetrySave}
      onRepeat={vi.fn()}
      onCategory={vi.fn()}
    />
  );
  return { ...view, onRetrySave };
};

describe("ResultsOverview", () => {
  it("starts with the medical disclaimer and omits completion metadata", () => {
    const { container } = renderResults();

    expect(screen.queryByText("YOUR OVERALL PICTURE")).not.toBeInTheDocument();
    expect(screen.queryByText(/Completed/)).not.toBeInTheDocument();
    expect(
      screen.queryByText("Privately saved in your Solid Pod")
    ).not.toBeInTheDocument();

    const disclaimer = screen.getByText(
      "This self-check does not replace medical diagnosis or advice."
    ).closest("p");
    const summary = container.querySelector(".shq-results__summary");

    expect(disclaimer).toHaveClass("shq-disclaimer--top");
    expect(
      disclaimer && summary
        ? disclaimer.compareDocumentPosition(summary) & Node.DOCUMENT_POSITION_FOLLOWING
        : 0
    ).toBeTruthy();
    expect(screen.getAllByText(/does not replace medical diagnosis/i)).toHaveLength(1);
  });

  it("keeps save failures visible and retryable", async () => {
    const user = userEvent.setup();
    const { onRetrySave } = renderResults("failed", "Pod unavailable.");

    expect(screen.getByRole("status")).toHaveTextContent(
      "The result could not yet be saved to your Pod. Pod unavailable."
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetrySave).toHaveBeenCalledTimes(1);
  });
});
