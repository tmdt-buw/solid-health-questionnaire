import {
  createAcl,
  getAgentDefaultAccessAll,
  getAgentResourceAccessAll,
  getGroupDefaultAccessAll,
  getGroupResourceAccessAll,
  getPublicDefaultAccess,
  getPublicResourceAccess,
  getResourceAcl,
  getResourceInfoWithAcl,
  getSourceUrl,
  getThingAll,
  getUrlAll,
  hasAccessibleAcl,
  hasResourceAcl,
  solidDatasetAsTurtle,
  setPublicResourceAccess,
  setAgentResourceAccess,
  setAgentDefaultAccess,
  type Access,
  type AclDataset,
} from "@inrupt/solid-client";

type SolidFetch = typeof fetch;
type ResourceWithAcl = Awaited<ReturnType<typeof getResourceInfoWithAcl>>;

const ACL = "http://www.w3.org/ns/auth/acl#";
const FOAF_AGENT = "http://xmlns.com/foaf/0.1/Agent";
const OWNER_ACCESS = { read: true, append: false, write: true, control: true } as const;
const ACL_VERIFICATION_DELAYS_MS = [0, 50, 150] as const;

type ValidatedAclContext = {
  resourceUrl: string;
  aclUrl: string;
  hadResourceAcl: boolean;
};

const noStoreFetch = (fetcher: SolidFetch): SolidFetch =>
  ((input: RequestInfo | URL, init: RequestInit = {}) => {
    const requestHeaders =
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined;
    const headers = new Headers(requestHeaders);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    headers.set("Cache-Control", "no-cache");
    headers.set("Pragma", "no-cache");
    return fetcher(input, {
      ...init,
      cache: "no-store",
      redirect: "error",
      headers,
    });
  }) as SolidFetch;

const validWebId = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
};

const wait = (delayMs: number) =>
  delayMs === 0
    ? Promise.resolve()
    : new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs));

