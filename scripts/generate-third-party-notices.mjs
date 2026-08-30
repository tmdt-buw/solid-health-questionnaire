import {
  copyFileSync,
  existsSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, parse, resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const requireFrom = (directory) => createRequire(join(directory, "package.json"));
const bundledRoots = [
  "react",
  "react-dom",
  "@inrupt/solid-client",
  "@inrupt/solid-client-authn-browser",
];
const typeOnlyPackages = new Set(["@rdfjs/types", "undici-types"]);
const isTypeOnlyPackage = (name) =>
  name.startsWith("@types/") || typeOnlyPackages.has(name);

function packageDirectory(name, fromDirectory) {
  const resolver = requireFrom(fromDirectory);
  try {
    return dirname(resolver.resolve(`${name}/package.json`));
  } catch {
    const entry = resolver.resolve(name);
    let directory = dirname(entry);
    const root = parse(directory).root;
    while (directory !== root) {
      const manifestPath = join(directory, "package.json");
      if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
        if (manifest.name === name) return directory;
      }
      directory = dirname(directory);
    }
    throw new Error(`Unable to resolve package metadata for ${name}.`);
  }
}

const packages = new Map();
const queue = bundledRoots.map((name) => ({ name, fromDirectory: projectRoot }));

while (queue.length > 0) {
  const { name, fromDirectory } = queue.shift();
  if (isTypeOnlyPackage(name)) continue;
  let directory;
  try {
    directory = realpathSync(packageDirectory(name, fromDirectory));
  } catch (error) {
    const parent = packages.get(realpathSync(fromDirectory));
    if (parent?.optionalDependencies?.[name]) continue;
    throw error;
  }
  if (packages.has(directory)) continue;

  const manifest = JSON.parse(readFileSync(join(directory, "package.json"), "utf8"));
  const licenseFiles = readdirSync(directory)
    .filter((fileName) => /^(license|licence|copying|notice)([-._].*)?$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right));
  const sharedInruptLicense = join(
    projectRoot,
    "node_modules",
    "@inrupt",
    "solid-client",
    "LICENSE"
  );
  const usesSharedInruptLicense =
    licenseFiles.length === 0 &&
    manifest.license === "MIT" &&
    manifest.name.startsWith("@inrupt/") &&
    existsSync(sharedInruptLicense);
  if (licenseFiles.length === 0 && !usesSharedInruptLicense) {
    throw new Error(`${manifest.name}@${manifest.version} has no distributable license file.`);
  }

  packages.set(directory, {
    name: manifest.name,
    version: manifest.version,
    license: typeof manifest.license === "string" ? manifest.license : "See included text",
    dependencies: manifest.dependencies || {},
    optionalDependencies: manifest.optionalDependencies || {},
    licenseTexts: usesSharedInruptLicense
      ? [{
          fileName: "LICENSE (shared Inrupt MIT text)",
          text: readFileSync(sharedInruptLicense, "utf8").trim(),
        }]
      : licenseFiles.map((fileName) => ({
          fileName,
          text: readFileSync(join(directory, fileName), "utf8").trim(),
        })),
  });

  for (const dependencyName of Object.keys({
    ...(manifest.dependencies || {}),
    ...(manifest.optionalDependencies || {}),
  }).sort()) {
    queue.push({ name: dependencyName, fromDirectory: directory });
  }
}

const sections = [...packages.values()]
  .sort((left, right) =>
    `${left.name}@${left.version}`.localeCompare(`${right.name}@${right.version}`)
  )
  .map((entry) => {
    const texts = entry.licenseTexts
      .map(({ fileName, text }) => `--- ${fileName} ---\n${text}`)
      .join("\n\n");
    return `${entry.name}@${entry.version}\nDeclared license: ${entry.license}\n\n${texts}`;
  });

const output = [
  "Solid Health Questionnaire - Third-Party Notices",
  "",
  "Generated from the exact installed dependency graph used by the standalone bundle.",
  "The following notices and license texts belong to their respective projects.",
  "",
  ...sections.map((section) => `${"=".repeat(80)}\n${section}`),
  "",
].join("\n");

const publicDirectory = join(projectRoot, "public");
writeFileSync(join(publicDirectory, "THIRD_PARTY_NOTICES.txt"), output, "utf8");
copyFileSync(join(projectRoot, "LICENSE"), join(publicDirectory, "LICENSE.txt"));
copyFileSync(join(projectRoot, "NOTICE"), join(publicDirectory, "NOTICE.txt"));

console.log(`Wrote notices for ${packages.size} bundled packages.`);
