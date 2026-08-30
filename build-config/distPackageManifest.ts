import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

type SourcePackage = {
  name: string;
  version: string;
  license: string;
  repository?: {
    type: string;
    url: string;
  };
  publishConfig?: Record<string, string>;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
};

export function createDistPackageManifest(source: SourcePackage): string {
  const manifest = {
    name: source.name,
    version: source.version,
    license: source.license,
    type: "module",
    main: "./index.cjs",
    module: "./index.js",
    types: "./embed/index.d.ts",
    exports: {
      "./embed": {
        types: "./embed/index.d.ts",
        import: "./index.js",
        require: "./index.cjs",
      },
      "./embed.css": "./embed.css",
    },
    sideEffects: ["**/*.css"],
    repository: source.repository,
    publishConfig: source.publishConfig,
    peerDependencies: source.peerDependencies,
    dependencies: Object.fromEntries(
      Object.entries(source.dependencies).filter(
        ([name]) => name === "@inrupt/solid-client"
      )
    ),
  };

  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function distPackageManifestPlugin(source: SourcePackage): Plugin {
  return {
    name: "solid-health-questionnaire-dist-package-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "package.json",
        source: createDistPackageManifest(source),
      });
      for (const fileName of ["README.md", "LICENSE", "NOTICE"]) {
        this.emitFile({
          type: "asset",
          fileName,
          source: readFileSync(resolve(process.cwd(), fileName), "utf8"),
        });
      }
    },
  };
}
