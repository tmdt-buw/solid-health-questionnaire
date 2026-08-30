import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import WelcomeScreen from "./WelcomeScreen";

describe("WelcomeScreen", () => {
  it("places the questionnaire duration below the introductory copy", () => {
    render(
      <WelcomeScreen
        language="en"
        latest={null}
        warning={null}
        onStart={vi.fn()}
        onShowLatest={vi.fn()}
      />
    );

    const introduction = screen.getByText(
      "The check looks at five areas of daily life. You receive a clear overview, practical next steps and suitable support."
    );
    const duration = screen.getByText("18 QUESTIONS · ABOUT 4 MINUTES");

    expect(
      introduction.compareDocumentPosition(duration) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
