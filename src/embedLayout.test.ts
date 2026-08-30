import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appCss = readFileSync(resolve(process.cwd(), "src/App.css"), "utf8");

describe("embedded viewport layout", () => {
  it("keeps the embedded application within the host frame", () => {
    expect(appCss).toMatch(
      /\.solid-health-questionnaire--embedded\s*{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s
    );
    expect(appCss).toMatch(
      /\.solid-health-questionnaire--embedded\s+\.shq-app-stage\s*{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain[^}]*scrollbar-gutter:\s*stable/s
    );
    expect(appCss).toMatch(
      /\.solid-health-questionnaire--embedded\s+\.shq-questionnaire\s*{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*overflow:\s*hidden/s
    );
  });

  it("uses application-themed scrollbars", () => {
    expect(appCss).toContain("--shq-scroll-thumb: #8393a8");
    expect(appCss).toMatch(
      /\.solid-health-questionnaire\s+\*::\-webkit-scrollbar-thumb\s*{[^}]*background:\s*var\(--shq-scroll-thumb\)/s
    );
  });

  it("fills standalone and embedded frames with the shared boot-loader geometry", () => {
    expect(appCss).toMatch(
      /\.solid-health-questionnaire--standalone\.solid-health-questionnaire--loading\s*\{[^}]*height:\s*100dvh[^}]*min-height:\s*100dvh/s
    );
    expect(appCss).toMatch(
      /\.solid-health-questionnaire--embedded\.solid-health-questionnaire--loading\s*\{[^}]*height:\s*100%[^}]*min-height:\s*0[^}]*flex:\s*1 1 auto/s
    );
    expect(appCss).toMatch(
      /\.shq-boot-loader__mark\s*\{[^}]*width:\s*5rem[^}]*height:\s*5rem/s
    );
    expect(appCss).toMatch(
      /\.shq-boot-loader__rail\s*\{[^}]*width:\s*min\(18rem, 70vw\)/s
    );
    expect(appCss).toMatch(
      /@keyframes\s+shq-boot-progress\s*\{[^}]*translateX\(-105%\)[\s\S]*translateX\(243%\)/s
    );
  });
});
