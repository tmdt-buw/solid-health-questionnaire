import {
  addMockResourceAclTo,
  createThing,
  getAgentDefaultAccessAll,
  getAgentResourceAccessAll,
  getGroupResourceAccessAll,
  getPublicResourceAccess,
  getResourceAcl,
  getThingAll,
  getUrlAll,
  mockContainerFrom,
  mockFileFrom,
  setAgentDefaultAccess,
  setAgentResourceAccess,
  setGroupResourceAccess,
  setPublicResourceAccess,
  setThing,
  setUrl,
} from "@inrupt/solid-client";
import { describe, expect, it } from "vitest";
import {
  assertOwnerOnlyAcl,
  createOwnerOnlyAcl,
} from "./ownerAcl";

const resourceUrl =
  "https://pod.example/alice/solid-health-questionnaire/latest.ttl";
const ownerWebId = "https://pod.example/alice/profile/card#me";
const foreignWebId = "https://pod.example/worker/profile/card#me";
const groupUrl = "https://pod.example/groups#health-workers";
const readOnly = { read: true, append: false, write: false, control: false };
const ACL = "http://www.w3.org/ns/auth/acl#";
const RDF_TYPE = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type";

describe("owner-only WebACL", () => {
  it("builds from an empty ACL and drops stale agent, group and public grants", () => {
    const resource = addMockResourceAclTo(mockFileFrom(resourceUrl));
    let dirtyAcl = getResourceAcl(resource);
    dirtyAcl = setAgentResourceAccess(dirtyAcl, foreignWebId, readOnly);
    dirtyAcl = setAgentDefaultAccess(dirtyAcl, foreignWebId, readOnly);
    dirtyAcl = setGroupResourceAccess(dirtyAcl, groupUrl, readOnly);
    dirtyAcl = setPublicResourceAccess(dirtyAcl, readOnly);
    expect(() => assertOwnerOnlyAcl(dirtyAcl, ownerWebId)).toThrow();

    const ownerOnlyAcl = createOwnerOnlyAcl(resource, ownerWebId);
    expect(getAgentResourceAccessAll(ownerOnlyAcl)).toEqual({
      [ownerWebId]: { read: true, append: true, write: true, control: true },
    });
    expect(getAgentDefaultAccessAll(ownerOnlyAcl)).toEqual({});
    expect(getGroupResourceAccessAll(ownerOnlyAcl)).toEqual({});
    expect(getPublicResourceAccess(ownerOnlyAcl)).toEqual({
      read: false,
      append: false,
      write: false,
      control: false,
    });
    expect(() => assertOwnerOnlyAcl(ownerOnlyAcl, ownerWebId)).not.toThrow();
  });

  it("rejects authenticated-agent and origin-restricted rules", () => {
    const resource = addMockResourceAclTo(mockFileFrom(resourceUrl));
    const ownerOnlyAcl = createOwnerOnlyAcl(resource, ownerWebId);

    let authenticatedRule = createThing({ url: `${resourceUrl}.acl#authenticated` });
    authenticatedRule = setUrl(authenticatedRule, RDF_TYPE, `${ACL}Authorization`);
    authenticatedRule = setUrl(
      authenticatedRule,
      `${ACL}agentClass`,
      `${ACL}AuthenticatedAgent`
    );
    authenticatedRule = setUrl(authenticatedRule, `${ACL}accessTo`, resourceUrl);
    authenticatedRule = setUrl(authenticatedRule, `${ACL}mode`, `${ACL}Read`);
    expect(() =>
      assertOwnerOnlyAcl(setThing(ownerOnlyAcl, authenticatedRule), ownerWebId)
    ).toThrow(/fremde oder geerbte/);

    let originRule = createThing({ url: `${resourceUrl}.acl#origin` });
    originRule = setUrl(originRule, RDF_TYPE, `${ACL}Authorization`);
    originRule = setUrl(originRule, `${ACL}agent`, ownerWebId);
    originRule = setUrl(originRule, `${ACL}origin`, "https://app.example");
    originRule = setUrl(originRule, `${ACL}accessTo`, resourceUrl);
    originRule = setUrl(originRule, `${ACL}mode`, `${ACL}Read`);
    expect(() => assertOwnerOnlyAcl(setThing(ownerOnlyAcl, originRule), ownerWebId)).toThrow(
      /fremde oder geerbte/
    );
  });

  it("sets an owner-only default on containers before child resources are created", () => {
    const container = addMockResourceAclTo(
      mockContainerFrom(
        "https://pod.example/alice/solid-health-questionnaire/assessments/"
      )
    );
    const acl = createOwnerOnlyAcl(container, ownerWebId, { includeDefault: true });

    expect(getAgentDefaultAccessAll(acl)).toEqual({
      [ownerWebId]: { read: true, append: true, write: true, control: true },
    });
    expect(() =>
      assertOwnerOnlyAcl(acl, ownerWebId, { includeDefault: true })
    ).not.toThrow();
    expect(
      getThingAll(acl).flatMap((rule) => getUrlAll(rule, `${ACL}agentClass`))
    ).toEqual([]);
  });

  it("fails closed for an invalid owner WebID", () => {
    const resource = addMockResourceAclTo(mockFileFrom(resourceUrl));
    expect(() => createOwnerOnlyAcl(resource, "not-a-webid")).toThrow(/Owner-WebID/);
  });
});
