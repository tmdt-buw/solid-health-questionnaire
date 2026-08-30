import { describe, expect, it } from "vitest";
import sourcePackage from "../package.json";
import { createDistPackageManifest } from "./distPackageManifest";

describe("embed package manifest", () => {
  it("keeps React peer-only and exports component plus CSS", () => {
    const manifest = JSON.parse(createDistPackageManifest(sourcePackage));
    expect(manifest.exports["./embed"]).toEqual({
      types: "./embed/index.d.ts",
      import: "./index.js",
      require: "./index.cjs",
    });
    expect(manifest.exports["./embed.css"]).toBe("./embed.css");
    expect(manifest.peerDependencies.react).toContain("18");
    expect(manifest.dependencies.react).toBeUndefined();
    expect(manifest.dependencies["@inrupt/solid-client"]).toBe(
      sourcePackage.dependencies["@inrupt/solid-client"]
    );
    expect(manifest.types).toBe("./embed/index.d.ts");
    expect(manifest.repository).toEqual(sourcePackage.repository);
  });
});
