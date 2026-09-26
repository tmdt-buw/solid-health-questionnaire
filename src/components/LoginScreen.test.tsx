import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LoginScreen, { normalizeSolidIssuer } from "./LoginScreen";

describe("Solid issuer validation", () => {
  it("accepts HTTPS providers and local HTTP development", () => {
    expect(normalizeSolidIssuer("https://solid.example/ ")).toBe("https://solid.example");
    expect(normalizeSolidIssuer("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("rejects credentials, remote HTTP, query strings and fragments", () => {
    expect(normalizeSolidIssuer("http://solid.example")).toBeNull();
    expect(normalizeSolidIssuer("https://user:pass@solid.example")).toBeNull();
    expect(normalizeSolidIssuer("https://solid.example?issuer=other")).toBeNull();
    expect(normalizeSolidIssuer("https://solid.example/#fragment")).toBeNull();
  });

  it("localizes the clear-provider control", async () => {
    const user = userEvent.setup();
    const props = { busy: false, error: null, onLogin: vi.fn(), onLanguageChange: vi.fn() };
    const { rerender } = render(<LoginScreen language="en" {...props} />);

    await user.type(screen.getByPlaceholderText("https://your-provider.example"), "https://pod.example");
    expect(screen.getByRole("button", { name: "Clear provider entry" })).toBeInTheDocument();

    rerender(<LoginScreen language="de" {...props} />);
    expect(screen.getByRole("button", { name: "Anbieter-Eingabe löschen" })).toBeInTheDocument();
  });
});
