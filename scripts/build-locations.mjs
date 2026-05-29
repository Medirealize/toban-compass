/**
 * code4fukui/localgovjp のオープンデータから
 * public/data/locations/ 配下に都道府県別市区町村JSONを生成する。
 * @see https://github.com/code4fukui/localgovjp
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sourcePath = path.join(__dirname, "source-localgovjp.json");
const outDir = path.join(root, "public", "data", "locations");

function normalizeCityName(name) {
  return name.replace(/\s+/g, "");
}

const raw = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
const byPref = new Map();

for (const row of raw) {
  const pid = String(row.pid);
  if (!byPref.has(pid)) {
    byPref.set(pid, {
      id: pid,
      name: row.pref,
      municipalities: [],
    });
  }
  byPref.get(pid).municipalities.push({
    id: row.lgcode,
    name: normalizeCityName(row.city),
    lat: parseFloat(row.lat),
    lng: parseFloat(row.lng),
  });
}

const prefectures = [...byPref.values()]
  .map(({ id, name }) => ({ id, name }))
  .sort((a, b) => Number(a.id) - Number(b.id));

for (const pref of byPref.values()) {
  pref.municipalities.sort((a, b) =>
    a.name.localeCompare(b.name, "ja", { sensitivity: "base" })
  );
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "prefectures.json"),
  JSON.stringify(prefectures)
);

let totalMunicipalities = 0;
for (const pref of byPref.values()) {
  fs.writeFileSync(
    path.join(outDir, `${pref.id}.json`),
    JSON.stringify(pref.municipalities)
  );
  totalMunicipalities += pref.municipalities.length;
}

const meta = {
  generatedAt: new Date().toISOString(),
  source: "https://github.com/code4fukui/localgovjp",
  prefectureCount: prefectures.length,
  municipalityCount: totalMunicipalities,
};

fs.writeFileSync(path.join(outDir, "meta.json"), JSON.stringify(meta, null, 2));

console.log(
  `Generated ${prefectures.length} prefectures, ${totalMunicipalities} municipalities`
);