function parseProtectedUrl(value: string, label: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} ist ungültig.`);
  }
  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:") ||
    parsed.username ||
    parsed.password ||
    parsed.hash
  ) {
    throw new Error(`${label} ist unzulässig.`);
  }
  return parsed;
}

function validateAclContext(
  resource: ResourceWithAcl,
  requestedResourceUrl: string,
  expectedAclUrl?: string
): ValidatedAclContext {
  const requestedUrl = parseProtectedUrl(requestedResourceUrl, "Die Resource-URL");
  const sourceUrl = parseProtectedUrl(getSourceUrl(resource), "Die Resource-Source");
  if (sourceUrl.href !== requestedUrl.href) {
    throw new Error("Die geladene Resource-Source entspricht nicht der angefragten Resource.");
  }

  const advertisedAclUrl = resource.internal_resourceInfo.aclUrl;
  if (!advertisedAclUrl) {
    throw new Error("Die Resource-ACL ist nicht mit Control-Zugriff erreichbar.");
  }
  const parsedAclUrl = parseProtectedUrl(advertisedAclUrl, "Die Resource-ACL-URL");
  const linkedAclUrls = resource.internal_resourceInfo.linkedResources?.acl || [];
  if (
    parsedAclUrl.origin !== requestedUrl.origin ||
    parsedAclUrl.href === requestedUrl.href ||
    linkedAclUrls.length !== 1 ||
    parseProtectedUrl(linkedAclUrls[0], "Der Link rel=acl").href !== parsedAclUrl.href ||
    (expectedAclUrl !== undefined && parsedAclUrl.href !== expectedAclUrl)
  ) {
    throw new Error("Die Resource-ACL verweist auf ein unzulässiges oder verändertes Ziel.");
  }

  const explicitAcl = resource.internal_acl.resourceAcl;
  if (explicitAcl !== null) {
    const internalAclSource = parseProtectedUrl(
      getSourceUrl(explicitAcl),
      "Die interne Resource-ACL-Source"
    );
    if (
      internalAclSource.href !== parsedAclUrl.href ||
      explicitAcl.internal_accessTo !== requestedUrl.href
    ) {
      throw new Error("Die interne Resource-ACL stimmt nicht mit Resource und Link rel=acl überein.");
    }
  }

  return {
    resourceUrl: requestedUrl.href,
    aclUrl: parsedAclUrl.href,
    hadResourceAcl: explicitAcl !== null,
  };
}

/**
 * Replace the complete ACL document with one PUT.
 *
 * `saveAclFor` treats an ACL created with `createAcl(resource)` as an update of
 * the existing ACL and therefore sends a SPARQL PATCH. Because the new ACL was
 * deliberately built from an empty dataset, that PATCH only inserts the owner
 * rule; it cannot delete Worker, public, authenticated-agent or default rules
 * that already exist on the server. A PUT is required for owner-only hardening.
 */
async function aclWriteCondition(
  context: ValidatedAclContext,
  fetcher: SolidFetch
): Promise<Record<string, string>> {
  const response = await fetcher(context.aclUrl, {
    method: "HEAD",
    headers: { Accept: "text/turtle" },
  });
  if (response.url && response.url !== context.aclUrl) {
    throw new Error("Die ACL-Prüfung antwortete für ein anderes Ziel.");
  }
  if (response.status === 404) {
    if (context.hadResourceAcl) {
      throw new Error("Die zuvor geladene Resource-ACL ist nicht mehr vorhanden (404).");
    }
    return { "If-None-Match": "*" };
  }
  if (response.status === 405 || response.status === 501) {
    // The Inrupt resource metadata does not expose the ACL response ETag. If
    // HEAD is unsupported, no trustworthy If-Match value exists; the strict
    // post-write read below remains mandatory and detects a divergent ACL.
    return {};
  }
  if (!response.ok) {
    throw new Error(`Die Resource-ACL konnte nicht geprüft werden (${response.status}).`);
  }

  const etag = response.headers.get("ETag")?.trim();
  if (
    etag &&
    !etag.toUpperCase().startsWith("W/") &&
    etag.startsWith('"') &&
    etag.endsWith('"') &&
    !/[\r\n]/.test(etag)
  ) {
    return { "If-Match": etag };
  }
  // Missing and weak ETags cannot safely be used with If-Match. The final
  // strict read is therefore the concurrency backstop on such servers.
  return {};
}

async function replaceAclFor(
  context: ValidatedAclContext,
  acl: AclDataset,
  fetcher: SolidFetch
): Promise<void> {
  const writeCondition = await aclWriteCondition(context, fetcher);
  const body = await solidDatasetAsTurtle(acl);
  const response = await fetcher(context.aclUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/turtle", ...writeCondition },
    body,
  });
  if (response.url && response.url !== context.aclUrl) {
    throw new Error("Das ACL-PUT antwortete für ein anderes Ziel.");
  }
  if (!response.ok) {
    throw new Error(
      `Die Resource-ACL konnte nicht vollständig ersetzt werden (${response.status}).`
    );
  }
}

async function verifyResourceAcl(
  context: ValidatedAclContext,
  ownerWebId: string,
  fetcher: SolidFetch,
  assertion: (acl: AclDataset, ownerWebId: string) => void
): Promise<void> {
  let lastError: unknown;
  for (const delayMs of ACL_VERIFICATION_DELAYS_MS) {
    await wait(delayMs);
    const verifiedResource = await getResourceInfoWithAcl(context.resourceUrl, { fetch: fetcher });
    validateAclContext(verifiedResource, context.resourceUrl, context.aclUrl);
    if (!hasResourceAcl(verifiedResource)) {
      lastError = new Error("Die explizite Resource-ACL konnte nicht angelegt werden.");
      continue;
    }
    try {
      assertion(getResourceAcl(verifiedResource), ownerWebId);
      return;
    } catch (error) {
      // Only a successfully re-read but still stale/dirty ACL is retried.
      // Fetch, redirect, source and ACL-target failures above propagate at once.
      lastError = error;
    }
  }
  throw lastError;
}

/**
 * Build a new resource ACL from an empty ACL, never from inherited or existing rules.
 * This is what prevents stale Agent, Group, authenticated-user or origin grants from surviving.
 */
export function createOwnerOnlyAcl(
  resource: ResourceWithAcl,
  ownerWebId: string,
  { includeDefault = false }: { includeDefault?: boolean } = {}
): AclDataset {
  if (!validWebId(ownerWebId)) throw new Error("Die Owner-WebID ist ungültig.");
  if (!hasAccessibleAcl(resource)) {
    throw new Error("Die Resource-ACL ist nicht mit Control-Zugriff erreichbar.");
  }
  const resourceAcl = setAgentResourceAccess(createAcl(resource), ownerWebId, OWNER_ACCESS);
  return includeDefault
    ? setAgentDefaultAccess(resourceAcl, ownerWebId, OWNER_ACCESS)
    : resourceAcl;
}

export function createOwnerPublicReadAcl(
  resource: ResourceWithAcl,
  ownerWebId: string
): AclDataset {
  return setPublicResourceAccess(createOwnerOnlyAcl(resource, ownerWebId), {
    read: true,
    append: false,
    write: false,
    control: false,
  });
}

const hasAnyAccess = (access: Access) =>
  access.read || access.append || access.write || access.control;

const hasOwnerControl = (access: Access | undefined) =>
  Boolean(access?.read && access.write && access.control);

export function assertOwnerOnlyAcl(
  acl: AclDataset,
  ownerWebId: string,
  { includeDefault = false }: { includeDefault?: boolean } = {}
): void {
  const agents = getAgentResourceAccessAll(acl);
  const agentWebIds = Object.keys(agents);
  const ownerAccess = agents[ownerWebId];
  if (
    agentWebIds.length !== 1 ||
    agentWebIds[0] !== ownerWebId ||
    !hasOwnerControl(ownerAccess)
  ) {
    throw new Error("Die Resource-ACL ist nicht ausschließlich für den Owner freigegeben.");
  }

  if (Object.keys(getGroupResourceAccessAll(acl)).length > 0) {
    throw new Error("Die Resource-ACL enthält weiterhin Gruppenrechte.");
  }
  const publicAccess = getPublicResourceAccess(acl);
  if (hasAnyAccess(publicAccess)) {
    throw new Error("Die Resource-ACL enthält weiterhin öffentliche Rechte.");
  }

  const defaultAgents = getAgentDefaultAccessAll(acl);
  const defaultAgentWebIds = Object.keys(defaultAgents);
  if (
    includeDefault
      ? defaultAgentWebIds.length !== 1 ||
        defaultAgentWebIds[0] !== ownerWebId ||
        !hasOwnerControl(defaultAgents[ownerWebId])
      : defaultAgentWebIds.length !== 0
  ) {
    throw new Error("Die Resource-ACL enthält unerwartete Default-Agent-Rechte.");
  }
  if (
    Object.keys(getGroupDefaultAccessAll(acl)).length > 0 ||
    hasAnyAccess(getPublicDefaultAccess(acl))
  ) {
    throw new Error("Die Resource-ACL enthält fremde Default-Rechte.");
  }

  for (const rule of getThingAll(acl)) {
    const foreignAgents = getUrlAll(rule, `${ACL}agent`).filter((agent) => agent !== ownerWebId);
    if (
      foreignAgents.length ||
      getUrlAll(rule, `${ACL}agentGroup`).length ||
      getUrlAll(rule, `${ACL}agentClass`).length ||
      getUrlAll(rule, `${ACL}origin`).length ||
      (!includeDefault &&
        (getUrlAll(rule, `${ACL}default`).length ||
          getUrlAll(rule, `${ACL}defaultForNew`).length))
    ) {
      throw new Error("Die Resource-ACL enthält eine fremde oder geerbte Freigaberegel.");
    }
  }
}

export function assertOwnerPublicReadAcl(acl: AclDataset, ownerWebId: string): void {
  const agents = getAgentResourceAccessAll(acl);
  const agentWebIds = Object.keys(agents);
  if (
    agentWebIds.length !== 1 ||
    agentWebIds[0] !== ownerWebId ||
    !hasOwnerControl(agents[ownerWebId])
  ) {
    throw new Error("Die Marker-ACL enthält nicht ausschließlich Owner-Vollrechte.");
  }
  if (Object.keys(getGroupResourceAccessAll(acl)).length > 0) {
    throw new Error("Die Marker-ACL enthält Gruppenrechte.");
  }
  const publicAccess = getPublicResourceAccess(acl);
  if (
    !publicAccess.read ||
    publicAccess.append ||
    publicAccess.write ||
    publicAccess.control
  ) {
    throw new Error("Die Marker-ACL enthält nicht ausschließlich öffentlichen Lesezugriff.");
  }
  if (
    Object.keys(getAgentDefaultAccessAll(acl)).length > 0 ||
    Object.keys(getGroupDefaultAccessAll(acl)).length > 0 ||
    hasAnyAccess(getPublicDefaultAccess(acl))
  ) {
    throw new Error("Die Marker-ACL enthält unerwartete Default-Rechte.");
  }

  for (const rule of getThingAll(acl)) {
    const foreignAgents = getUrlAll(rule, `${ACL}agent`).filter((agent) => agent !== ownerWebId);
    const agentClasses = getUrlAll(rule, `${ACL}agentClass`);
    if (
      foreignAgents.length ||
      getUrlAll(rule, `${ACL}agentGroup`).length ||
      agentClasses.some((agentClass) => agentClass !== FOAF_AGENT) ||
      getUrlAll(rule, `${ACL}origin`).length ||
      getUrlAll(rule, `${ACL}default`).length ||
      getUrlAll(rule, `${ACL}defaultForNew`).length
    ) {
      throw new Error("Die Marker-ACL enthält eine fremde Freigaberegel.");
    }
  }
}

export async function setOwnerOnlyResourceAccess(
  resourceUrl: string,
  ownerWebId: string,
  fetcher: SolidFetch,
  options: { includeDefault?: boolean } = {}
): Promise<void> {
  const freshFetch = noStoreFetch(fetcher);
  const resource = await getResourceInfoWithAcl(resourceUrl, { fetch: freshFetch });
  const context = validateAclContext(resource, resourceUrl);
  if (!hasAccessibleAcl(resource)) {
    throw new Error("Die Resource-ACL ist nicht mit Control-Zugriff erreichbar.");
  }
  const ownerOnlyAcl = createOwnerOnlyAcl(resource, ownerWebId, options);
  assertOwnerOnlyAcl(ownerOnlyAcl, ownerWebId, options);
  await replaceAclFor(context, ownerOnlyAcl, freshFetch);
  await verifyResourceAcl(context, ownerWebId, freshFetch, (acl, verifiedOwnerWebId) =>
    assertOwnerOnlyAcl(acl, verifiedOwnerWebId, options)
  );
}

export async function setOwnerPublicReadResourceAccess(
  resourceUrl: string,
  ownerWebId: string,
  fetcher: SolidFetch
): Promise<void> {
  const freshFetch = noStoreFetch(fetcher);
  const resource = await getResourceInfoWithAcl(resourceUrl, { fetch: freshFetch });
  const context = validateAclContext(resource, resourceUrl);
  if (!hasAccessibleAcl(resource)) {
    throw new Error("Die Marker-ACL ist nicht mit Control-Zugriff erreichbar.");
  }
  const markerAcl = createOwnerPublicReadAcl(resource, ownerWebId);
  assertOwnerPublicReadAcl(markerAcl, ownerWebId);
  await replaceAclFor(context, markerAcl, freshFetch);
  await verifyResourceAcl(context, ownerWebId, freshFetch, assertOwnerPublicReadAcl);
}
