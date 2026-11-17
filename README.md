# Health Questionnaire

Health Questionnaire is a private-by-design self-assessment for the Solid Dataspace. It guides a user through 18 questions across movement, nutrition, mental health, sleep and social environment, calculates category and overall scores, and stores every completed assessment in that user's personal Solid Pod.

The application is an orientation tool, not a medical diagnosis. It does not replace medical advice. In an emergency in Germany, call `112`.

## Variants

The project deliberately produces two variants from one codebase:

- Standalone app at `/solid-health-questionnaire/` with its own Solid-OIDC provider selection, redirect handling, header and footer.
- React embed package `@hoelk-f/solid-health-questionnaire/embed` for the Solid Dataspace Manager. The host passes its already authenticated `webId`, language and structural session object. The embed has no second login and no duplicate application chrome.

```tsx
import {
  SolidHealthQuestionnaireEmbed,
  healthQuestionnaireVersion,
} from "@hoelk-f/solid-health-questionnaire/embed";
import "@hoelk-f/solid-health-questionnaire/embed.css";

<SolidHealthQuestionnaireEmbed
  webId={webId}
  language={language}
  session={session}
/>;
```

The host session only needs this structural contract, which avoids coupling the host and package to the same authentication SDK instance:

```ts
type HealthQuestionnaireSession = {
  info: { isLoggedIn: boolean; webId: string | null };
  fetch: typeof globalThis.fetch;
};
```

The `webId` prop is only an assertion and must exactly match the authenticated
host session. It is never accepted as an identity on its own.
The embed build does not import or initialize the standalone OIDC client; only
the host-provided authenticated fetch is used.

## Pod data

There is no guest or browser-local fallback for answers or results. An authenticated WebID, a resolvable Pod and the authenticated session's `fetch` are mandatory.

After explicit app onboarding, the application provisions and hardens this WAC-protected private subtree:

```text
{podRoot}solid-health-questionnaire/
├── onboarding.json
├── latest.ttl
└── assessments/
    └── {assessmentId}.ttl
```

Every container gets an explicit owner-only resource ACL and owner-only default ACL. Every result and onboarding resource gets an owner-only resource ACL. Existing known resources are hardened before they are overwritten and verified again after writing. Existing public, group, agent, origin and default rules are replaced and the resulting ACL is read back and verified. The target deployment follows the Community Solid Server/WebACL setup already used by City Tours; ACP is not treated as interchangeable.

Each immutable assessment contains:

- explicit application, Question, Answer and Rating RDF types;
- WebID creator, UUID and UTC completion time;
- questionnaire version;
- all question and option IDs;
- German and English prompt/answer snapshots;
- awarded and maximum points per answer;
- five category scores, percentages and traffic-light states;
- overall score, maximum and percentage.

The RDF model reuses schema.org and Dublin Core and adds application-specific terms below the version-controlled vocabulary URL `https://raw.githubusercontent.com/hoelk-f/solid-health-questionnaire/main/public/vocab.ttl#`. A vocabulary and SHACL shape are shipped in `public/vocab.ttl` and `public/shapes.ttl`. Loaded RDF is treated as untrusted network input: version, answers, per-answer points, category totals, traffic lights and overall score are recomputed and must match exactly before display.

## Scoring

The supplied Excel formulas are represented as versioned data in `src/data/questionnaire.ts` and verified by tests.

| Category | Questions | Maximum |
| --- | ---: | ---: |
| Bewegung | 3 | 9 |
| Ernährung | 8 | 24 |
| Mentale Gesundheit | 3 | 9 |
| Schlaf | 2 | 6 |
| Soziales Umfeld | 2 | 6 |
| **Total** | **18** | **54** |

Until domain owners provide different limits, the documented traffic-light thresholds are:

- green: `80–100%`
- amber: `50–79%`
- red: `0–49%`

Colour is never the sole status indicator; each state also has a text label.

These thresholds are a product assumption, not a clinically validated cutoff.
They require approval by the responsible health-domain owner before the app is
used for health-related interpretation.

## Complete Dataspace setup

Use the [central local guide](https://github.com/hoelk-f/solid-dataspace/blob/main/LOCAL_DEVELOPMENT.md) to run this app with the Manager and other services. Its default local mode uses the published questionnaire image. The standalone view is `/solid-health-questionnaire/`; the Manager route is `/web/solid-health-questionnaire`. Starting the application does not create a Pod account or example health records.

## Development

Requires a supported Node.js LTS release (Node.js 22 or 24).

```sh
npm install
npm test
npm run build
npm start
```

Build outputs:

- `build/`: standalone SPA
- `dist/`: ESM/CJS embed package, declarations, scoped `embed.css`, README and license notices
- `build/LICENSE.txt`, `build/NOTICE.txt` and `build/THIRD_PARTY_NOTICES.txt`: project and reproducibly generated bundled-dependency license texts for the standalone distribution

Run the standalone production container:

```sh
docker compose up --build
```

Then open `http://localhost:3007/solid-health-questionnaire/`.

## Releases

Pushes to `main` run the complete verification suite, publish the generated
embed package to GitHub Packages and publish the standalone container as both
`son1i/solid-health-questionnaire:latest` and a versioned Docker tag. The
repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` are required.
GitHub's workflow token publishes the package, so no additional package secret
is needed. If the existing cross-repository `NPM_TOKEN` is configured as well,
the workflow also requests a Solid Dataspace Manager rebuild after the package
has become available.

Release versions are maintained by the workspace-level
`versioning-update.ps1`; the workflow deliberately rejects an already published
version instead of creating an uncommitted CI-only version.

The standalone app uses Inrupt browser authentication 5.0.3 and its own prefixed session storage. It can be served under `/solid-health-questionnaire/` beside the other standalone apps on the configured Dataspace origin. The Manager embed reuses the host session. Keep the matching login/session code and reverse-proxy routing together when deploying; a separate subdomain is not required by the supported Dataspace setup. The provided nginx configuration sets CSP and other security headers.

## Content maintenance

- Questions, answers and points: `src/data/questionnaire.ts`
- Category explanations, quick wins, sources and local offers: `src/data/content.ts`
- Score thresholds: `src/domain/scoring.ts`
- RDF/Pod storage: `src/solid/storage.ts`
- WAC hardening: `src/solid/ownerAcl.ts`

Local offers and external resources are intentionally data-driven so they can later be replaced by a maintained API or project content without changing the questionnaire flow.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
