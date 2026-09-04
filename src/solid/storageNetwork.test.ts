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
  buildAssessmentDataset,
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

const readBlobText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(blob);
  });

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

  it("creates immutable history and overwrites latest between owner-only ACL checks", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await saveAssessment(podRoot, result, fetcher);

    const assessmentUrl = urls.assessment(result.id);
    const assessmentSaveIndex = storageMocks.events.indexOf(
      event("save", assessmentUrl)
    );
    expect(assessmentSaveIndex).toBeGreaterThan(0);
    expect(storageMocks.events[assessmentSaveIndex - 1]).toBe(
      event("acl", assessmentUrl)
    );
    expect(storageMocks.events[assessmentSaveIndex + 1]).toBe(
      event("acl", assessmentUrl)
    );

    const latestOverwriteIndex = storageMocks.events.indexOf(
      event("overwrite", urls.latest)
    );
    expect(latestOverwriteIndex).toBeGreaterThan(assessmentSaveIndex);
    expect(storageMocks.events[latestOverwriteIndex - 1]).toBe(
      event("acl", urls.latest)
    );
    expect(storageMocks.events[latestOverwriteIndex + 1]).toBe(
      event("acl", urls.latest)
    );
    expect(storageMocks.saveSolidDatasetAt).not.toHaveBeenCalledWith(
      urls.latest,
      expect.anything(),
      expect.anything()
    );
    expect(storageMocks.overwriteFile).toHaveBeenCalledWith(
      urls.latest,
      expect.any(Blob),
      { contentType: "text/turtle", fetch: fetcher }
    );

    const latestBlob = storageMocks.overwriteFile.mock.calls.find(
      ([url]) => url === urls.latest
    )?.[1] as Blob;
    expect(latestBlob.type).toBe("text/turtle");
    expect(await readBlobText(latestBlob)).toContain(result.id);

    expect(storageMocks.events.indexOf(event("acl", `${urls.app}?default`))).toBeLessThan(
      assessmentSaveIndex
    );
    expect(
      storageMocks.events.indexOf(event("acl", `${urls.assessments}?default`))
    ).toBeLessThan(assessmentSaveIndex);
    expect(storageMocks.createContainerAt).not.toHaveBeenCalled();
  });

  it("overwrites the same latest URL for subsequent assessments", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const nextResult = createAssessmentResult({
      answers,
      webId: ownerWebId,
      id: "assessment-order-2",
      completedAt: "2026-08-28T13:30:00.000Z",
    });

    await saveAssessment(podRoot, result, fetcher);
    await saveAssessment(podRoot, nextResult, fetcher);

    expect(storageMocks.saveSolidDatasetAt).toHaveBeenCalledTimes(2);
    expect(storageMocks.saveSolidDatasetAt.mock.calls.map(([url]) => url)).toEqual([
      urls.assessment(result.id),
      urls.assessment(nextResult.id),
    ]);
    expect(storageMocks.overwriteFile).toHaveBeenCalledTimes(2);
    expect(storageMocks.overwriteFile.mock.calls.map(([url]) => url)).toEqual([
      urls.latest,
      urls.latest,
    ]);

    const latestBlob = storageMocks.overwriteFile.mock.calls[1][1] as Blob;
    expect(await readBlobText(latestBlob)).toContain(nextResult.id);
  });

  it("reaches latest on retry when the same immutable history already exists", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const assessmentUrl = urls.assessment(result.id);
    storageMocks.saveSolidDatasetAt.mockImplementationOnce(async (url: string) => {
      storageMocks.events.push(event("save", url));
      throw Object.assign(new Error("already exists"), { statusCode: 412 });
    });
    storageMocks.getSolidDataset.mockResolvedValue(
      buildAssessmentDataset(assessmentUrl, result)
    );

    await saveAssessment(podRoot, result, fetcher);

    expect(storageMocks.getSolidDataset).toHaveBeenCalledWith(assessmentUrl, {
      fetch: fetcher,
    });
    expect(storageMocks.overwriteFile).toHaveBeenCalledWith(
      urls.latest,
      expect.any(Blob),
      { contentType: "text/turtle", fetch: fetcher }
    );
  });

  it("never overwrites immutable history when its identifier has different data", async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const assessmentUrl = urls.assessment(result.id);
    const conflictingResult = createAssessmentResult({
      answers,
      webId: ownerWebId,
      id: "different-assessment",
      completedAt: result.completedAt,
    });
    storageMocks.saveSolidDatasetAt.mockRejectedValueOnce(
      Object.assign(new Error("already exists"), { statusCode: 412 })
    );
    storageMocks.getSolidDataset.mockResolvedValue(
      buildAssessmentDataset(assessmentUrl, conflictingResult)
    );

    await expect(saveAssessment(podRoot, result, fetcher)).rejects.toThrow(
      AssessmentValidationError
    );
    expect(storageMocks.overwriteFile).not.toHaveBeenCalled();
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
