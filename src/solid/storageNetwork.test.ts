import { beforeEach, describe, expect, it, vi } from "vitest";
import { QUESTIONS } from "../data/questionnaire";
import { createAssessmentResult } from "../domain/scoring";

const storageMocks = vi.hoisted(() => ({
  events: [] as string[],
  createContainerAt: vi.fn(),
  getResourceInfo: vi.fn(),
  getSolidDataset: vi.fn(),
  overwriteFile: vi.fn(),
  saveSolidDatasetAt: vi.fn(),
  setOwnerOnlyResourceAccess: vi.fn(),
}));

vi.mock("@inrupt/solid-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@inrupt/solid-client")>();
  return {
    ...actual,
    createContainerAt: storageMocks.createContainerAt,
    getResourceInfo: storageMocks.getResourceInfo,
    getSolidDataset: storageMocks.getSolidDataset,
    overwriteFile: storageMocks.overwriteFile,
    saveSolidDatasetAt: storageMocks.saveSolidDatasetAt,
  };
});

vi.mock("./ownerAcl", () => ({
  setOwnerOnlyResourceAccess: storageMocks.setOwnerOnlyResourceAccess,
}));

import {
  AssessmentValidationError,
  loadLatestAssessment,
  saveAssessment,
  saveOnboarding,
  storageUrls,
} from "./storage";

const podRoot = "https://pod.example/alice/";
const ownerWebId = "https://pod.example/alice/profile/card#me";
const urls = storageUrls(podRoot);
const answers = Object.fromEntries(
  QUESTIONS.map((question) => [question.id, question.options[0].id])
);
const result = createAssessmentResult({
  answers,
  webId: ownerWebId,
  id: "assessment-order",
  completedAt: "2026-08-28T12:30:00.000Z",
});

const event = (kind: string, url: string) => `${kind}:${url}`;

describe("private Pod write ordering", () => {
  beforeEach(() => {
    storageMocks.events.length = 0;
    storageMocks.createContainerAt.mockReset();
    storageMocks.getResourceInfo.mockReset();
    storageMocks.getSolidDataset.mockReset();
    storageMocks.overwriteFile.mockReset();
    storageMocks.saveSolidDatasetAt.mockReset();
    storageMocks.setOwnerOnlyResourceAccess.mockReset();

    storageMocks.getResourceInfo.mockImplementation(async (url: string) => {
      storageMocks.events.push(event("info", url));
      return {};
    });
    storageMocks.createContainerAt.mockImplementation(async (url: string) => {
      storageMocks.events.push(event("create-container", url));
      return {};
    });
    storageMocks.setOwnerOnlyResourceAccess.mockImplementation(
      async (url: string, _webId: string, _fetcher: typeof fetch, options = {}) => {
        storageMocks.events.push(
          event("acl", `${url}${"includeDefault" in options ? "?default" : ""}`)
        );
      }
    );
    storageMocks.saveSolidDatasetAt.mockImplementation(async (url: string) => {
      storageMocks.events.push(event("save", url));
      return {};
    });
    storageMocks.overwriteFile.mockImplementation(async (url: string) => {
      storageMocks.events.push(event("overwrite", url));
      return {};
    });
  });

  it("hardens existing assessment resources immediately before and after each write", async () => {
    await saveAssessment(podRoot, result, vi.fn() as unknown as typeof fetch);

    for (const url of [urls.assessment(result.id), urls.latest]) {
      const saveIndex = storageMocks.events.indexOf(event("save", url));
      expect(saveIndex).toBeGreaterThan(0);
      expect(storageMocks.events[saveIndex - 1]).toBe(event("acl", url));
      expect(storageMocks.events[saveIndex + 1]).toBe(event("acl", url));
    }
    expect(storageMocks.events.indexOf(event("acl", `${urls.app}?default`))).toBeLessThan(
      storageMocks.events.indexOf(event("save", urls.assessment(result.id)))
    );
    expect(
      storageMocks.events.indexOf(event("acl", `${urls.assessments}?default`))
    ).toBeLessThan(storageMocks.events.indexOf(event("save", urls.assessment(result.id))));
    expect(storageMocks.createContainerAt).not.toHaveBeenCalled();
  });

  it("establishes owner-only container defaults before creating new child resources", async () => {
    storageMocks.getResourceInfo.mockImplementation(async (url: string) => {
      storageMocks.events.push(event("info", url));
      throw Object.assign(new Error("missing"), { statusCode: 404 });
    });

    await saveAssessment(podRoot, result, vi.fn() as unknown as typeof fetch);

    const firstSave = storageMocks.events.indexOf(
      event("save", urls.assessment(result.id))
    );
    expect(storageMocks.events.indexOf(event("create-container", urls.app))).toBeLessThan(
      firstSave
    );
    expect(storageMocks.events.indexOf(event("acl", `${urls.app}?default`))).toBeLessThan(
      firstSave
    );
    expect(
      storageMocks.events.indexOf(event("acl", `${urls.assessments}?default`))
    ).toBeLessThan(firstSave);
    expect(storageMocks.events[firstSave + 1]).toBe(
      event("acl", urls.assessment(result.id))
    );
  });

  it("hardens an existing onboarding document immediately before and after overwrite", async () => {
    await saveOnboarding(
      podRoot,
      {
        schemaVersion: 1,
        app: "solid-health-questionnaire",
        privateStorageAcceptedAt: "2026-08-28T12:30:00.000Z",
        selfAssessmentAcceptedAt: "2026-08-28T12:30:00.000Z",
        appSpecificAcceptedAt: "2026-08-28T12:30:00.000Z",
      },
      ownerWebId,
      vi.fn() as unknown as typeof fetch
    );

    const writeIndex = storageMocks.events.indexOf(event("overwrite", urls.onboarding));
    expect(writeIndex).toBeGreaterThan(0);
    expect(storageMocks.events[writeIndex - 1]).toBe(event("acl", urls.onboarding));
    expect(storageMocks.events[writeIndex + 1]).toBe(event("acl", urls.onboarding));
  });
});

describe("latest assessment error classification", () => {
  beforeEach(() => {
    storageMocks.getSolidDataset.mockReset();
  });

  it("keeps Pod network errors distinct from RDF validation failures", async () => {
    const networkError = new TypeError("network unavailable");
    storageMocks.getSolidDataset.mockRejectedValue(networkError);

    await expect(
      loadLatestAssessment(podRoot, vi.fn() as unknown as typeof fetch, ownerWebId)
    ).rejects.toBe(networkError);
    await expect(
      loadLatestAssessment(podRoot, vi.fn() as unknown as typeof fetch, ownerWebId)
    ).rejects.not.toBeInstanceOf(AssessmentValidationError);
  });

  it("still treats a missing latest resource as an empty history", async () => {
    storageMocks.getSolidDataset.mockRejectedValue(
      Object.assign(new Error("missing"), { statusCode: 404 })
    );
    await expect(
      loadLatestAssessment(podRoot, vi.fn() as unknown as typeof fetch, ownerWebId)
    ).resolves.toBeNull();
  });
});
