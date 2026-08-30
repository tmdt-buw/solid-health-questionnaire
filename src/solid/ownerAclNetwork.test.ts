import {
  addMockResourceAclTo,
  getResourceAcl,
  mockFileFrom,
  setAgentResourceAccess,
  setPublicResourceAccess,
} from "@inrupt/solid-client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const networkMocks = vi.hoisted(() => ({
  getResourceInfoWithAcl: vi.fn(),
}));

vi.mock("@inrupt/solid-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@inrupt/solid-client")>();
  return {
    ...actual,
    getResourceInfoWithAcl: networkMocks.getResourceInfoWithAcl,
  };
});

import { assertOwnerOnlyAcl, setOwnerOnlyResourceAccess } from "./ownerAcl";

const resourceUrl =
  "https://pod.example/alice/solid-health-questionnaire/latest.ttl";
const aclUrl = `${resourceUrl}.acl`;
const ownerWebId = "https://pod.example/alice/profile/card#me";
const workerWebId = "https://pod.example/worker/profile/card#me";
const ownerAccess = { read: true, append: false, write: true, control: true };
const publicRead = { read: true, append: false, write: false, control: false };

const resourceWithAcl = ({
  publicAccess,
  workerAccess = false,
}: {
  publicAccess: boolean;
  workerAccess?: boolean;
}) => {
  const resource = addMockResourceAclTo(mockFileFrom(resourceUrl));
  let acl = setAgentResourceAccess(getResourceAcl(resource), ownerWebId, ownerAccess);
  if (workerAccess) acl = setAgentResourceAccess(acl, workerWebId, publicRead);
  if (publicAccess) acl = setPublicResourceAccess(acl, publicRead);
  const normalizedAcl = {
    ...acl,
    internal_resourceInfo: { ...acl.internal_resourceInfo, sourceIri: aclUrl },
  };
  return {
    ...resource,
    internal_resourceInfo: {
      ...resource.internal_resourceInfo,
      aclUrl,
      linkedResources: {
        ...resource.internal_resourceInfo.linkedResources,
        acl: [aclUrl],
      },
    },
    internal_acl: { ...resource.internal_acl, resourceAcl: normalizedAcl },
  };
};

const withAclTarget = (
  resource: ReturnType<typeof resourceWithAcl>,
  targetAclUrl: string
) => {
  const existingAcl = getResourceAcl(resource);
  return {
    ...resource,
    internal_resourceInfo: {
      ...resource.internal_resourceInfo,
      aclUrl: targetAclUrl,
      linkedResources: {
        ...resource.internal_resourceInfo.linkedResources,
        acl: [targetAclUrl],
      },
    },
    internal_acl: {
      ...resource.internal_acl,
      resourceAcl: {
        ...existingAcl,
        internal_resourceInfo: {
          ...existingAcl.internal_resourceInfo,
          sourceIri: targetAclUrl,
        },
      },
    },
  };
};

describe("owner-only ACL persistence", () => {
  beforeEach(() => {
    networkMocks.getResourceInfoWithAcl.mockReset();
  });

  it("replaces stale Worker/public rules with one conditional PUT and verifies the result", async () => {
    const dirtyResource = resourceWithAcl({ publicAccess: true, workerAccess: true });
    const ownerOnlyResource = resourceWithAcl({ publicAccess: false });
    let readCount = 0;
    networkMocks.getResourceInfoWithAcl.mockImplementation(async (_url, options) => {
      await options.fetch(resourceUrl, {
        method: "GET",
        headers: { Accept: "text/turtle" },
      });
      readCount += 1;
      return readCount === 1 ? dirtyResource : ownerOnlyResource;
    });
    const authenticatedFetch = vi.fn<typeof fetch>(async (_input, init) =>
      new Response(null, {
        status: 200,
        headers: init?.method === "HEAD" ? { ETag: '"acl-v1"' } : undefined,
      })
    );

    expect(() => assertOwnerOnlyAcl(getResourceAcl(dirtyResource), ownerWebId)).toThrow();
    await expect(
      setOwnerOnlyResourceAccess(resourceUrl, ownerWebId, authenticatedFetch)
    ).resolves.toBeUndefined();

    const putCalls = authenticatedFetch.mock.calls.filter(
      ([input, init]) => input.toString() === aclUrl && init?.method === "PUT"
    );
    expect(putCalls).toHaveLength(1);
    const [, putInit] = putCalls[0];
    const putHeaders = new Headers(putInit?.headers);
    expect(putInit?.redirect).toBe("error");
    expect(putHeaders.get("Content-Type")).toBe("text/turtle");
    expect(putHeaders.get("If-Match")).toBe('"acl-v1"');
    expect(putInit?.body).toContain(ownerWebId);
    expect(putInit?.body).not.toContain(workerWebId);
    expect(putInit?.body).not.toContain("http://xmlns.com/foaf/0.1/Agent");

    for (const [, init] of authenticatedFetch.mock.calls) {
      const headers = new Headers(init?.headers);
      expect(init?.cache).toBe("no-store");
      expect(init?.redirect).toBe("error");
      expect(headers.get("Cache-Control")).toBe("no-cache");
      expect(headers.get("Pragma")).toBe("no-cache");
    }
  });

  it("refuses a cross-origin Link rel=acl target before sending authenticated traffic", async () => {
    const foreignTarget = withAclTarget(
      resourceWithAcl({ publicAccess: true, workerAccess: true }),
      "https://attacker.example/captured-acl"
    );
    networkMocks.getResourceInfoWithAcl.mockResolvedValue(foreignTarget);
    const authenticatedFetch = vi.fn<typeof fetch>();

    await expect(
      setOwnerOnlyResourceAccess(resourceUrl, ownerWebId, authenticatedFetch)
    ).rejects.toThrow(/unzul.*ssiges oder ver.*ndertes Ziel/);
    expect(authenticatedFetch).not.toHaveBeenCalled();
  });

  it("does not overwrite an explicit ACL that disappeared after it was read", async () => {
    networkMocks.getResourceInfoWithAcl.mockResolvedValue(
      resourceWithAcl({ publicAccess: true, workerAccess: true })
    );
    const authenticatedFetch = vi.fn<typeof fetch>(async (_input, init) =>
      new Response(null, { status: init?.method === "HEAD" ? 404 : 200 })
    );

    await expect(
      setOwnerOnlyResourceAccess(resourceUrl, ownerWebId, authenticatedFetch)
    ).rejects.toThrow(/nicht mehr vorhanden \(404\)/);
    expect(
      authenticatedFetch.mock.calls.filter(([, init]) => init?.method === "PUT")
    ).toHaveLength(0);
  });
});
