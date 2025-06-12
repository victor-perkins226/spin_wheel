// generate-translations.js
// ------------------------
// Bulk-translate your JSON via @vitalets/google-translate-api (no key needed).

const fs       = require("fs-extra");
const path     = require("path");
const raw      = require("@vitalets/google-translate-api");
// Pick the real translate() function out of the module:
const translate = typeof raw === "function"
  ? raw
  : (raw.default || raw.translate);

const SOURCE_FILE = path.join(
  __dirname,
  "public",
  "locales",
  "en",
  "common.json"
);
// If you want your new files under public/locales/<lang>/common.json:
const OUTPUT_BASE = path.join(__dirname, "public", "locales");

const LANGUAGE_CODES = [
  "bn","fr",
];
// "de","hi","it",
//   "ja","jv","ko","mr","pt","ru",
//   "es","sw","ta","te","tr","ur"

async function translateDeep(obj, target) {
  if (typeof obj === "string") {
    const res = await translate(obj, { to: target });
    return res.text;
  }
  if (Array.isArray(obj)) {
    return Promise.all(obj.map(item => translateDeep(item, target)));
  }
  if (obj && typeof obj === "object") {
    const copy = {};
    for (const [k, v] of Object.entries(obj)) {
      copy[k] = await translateDeep(v, target);
    }
    return copy;
  }
  return obj; // numbers, booleans, null, etc.
}

async function main() {
  // 1) load your English JSON
  const sourceJson = await fs.readJson(SOURCE_FILE);

  // 2) ensure the output base dir exists
  await fs.ensureDir(OUTPUT_BASE);

  // 3) translate each language
  for (const code of LANGUAGE_CODES) {
    console.log(`Translating to ${code}…`);
    const translated = await translateDeep(sourceJson, code);

    // write to public/locales/<code>/common.json
    const outDir = path.join(OUTPUT_BASE, code);
    await fs.ensureDir(outDir);
    await fs.writeJson(
      path.join(outDir, "common.json"),
      translated,
      { spaces: 2 }
    );
  }

  console.log("✅ All done! Check public/locales/<lang>/common.json");
}

main().catch(err => {
  console.error("Translation script error:", err);
  process.exit(1);
});
