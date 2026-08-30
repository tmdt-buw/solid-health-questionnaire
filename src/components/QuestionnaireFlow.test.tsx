import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QUESTIONS } from "../data/questionnaire";
import QuestionnaireFlow from "./QuestionnaireFlow";

describe("QuestionnaireFlow", () => {
  it("localizes the questionnaire brand and question when the language changes", () => {
    const props = { onCancel: vi.fn(), onComplete: vi.fn() };
    const { rerender } = render(<QuestionnaireFlow language="en" {...props} />);

    expect(screen.getByText("Whole-health check")).toBeInTheDocument();
    expect(screen.getByText(/Question 1 of 18/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Yes" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Choose a question" })).toBeInTheDocument();
    expect(screen.getByText("0 of 18 answered")).toBeInTheDocument();

    rerender(<QuestionnaireFlow language="de" {...props} />);

    expect(screen.getByText("Rundum gesund")).toBeInTheDocument();
    expect(screen.getByText(/Frage 1 von 18/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Ja" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Fragen auswählen" })).toBeInTheDocument();
    expect(screen.getByText("0 von 18 beantwortet")).toBeInTheDocument();
  });

  it("requires an answer and moves through one question at a time", async () => {
    const user = userEvent.setup();
    render(<QuestionnaireFlow language="de" onCancel={vi.fn()} onComplete={vi.fn()} />);

    const next = screen.getByRole("button", { name: /weiter/i });
    expect(next).toBeDisabled();
    expect(screen.getByText(/Frage 1 von 18/)).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Ja" }));
    expect(next).toBeEnabled();
    await user.click(next);

    expect(screen.getByText(/Frage 2 von 18/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /1,5 Liter Wasser/ })).toHaveFocus();
  });

  it("jumps between every question, preserves answers, and returns to the first missing question", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<QuestionnaireFlow language="en" onCancel={vi.fn()} onComplete={onComplete} />);

    const navigation = screen.getByRole("navigation", { name: "Choose a question" });
    const questionButtons = within(navigation).getAllByRole("button");
    expect(questionButtons).toHaveLength(QUESTIONS.length);

    await user.click(screen.getAllByRole("radio")[0]);
    expect(within(navigation).getByRole("button", { name: /question 1 of 18, answered/i })).toHaveAttribute("aria-current", "step");

    await user.click(within(navigation).getByRole("button", { name: /question 18 of 18/i }));
    expect(screen.getByText("Question 18 of 18")).toBeInTheDocument();
    await user.click(screen.getAllByRole("radio")[0]);
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByText("Question 2 of 18")).toBeInTheDocument();

    await user.click(within(navigation).getByRole("button", { name: /question 1 of 18/i }));
    expect(screen.getAllByRole("radio")[0]).toBeChecked();
  });

  it("offers evaluation only after all questions are answered and submits once", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    render(<QuestionnaireFlow language="en" onCancel={vi.fn()} onComplete={onComplete} />);

    for (let questionIndex = 0; questionIndex < QUESTIONS.length; questionIndex += 1) {
      expect(screen.queryByRole("button", { name: /evaluate/i })).not.toBeInTheDocument();
      await user.click(screen.getAllByRole("radio")[0]);

      if (questionIndex < QUESTIONS.length - 1) {
        await user.click(screen.getByRole("button", { name: /continue/i }));
      }
    }

    expect(screen.getByText("18 of 18 answered")).toBeInTheDocument();
    const evaluate = screen.getByRole("button", { name: /evaluate/i });
    await user.dblClick(evaluate);

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(Object.keys(onComplete.mock.calls[0][0])).toHaveLength(QUESTIONS.length);
  });
});
