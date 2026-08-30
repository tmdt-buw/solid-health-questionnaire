import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import QuestionnaireBootLoader from "./QuestionnaireBootLoader";

describe("QuestionnaireBootLoader", () => {
  it("matches the shared accessible standalone loader structure", () => {
    const { container } = render(
      <QuestionnaireBootLoader embedded={false} language="en" />
    );

    const shell = container.firstElementChild;
    expect(shell).toHaveClass("solid-health-questionnaire--loading");
    expect(shell).toHaveClass("solid-health-questionnaire--standalone");
    expect(screen.getByRole("main")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("heading", { name: "Solid Health Questionnaire" })).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading your personal health space …"
    );
    expect(
      screen.getByRole("progressbar", {
        name: "Loading your personal health space …",
      })
    ).toBeInTheDocument();
    expect(container.querySelector(".shq-boot-loader__mark svg")).not.toBeNull();
  });

  it("fills the embedded frame and uses the German status copy", () => {
    const { container } = render(
      <QuestionnaireBootLoader embedded language="de" />
    );

    expect(container.firstElementChild).toHaveClass(
      "solid-health-questionnaire--embedded"
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Dein persönlicher Gesundheitsbereich wird geladen …"
    );
  });
});
